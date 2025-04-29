"use server";

import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL, Transaction, SystemProgram, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';
import { unstable_noStore as noStore } from 'next/cache';
import { kv } from "@vercel/kv";
import { getServerSession } from "next-auth/next";
import { parse as parseTOML } from '@iarna/toml';
import { authOptions } from './lib/auth';
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { getUserCooldownExpiry, isUserInCooldown, setUserCooldown, resetUserCooldown, getCooldownRemainingTime } from './services/airdrop/cooldown-service';

interface Repository {
  url: string;
  missing?: boolean;
}

interface TomlData {
  repo?: Repository[];
}

// In-memory fallback for KV storage when environment variables are missing
const inMemoryStore = new Map<string, number>();
const inMemoryAirdropHistory = new Array<AirdropRecord>();

// Define the structure for airdrop records
export interface AirdropRecord {
  username: string;
  walletAddress: string;
  timestamp: number;
  isAnonymous?: boolean;
}

// Define the structure for vouch records
export interface VouchRecord {
  username: string;
  vouchedBy: string;
  timestamp: number;
  voucherType: 'github' | 'upgraded';
}

// Helper function to safely use KV or fallback to in-memory storage
async function safeKvGet(key: string): Promise<string | null> {
  try {
    return await kv.get(key);
  } catch (error) {
    console.log('KV get error, using in-memory fallback:', error);
    const value = inMemoryStore.get(key);
    return value ? String(value) : null;
  }
}

// Helper function to safely set KV or fallback to in-memory storage
async function safeKvSet(key: string, value: any): Promise<void> {
  try {
    await kv.set(key, value);
  } catch (error) {
    console.log('KV set error, using in-memory fallback:', error);
    inMemoryStore.set(key, value);
  }
}

// Function to store airdrop record
async function storeAirdropRecord(record: AirdropRecord): Promise<void> {
  try {
    // Get existing records
    let history: AirdropRecord[] = [];
    try {
      const existingHistory = await kv.get('airdrop_history') as AirdropRecord[] | null;
      if (existingHistory) {
        history = existingHistory;
      }
    } catch (error) {
      console.log('Error getting airdrop history, using in-memory fallback:', error);
      history = [...inMemoryAirdropHistory];
    }

    // Add new record to the beginning of the array
    history.unshift(record);
    
    // Keep only the last 100 records
    if (history.length > 100) {
      history = history.slice(0, 100);
    }

    // Store updated history
    try {
      await kv.set('airdrop_history', history);
    } catch (error) {
      console.log('Error storing airdrop history, using in-memory fallback:', error);
      // Update in-memory history
      inMemoryAirdropHistory.unshift(record);
      if (inMemoryAirdropHistory.length > 100) {
        inMemoryAirdropHistory.length = 100;
      }
    }
  } catch (error) {
    console.error('Failed to store airdrop record:', error);
  }
}

// Function to get recent airdrops
export async function getRecentAirdrops(limit: number = 10): Promise<AirdropRecord[]> {
  try {
    const history = await kv.get('airdrop_history') as AirdropRecord[] | null;
    if (history) {
      return history.slice(0, limit);
    }
  } catch (error) {
    console.log('Error getting airdrop history, using in-memory fallback:', error);
    return [...inMemoryAirdropHistory].slice(0, limit);
  }
  
  return [];
}

// Cache key for the TOML data
const TOML_CACHE_KEY = 'solana_ecosystem_github_usernames';
const TOML_CACHE_EXPIRY = 60 * 60; // 1 hour in seconds

