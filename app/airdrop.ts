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

async function fetchAndParseToml() {
  const response = await fetch('https://raw.githubusercontent.com/electric-capital/crypto-ecosystems/refs/heads/master/data/ecosystems/s/solana.toml');
  const tomlContent = await response.text();
  return parseTOML(tomlContent) as TomlData;
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
    console.log('Comparing with repoUrl:', repoUrl);
    
    // Try different patterns that might match
    const directMatch = repoUrl.includes(`github.com/${username.toLowerCase()}/`);
    const cleanMatch = repoUrl.includes(`github.com/${cleanUsername}/`);
    
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
    
    console.log('session: ', session);
    console.log('token: ', token);
    
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
    if (!hasRepo) {
      return 'No eligible repository found in Solana ecosystem';
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
    try { 
      if (!walletAddress || walletAddress === null) {
        throw new Error('Wallet address is required');
      }

      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const walletAddressString = walletAddress?.toString();

      const secretKey = process.env.SENDER_SECRET_KEY;
      if(!secretKey) return 'Airdrop failed';

      // Changed to 100 SOL as requested
      const airdropAmount = 100;
      const airdropAmountLamports = airdropAmount * LAMPORTS_PER_SOL;

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
        timestamp: now
      });

      return 'Airdrop successful';
    } catch(error) {
      console.log('error airdropping: ', error);
      return 'Airdrop failed';
    }
}