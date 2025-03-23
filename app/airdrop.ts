"use server";

import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL, Transaction, SystemProgram, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';
import { unstable_noStore as noStore } from 'next/cache';
import { kv } from "@vercel/kv";
import { getServerSession } from "next-auth/next";
import { parse as parseTOML } from '@iarna/toml';
import { authOptions } from './lib/auth';
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";

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

async function checkUserHasRepo(username: string) {
  const tomlData = await fetchAndParseToml();
  const repos = tomlData.repo || [];
  
  // Clean up the username to handle potential display names
  // Remove spaces and special characters to get a more GitHub-username-like string
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9-]/g, '');
  
  console.log('Checking for repos with username:', username);
  console.log('Cleaned username for comparison:', cleanUsername);
  
  return repos.some((repo) => {
    const repoUrl = repo.url.toLowerCase();
    
    // Try different patterns that might match
    const githubPattern = new RegExp(`(?:https?://)?(?:www\\.)?github\\.com/${username.toLowerCase()}(?:/|$)`);
    const githubPatternClean = new RegExp(`(?:https?://)?(?:www\\.)?github\\.com/${cleanUsername}(?:/|$)`);
    
    const directMatch = githubPattern.test(repoUrl);
    const cleanMatch = githubPatternClean.test(repoUrl);

    if (directMatch || cleanMatch) {
      console.log('Found matching repo:', repo.url);
      return true;
    }
    return false;
  });
}

// Function to fetch GitHub username from GitHub API using user ID
async function fetchGitHubUsername(userId: string) {
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
    
    if (!hasRepo && !isWhitelisted) {
      return 'NO_REPO_FOUND';
    }

    // Check if this GitHub user has received an airdrop recently
    // Use the username as the key instead of wallet address
    const lastAirdropTimestampString = await safeKvGet(`user:${githubUsername}`);
    const lastAirdropTimestamp = lastAirdropTimestampString ? parseInt(lastAirdropTimestampString) : null;

    const TIMEOUT_HOURS = Number(process.env.TIMEOUT_HOURS) || 24;
    const oneHourAgo = Date.now() - TIMEOUT_HOURS * 60 * 60 * 1000;

    if (lastAirdropTimestamp && lastAirdropTimestamp > oneHourAgo) {
      const minutesLeft = Math.ceil((lastAirdropTimestamp - oneHourAgo) / 60000);
      return `Try again in ${minutesLeft} minutes`;
    }

    const walletAddress = formData.get('walletAddress');
    const isAnonymous = formData.get('isAnonymous') === 'true';
    
    try { 
      if (!walletAddress || walletAddress === null) {
        throw new Error('Wallet address is required');
      }

      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const walletAddressString = walletAddress?.toString().trim();

      // Validate wallet address format
      try {
        new PublicKey(walletAddressString);
      } catch (error) {
        return 'Invalid Solana wallet address format';
      }

      const secretKey = process.env.SENDER_SECRET_KEY;
      if(!secretKey) return 'Airdrop failed';

      // Changed to 100 SOL as requested
      const airdropAmount = process.env.NEXT_PUBLIC_AIRDROP_AMOUNT;
      const airdropAmountLamports = airdropAmount ? Number(airdropAmount) * LAMPORTS_PER_SOL : 0;

      const secretKeyUint8Array = new Uint8Array(
        secretKey.split(',').map((num) => parseInt(num, 10))
      );

      const senderKeypair = Keypair.fromSecretKey(secretKeyUint8Array);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderKeypair.publicKey,
          toPubkey: new PublicKey(walletAddress as string),
          lamports: airdropAmountLamports
        })
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair]
      );

      // Store the timestamp using the GitHub username as the key
      const now = Date.now();
      await safeKvSet(`user:${githubUsername}`, now);
      
      // Store airdrop record
      await storeAirdropRecord({
        username: githubUsername,
        walletAddress: walletAddressString,
        timestamp: now,
        isAnonymous
      });

      return 'Airdrop successful';
    } catch(error) {
      console.log('error airdropping: ', error);
      return 'Airdrop failed';
    }
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

  await storeAccessRequest(githubUsername, reason.trim());
  return 'Access request submitted successfully';
}