async function fetchAndParseToml() {
  // Try to get the cached data first
  try {
    const cachedData = await kv.get(TOML_CACHE_KEY) as string[] | null;
    if (cachedData) {
      console.log('Using cached GitHub usernames from TOML');
      return { repo: cachedData.map(username => ({ url: `https://github.com/${username}` })) };
    }
  } catch (error) {
    console.log('Error getting cached TOML data:', error);
  }

  // If cache miss or error, fetch the data
  console.log('Fetching fresh TOML data');
  const response = await fetch('https://raw.githubusercontent.com/electric-capital/crypto-ecosystems/refs/heads/master/data/ecosystems/s/solana.toml');
  const tomlContent = await response.text();
  const data = parseTOML(tomlContent) as TomlData;
  
  // Extract GitHub usernames and cache them
  try {
    const githubUsernames: string[] = [];
    data.repo?.forEach(repo => {
      const url = repo.url.toLowerCase();
      if (url.includes('github.com/')) {
        const match = url.match(/github\.com\/([a-z0-9-]+)/i);
        if (match && match[1]) {
          githubUsernames.push(match[1]);
        }
      }
    });
    
    // Cache the extracted usernames
    if (githubUsernames.length > 0) {
      try {
        await kv.set(TOML_CACHE_KEY, githubUsernames, { ex: TOML_CACHE_EXPIRY });
        console.log(`Cached ${githubUsernames.length} GitHub usernames from TOML data`);
      } catch (error) {
        console.log('Error caching TOML data:', error);
      }
    }
  } catch (error) {
    console.log('Error processing TOML data for caching:', error);
  }
  
  return data;
}

// Update the checkUserHasRepo function to use the new KV storage format
export async function checkUserHasRepo(username: string) {
  try {
    console.log('Checking for repos with username:', username);
    
    // Clean up the username to handle potential display names
    // Remove spaces and special characters to get a more GitHub-username-like string
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9-]/g, '');
    console.log('Cleaned username for comparison:', cleanUsername);
    
    // Get GitHub usernames from KV storage
    const githubUsernames = await kv.get('solana_ecosystem_github_usernames') as string[] || [];
    
    // Direct match if the username is in the list
    if (githubUsernames.includes(username.toLowerCase())) {
      console.log('Username found in ecosystem repositories list');
      return true;
    }
    
    // Match with cleaned username
    if (githubUsernames.includes(cleanUsername)) {
      console.log('Cleaned username found in ecosystem repositories list');
      return true;
    }
    
    // If we haven't returned yet, try to get the full repositories list as a fallback
    const githubRepos = await kv.get('solana_ecosystem_github_repos') as string[] || [];
    
    return githubRepos.some((repoUrl) => {
      const repoUrlLower = repoUrl.toLowerCase();
      
      // Try different patterns that might match
      const githubPattern = new RegExp(`(?:https?://)?(?:www\\.)?github\\.com/${username.toLowerCase()}(?:/|$)`);
      const githubPatternClean = new RegExp(`(?:https?://)?(?:www\\.)?github\\.com/${cleanUsername}(?:/|$)`);
      
      const directMatch = githubPattern.test(repoUrlLower);
      const cleanMatch = githubPatternClean.test(repoUrlLower);

      if (directMatch || cleanMatch) {
        console.log('Found matching repo:', repoUrl);
        return true;
      }
      return false;
    });
  } catch (error) {
    console.error('Error checking user repository:', error);
    return false;
  }
}

