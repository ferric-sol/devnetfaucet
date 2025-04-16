/**
 * Script to update Solana ecosystem data in KV store
 * 
 * Data Source: Electric Capital Crypto Ecosystems
 * https://github.com/electric-capital/crypto-ecosystems
 * 
 * This script processes data from Electric Capital's Crypto Ecosystems project,
 * which is licensed under MIT license with attribution.
 * 
 * If you're working in open source crypto, submit your repository here to be counted:
 * https://github.com/electric-capital/crypto-ecosystems
 */

import { kv } from "@vercel/kv";
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from .env.local file
dotenv.config({ path: '.env.local' });

// Cache key for the ecosystem data
const ECOSYSTEM_CACHE_KEY = 'solana_ecosystem_github_repos';
// No expiry - data will be stored permanently
const ECOSYSTEM_CACHE_EXPIRY = 0; // 0 = no expiration

interface EcosystemEntry {
  eco_name: string;
  branch: string[];
  repo_url: string;
  tags: string[];
}

async function loadEcosystemData(): Promise<EcosystemEntry[] | null> {
  try {
    console.log('Loading Solana ecosystem data from local file...');
    
    // Load the JSONL file from local filesystem
    const filePath = path.join(process.cwd(), 'solana.jsonl');
    console.log(`Looking for file at: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const jsonlContent = fs.readFileSync(filePath, 'utf8');
    const entries: EcosystemEntry[] = [];
    
    // Parse the JSONL content (one JSON object per line)
    const lines = jsonlContent.split('\n').filter(line => line.trim() !== '');
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as EcosystemEntry;
        entries.push(entry);
      } catch (error) {
        console.error('Error parsing JSONL line:', error);
        console.error('Problematic line:', line);
      }
    }
    
    console.log(`Successfully parsed ${entries.length} ecosystem entries`);
    return entries;
  } catch (error) {
    console.error('Error loading ecosystem data:', error);
    return null;
  }
}

async function extractAndStoreGitHubRepos(entries: EcosystemEntry[]): Promise<boolean> {
  // Extract GitHub repository URLs and usernames
  const githubRepos: string[] = [];
  const githubUsernames = new Set<string>();
  
  for (const entry of entries) {
    if (entry.repo_url && entry.repo_url.includes('github.com')) {
      githubRepos.push(entry.repo_url);
      
      // Extract username/org from GitHub URL
      const match = entry.repo_url.match(/github\.com\/([a-zA-Z0-9-]+)/i);
      if (match && match[1]) {
        githubUsernames.add(match[1].toLowerCase());
      }
    }
  }
  
  console.log(`Found ${githubRepos.length} GitHub repositories from ${githubUsernames.size} unique usernames/organizations`);
  
  // Store the data in KV store
  try {
    // Check if KV connection is working
    console.log('Verifying KV connection...');
    await kv.ping();
    console.log('KV connection successful');
    
    // Store data with no expiry (permanent storage)
    console.log('Storing repository URLs...');
    if (ECOSYSTEM_CACHE_EXPIRY === 0) {
      await kv.set(ECOSYSTEM_CACHE_KEY, githubRepos);
      console.log('Repository URLs stored permanently (no expiry)');
    } else {
      await kv.set(ECOSYSTEM_CACHE_KEY, githubRepos, { ex: ECOSYSTEM_CACHE_EXPIRY });
      console.log(`Repository URLs stored with expiry of ${ECOSYSTEM_CACHE_EXPIRY} seconds`);
    }
    
    // Store unique GitHub usernames (for compatibility with existing code)
    console.log('Storing unique GitHub usernames...');
    if (ECOSYSTEM_CACHE_EXPIRY === 0) {
      await kv.set('solana_ecosystem_github_usernames', Array.from(githubUsernames));
      console.log('GitHub usernames stored permanently (no expiry)');
    } else {
      await kv.set('solana_ecosystem_github_usernames', Array.from(githubUsernames), { ex: ECOSYSTEM_CACHE_EXPIRY });
      console.log(`GitHub usernames stored with expiry of ${ECOSYSTEM_CACHE_EXPIRY} seconds`);
    }
    
    console.log('Successfully stored ecosystem data in KV store');
    return true;
  } catch (error) {
    console.error('Error storing data in KV store:', error);
    console.error('Make sure your .env.local file contains valid KV_URL and KV_REST_API_TOKEN values');
    return false;
  }
}

async function main(): Promise<void> {
  console.log('Starting Solana ecosystem data update...');
  
  // Log environment variables (without showing sensitive values)
  console.log('Environment setup:');
  console.log(` - KV_URL: ${process.env.KV_URL ? '[defined]' : '[missing]'}`);
  console.log(` - KV_REST_API_TOKEN: ${process.env.KV_REST_API_TOKEN ? '[defined]' : '[missing]'}`);
  console.log(` - KV_REST_API_READ_ONLY_TOKEN: ${process.env.KV_REST_API_READ_ONLY_TOKEN ? '[defined]' : '[missing]'}`);
  
  // Load ecosystem data from local file
  const entries = await loadEcosystemData();
  
  if (!entries || entries.length === 0) {
    console.error('Failed to load or parse ecosystem data');
    process.exit(1);
  }
  
  // Process and store the data
  const success = await extractAndStoreGitHubRepos(entries);
  
  if (success) {
    console.log('Ecosystem data update completed successfully!');
  } else {
    console.error('Ecosystem data update failed');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 