// Function to fetch GitHub username from GitHub API using user ID
export async function fetchGitHubUsername(userId: string) {
  try {
    const response = await fetch(`https://api.github.com/user/${userId}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DevNetFaucet',
        // Add GitHub token if you have one to avoid rate limits
        ...(process.env.GITHUB_API_TOKEN ? { 'Authorization': `token ${process.env.GITHUB_API_TOKEN}` } : {})
      }
    });
    
    if (!response.ok) {
      console.error('GitHub API error:', response.status, await response.text());
      return null;
    }
    
    const data = await response.json();
    return data.login; // This is the GitHub username
  } catch (error) {
    console.error('Error fetching GitHub username:', error);
    return null;
  }
}

// Helper function to perform airdrop
async function performAirdrop(
  githubUsername: string,
  walletAddress: string,
  isAnonymous: boolean,
  isWhitelisted: boolean
): Promise<string> {
  try {
    // Use Solana's official devnet RPC instead of custom endpoint
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const walletAddressString = walletAddress.trim();

    // Validate wallet address format
    try {
      new PublicKey(walletAddressString);
    } catch (error) {
      return 'Invalid Solana wallet address format';
    }

    const secretKey = process.env.SENDER_SECRET_KEY;
    if(!secretKey) return 'Missing sender key';

    // Check if user is in the upgraded users list
    const upgradedUsers = await kv.get('upgraded_users') as any[] || [];
    const isUpgraded = upgradedUsers.some(user => user.username === githubUsername.toLowerCase());

    // Determine airdrop amount based on user status
    let airdropAmount: number;
    if (isUpgraded) {
      // Upgraded users get the full AIRDROP_AMOUNT regardless of whitelist status
      airdropAmount = Number(process.env.NEXT_PUBLIC_AIRDROP_AMOUNT || 20);
      console.log(`User ${githubUsername} is upgraded, giving full amount: ${airdropAmount}`);
    } else if (isWhitelisted) {
      // Whitelisted but not upgraded users get the WHITELIST_AIRDROP_AMOUNT
      airdropAmount = Number(process.env.NEXT_PUBLIC_WHITELIST_AIRDROP_AMOUNT || 1);
      console.log(`User ${githubUsername} is whitelisted, giving: ${airdropAmount}`);
    } else {
      // Regular users with GitHub repos in the Solana ecosystem
      airdropAmount = Number(process.env.NEXT_PUBLIC_AIRDROP_AMOUNT || 20);
      console.log(`User ${githubUsername} is regular user with GitHub repo, giving: ${airdropAmount}`);
    }
    
    const airdropAmountLamports = airdropAmount * LAMPORTS_PER_SOL;

    const secretKeyUint8Array = new Uint8Array(
      secretKey.split(',').map((num) => parseInt(num, 10))
    );

    const senderKeypair = Keypair.fromSecretKey(secretKeyUint8Array);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: new PublicKey(walletAddressString),
        lamports: airdropAmountLamports
      })
    );

    try {
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair]
      );
      
      console.log('Custom RPC transaction successful with signature:', signature);

      // Store the timestamp using the cooldown service
      const now = Date.now();
      // Set cooldown duration based on upgraded status
      const cooldownDuration = isUpgraded ? 12 * 60 * 60 * 1000 : (Number(process.env.TIMEOUT_HOURS) || 24) * 60 * 60 * 1000;
      await setUserCooldown(githubUsername, cooldownDuration);
      
      // Store airdrop record
      await storeAirdropRecord({
        username: githubUsername,
        walletAddress: walletAddressString,
        timestamp: now,
        isAnonymous
      });

      return 'Airdrop successful';
    } catch (txError) {
      console.log('Transaction error with custom RPC:', txError);
      throw txError; // Re-throw to try fallback
    }
  } catch(error) {
    console.log('Error using custom RPC, falling back to Solana devnet:', error);
    
    // Fall back to the official Solana devnet
    try {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const walletAddressString = walletAddress.trim();
      
      const secretKey = process.env.SENDER_SECRET_KEY;
      if(!secretKey) return 'Missing sender key';

      // Check if user is in the upgraded users list
      const upgradedUsers = await kv.get('upgraded_users') as any[] || [];
      const isUpgraded = upgradedUsers.some(user => user.username === githubUsername.toLowerCase());

      // Determine airdrop amount based on user status
      const airdropAmount = isWhitelisted 
        ? Number(process.env.NEXT_PUBLIC_WHITELIST_AIRDROP_AMOUNT || 1)
        : Number(process.env.NEXT_PUBLIC_AIRDROP_AMOUNT || 20);
      const airdropAmountLamports = airdropAmount * LAMPORTS_PER_SOL;

      const secretKeyUint8Array = new Uint8Array(
        secretKey.split(',').map((num) => parseInt(num, 10))
      );

      const senderKeypair = Keypair.fromSecretKey(secretKeyUint8Array);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderKeypair.publicKey,
          toPubkey: new PublicKey(walletAddressString),
          lamports: airdropAmountLamports
        })
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair]
      );
      
      console.log('Fallback RPC transaction successful with signature:', signature);

      // Store the timestamp using the cooldown service
      const now = Date.now();
      // Set cooldown duration based on upgraded status
      const cooldownDuration = isUpgraded ? 12 * 60 * 60 * 1000 : (Number(process.env.TIMEOUT_HOURS) || 24) * 60 * 60 * 1000;
      await setUserCooldown(githubUsername, cooldownDuration);
      
      // Store airdrop record
      await storeAirdropRecord({
        username: githubUsername,
        walletAddress: walletAddressString,
        timestamp: now,
        isAnonymous
      });

      return 'Airdrop successful';
    } catch(fallbackError) {
      console.log('Error with fallback RPC:', fallbackError);
      return 'Airdrop failed';
    }
  }
}

// Function to store vouch request
export async function storeVouchRequest(username: string): Promise<void> {
  try {
    // Get existing vouch requests
    let vouchRequests: string[] = [];
    try {
      const existingRequests = await kv.get('vouch_requests') as string[] | null;
      if (existingRequests) {
        vouchRequests = existingRequests;
      }
    } catch (error) {
      console.log('Error getting vouch requests:', error);
    }

    // Add new request if not already in the list
    if (!vouchRequests.includes(username)) {
      vouchRequests.push(username);
      
      // Store updated requests
      try {
        await kv.set('vouch_requests', vouchRequests);
      } catch (error) {
        console.log('Error storing vouch requests:', error);
      }
    }
  } catch (error) {
    console.error('Failed to store vouch request:', error);
  }
}

// Function to get all vouch requests
export async function getVouchRequests(): Promise<string[]> {
  try {
    const vouchRequests = await kv.get('vouch_requests') as string[] | null;
    return vouchRequests || [];
  } catch (error) {
    console.log('Error getting vouch requests:', error);
    return [];
  }
}

// Function to check if a user is vouched
export async function isUserVouched(username: string): Promise<boolean> {
  try {
    const vouchedUsers = await kv.get('vouched_users') as VouchRecord[] | null;
    return vouchedUsers ? vouchedUsers.some(record => record.username === username) : false;
  } catch (error) {
    console.log('Error checking if user is vouched:', error);
    return false;
  }
}

// Function to vouch for a user
export async function vouchForUser(username: string, voucherUsername: string, voucherType: 'github' | 'upgraded'): Promise<boolean> {
  try {
    // Check if user is already vouched
    if (await isUserVouched(username)) {
      return false;
    }
    
    // Get existing vouched users
    let vouchedUsers: VouchRecord[] = [];
    try {
      const existingVouched = await kv.get('vouched_users') as VouchRecord[] | null;
      if (existingVouched) {
        vouchedUsers = existingVouched;
      }
    } catch (error) {
      console.log('Error getting vouched users:', error);
    }
    
    // Create new vouch record
    const vouchRecord: VouchRecord = {
      username,
      vouchedBy: voucherUsername,
      timestamp: Date.now(),
      voucherType
    };
    
    // Add to vouched users
    vouchedUsers.push(vouchRecord);
    
    // Store updated vouched users
    try {
      await kv.set('vouched_users', vouchedUsers);
    } catch (error) {
      console.log('Error storing vouched users:', error);
      return false;
    }
    
    // Reset the user's airdrop cooldown timer
    try {
      // Use the cooldown service to reset the cooldown
      await resetUserCooldown(username);
      console.log(`Reset airdrop cooldown timer for ${username}`);
    } catch (error) {
      console.log('Error resetting airdrop cooldown timer:', error);
      // Continue even if this fails, as it's not critical
    }
    
    return true;
  } catch (error) {
    console.error('Failed to vouch for user:', error);
    return false;
  }
}

// Function to remove a vouch
export async function unvouchUser(username: string): Promise<boolean> {
  try {
    // Get existing vouched users
    const vouchedUsers = await kv.get('vouched_users') as VouchRecord[] | null;
    if (!vouchedUsers) {
      return false;
    }
    
    // Remove the user from vouched users
    const updatedVouched = vouchedUsers.filter(record => record.username !== username);
    
    // Store updated vouched users
    try {
      await kv.set('vouched_users', updatedVouched);
    } catch (error) {
      console.log('Error updating vouched users:', error);
      return false;
    }
    
    // Note: We don't restore the cooldown timer when unvouching
    // This allows the user to still use any remaining time from their vouched status
    // If they've already used their airdrop, they'll need to wait for the normal cooldown
    
    return true;
  } catch (error) {
    console.error('Failed to unvouch user:', error);
    return false;
  }
}

// Function to get all vouched users
export async function getVouchedUsers(): Promise<VouchRecord[]> {
  try {
    const vouchedUsers = await kv.get('vouched_users') as VouchRecord[] | null;
    return vouchedUsers || [];
  } catch (error) {
    console.log('Error getting vouched users:', error);
    return [];
  }
}

// Function to create vouch request
export async function createVouchRequest(formData: FormData) {
  noStore();
  
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return 'Please sign in with GitHub first';
  }
  
  const token = await getToken({ 
    req: { cookies: cookies() } as any,
    secret: process.env.NEXTAUTH_SECRET
  });
  
  const githubUserId = token?.sub;
  if (!githubUserId) {
    return 'Unable to verify GitHub account';
  }
  
  const githubUsername = await fetchGitHubUsername(githubUserId);
  if (!githubUsername) {
    return 'Unable to verify GitHub account';
  }

  // Check if user already has a GitHub repo in Solana ecosystem
  const hasRepo = await checkUserHasRepo(githubUsername);
  
  // Check if user is already whitelisted or upgraded
  const whitelistedUsers = await kv.get('whitelisted_users') as any[] || [];
  const upgradedUsers = await kv.get('upgraded_users') as any[] || [];
  
  const isWhitelisted = whitelistedUsers.some(user => user.username === githubUsername);
  const isUpgraded = upgradedUsers.some(user => user.username.toLowerCase() === githubUsername.toLowerCase());
  
  if (hasRepo || isWhitelisted || isUpgraded) {
    return 'You are already eligible for airdrops';
  }
  
  // Check if user is already vouched
  if (await isUserVouched(githubUsername)) {
    return 'You have already been vouched for';
  }
  
  // Store vouch request
  await storeVouchRequest(githubUsername);
  
  return 'Vouch request created successfully';
}

// Function to vouch for a user
export async function vouchForUserAction(formData: FormData) {
  noStore();
  
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return 'Please sign in with GitHub first';
  }
  
  const token = await getToken({ 
    req: { cookies: cookies() } as any,
    secret: process.env.NEXTAUTH_SECRET
  });
  
  const githubUserId = token?.sub;
  if (!githubUserId) {
    return 'Unable to verify GitHub account';
  }
  
  const githubUsername = await fetchGitHubUsername(githubUserId);
  if (!githubUsername) {
    return 'Unable to verify GitHub account';
  }

  // Check if voucher is eligible (has repo in Solana ecosystem or is upgraded)
  const hasRepo = await checkUserHasRepo(githubUsername);
  
  // Check if user is upgraded
  const upgradedUsers = await kv.get('upgraded_users') as any[] || [];
  const isUpgraded = upgradedUsers.some(user => user.username.toLowerCase() === githubUsername.toLowerCase());
  
  if (!hasRepo && !isUpgraded) {
    return 'You are not eligible to vouch for others';
  }
  
  // Get the username to vouch for
  const usernameToVouch = formData.get('username') as string;
  if (!usernameToVouch) {
    return 'No username provided to vouch for';
  }
  
  // Determine voucher type
  const voucherType = isUpgraded ? 'upgraded' : 'github';
  
  // Vouch for the user
  const success = await vouchForUser(usernameToVouch, githubUsername, voucherType);
  
  if (success) {
    return 'User vouched successfully';
  } else {
    return 'Failed to vouch for user or user already vouched';
  }
}

// Update the airdrop function to consider vouched users as well
export default async function airdrop(formData: FormData) {
  noStore();

  // Get both session and token
  const session = await getServerSession(authOptions);
  const token = await getToken({ 
    req: { cookies: cookies() } as any,
    secret: process.env.NEXTAUTH_SECRET
  });
  
  if (!session || !session.user) {
    return 'Please sign in with GitHub first';
  }

  // Get GitHub user ID from token
  const githubUserId = token?.sub;
  if (!githubUserId) {
    console.log('No GitHub user ID found in token');
    return 'Unable to verify GitHub account';
  }
  
  // Fetch GitHub username using the user ID
  const githubUsername = await fetchGitHubUsername(githubUserId);
  if (!githubUsername) {
    console.log('Failed to fetch GitHub username for user ID:', githubUserId);
    return 'Unable to verify GitHub account';
  }
  
  console.log('Using GitHub username:', githubUsername);
  const hasRepo = await checkUserHasRepo(githubUsername);
  
  // Check if user is whitelisted
  const whitelistedUsers = await kv.get('whitelisted_users') as any[] || [];
  const isWhitelisted = whitelistedUsers.some(user => user.username === githubUsername);
  
  // Check if user is vouched
  const isVouched = await isUserVouched(githubUsername);
  
  if (!hasRepo && !isWhitelisted && !isVouched) {
    return 'NO_REPO_FOUND';
  }

  // Check if this GitHub user has received an airdrop recently
  const isInCooldown = await isUserInCooldown(githubUsername);
  
  // Check if user is in the upgraded users list
  const upgradedUsers = await kv.get('upgraded_users') as any[] || [];
  const isUpgraded = upgradedUsers.some(user => user.username === githubUsername.toLowerCase());

  // Upgraded users get a shorter timeout
  const TIMEOUT_HOURS = isUpgraded ? 12 : (Number(process.env.TIMEOUT_HOURS) || 24);
  
  if (isInCooldown) {
    const remainingTime = await getCooldownRemainingTime(githubUsername);
    const minutesLeft = Math.ceil(remainingTime / 60000);
    return `Try again in ${minutesLeft} minutes`;
  }

  const walletAddress = formData.get('walletAddress');
  const isAnonymous = formData.get('isAnonymous') === 'true';
  
  if (!walletAddress || walletAddress === null) {
    return 'Wallet address is required';
  }

  // Determine if the user should be treated as whitelisted
  const effectivelyWhitelisted = isWhitelisted || isVouched;

  return await performAirdrop(
    githubUsername,
    walletAddress.toString(),
    isAnonymous,
    effectivelyWhitelisted
  );
}

// Function to store access request
async function storeAccessRequest(username: string, reason: string): Promise<void> {
  try {
    const now = Date.now();
    const request = {
      username,
      reason,
      timestamp: now
    };
    
    // Get existing requests
    let requests = [];
    try {
      const existingRequests = await kv.get('access_requests') as any[] | null;
      if (existingRequests) {
        requests = existingRequests;
      }
    } catch (error) {
      console.log('Error getting access requests:', error);
    }

    // Add new request
    requests.push(request);
    
    // Keep only the last 100 requests
    if (requests.length > 100) {
      requests = requests.slice(-100);
    }

    // Store updated requests
    try {
      await kv.set('access_requests', requests);
    } catch (error) {
      console.log('Error storing access requests:', error);
    }
  } catch (error) {
    console.error('Failed to store access request:', error);
  }
}

// Function to request access
export async function requestAccess(formData: FormData) {
  noStore();

  const session = await getServerSession(authOptions);
  const token = await getToken({ 
    req: { cookies: cookies() } as any,
    secret: process.env.NEXTAUTH_SECRET
  });
  
  if (!session || !session.user) {
    return 'Please sign in with GitHub first';
  }

  const githubUserId = token?.sub;
  if (!githubUserId) {
    return 'Unable to verify GitHub account';
  }
  
  const githubUsername = await fetchGitHubUsername(githubUserId);
  if (!githubUsername) {
    return 'Unable to verify GitHub account';
  }

  // Get the reason from form data
  const reason = formData.get('reason') as string;
  if (!reason || reason.trim() === '') {
    return 'Please provide a reason for requesting access';
  }

  // Check if user is already whitelisted
  const whitelistedUsers = await kv.get('whitelisted_users') as any[] || [];
  if (whitelistedUsers.some(user => user.username === githubUsername)) {
    return 'You are already whitelisted';
  }

  // Check if user already has a pending request
  const requests = await kv.get('access_requests') as any[] || [];
  if (requests.some(req => req.username === githubUsername)) {
    return 'You already have a pending request';
  }

  // Store the access request
  await storeAccessRequest(githubUsername, reason.trim());

  // Automatically approve the user
  const newWhitelistedUser = {
    username: githubUsername,
    approvedAt: Date.now()
  };
  const updatedWhitelist = [...whitelistedUsers, newWhitelistedUser];
  await kv.set('whitelisted_users', updatedWhitelist);

  // Get wallet address from form data
  const walletAddress = formData.get('walletAddress') as string;
  const isAnonymous = formData.get('isAnonymous') === 'true';

  if (walletAddress) {
    const result = await performAirdrop(
      githubUsername,
      walletAddress,
      isAnonymous,
      true // Newly approved users are whitelisted
    );
    
    if (result === 'Airdrop successful') {
      return 'Access approved and airdrop successful!';
    } else {
      return `Access approved but ${result.toLowerCase()}`;
    }
  }

  return 'Access approved! You can now request an airdrop.';
}