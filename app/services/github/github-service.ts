import { parse as parseTOML } from '@iarna/toml';
import { Repository, TomlData } from '@/app/models/types';
import { kv } from "@vercel/kv";
import { safeKvGet, safeKvSet, safeKvSetWithExpiry } from '@/app/services/storage/kv-storage';

// Cache key for the TOML data
const TOML_CACHE_KEY = 'solana_ecosystem_github_usernames';
const TOML_CACHE_EXPIRY = 60 * 60; // 1 hour in seconds

/**
 * Fetch GitHub username from GitHub API using user ID
 */
export async function fetchGitHubUsername(userId: string): Promise<string | null> {
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

/**
 * Check if a user has repos in the Solana ecosystem
 */
export async function checkUserHasRepo(username: string): Promise<boolean> {
  try {
    console.log('Checking for repos with username:', username);
    
    // Clean up the username to handle potential display names
    // Remove spaces and special characters to get a more GitHub-username-like string
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9-]/g, '');
    console.log('Cleaned username for comparison:', cleanUsername);
    
    // Get GitHub usernames from KV storage
    const githubUsernames = await safeKvGet<string[]>('solana_ecosystem_github_usernames') || [];
    
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
    const githubRepos = await safeKvGet<string[]>('solana_ecosystem_github_repos') || [];
    
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

/**
 * Fetch and parse Solana ecosystem TOML file
 */
export async function fetchAndParseToml(): Promise<TomlData> {
  // Try to get the cached data first
  try {
    const cachedData = await safeKvGet<string[]>(TOML_CACHE_KEY);
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
        await safeKvSetWithExpiry(TOML_CACHE_KEY, githubUsernames, TOML_CACHE_EXPIRY);
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

/**
 * Update the GitHub repos cache with the latest data
 */
export async function updateGitHubReposCache(): Promise<void> {
  try {
    const data = await fetchAndParseToml();
    const repos = data.repo || [];
    
    // Extract all repository URLs
    const repoUrls = repos.map(repo => repo.url);
    
    // Store in KV
    await safeKvSet('solana_ecosystem_github_repos', repoUrls);
    
    // Extract GitHub usernames
    const githubUsernames: string[] = [];
    repos.forEach(repo => {
      const url = repo.url.toLowerCase();
      if (url.includes('github.com/')) {
        const match = url.match(/github\.com\/([a-z0-9-]+)/i);
        if (match && match[1]) {
          githubUsernames.push(match[1]);
        }
      }
    });
    
    // Store usernames in KV
    await safeKvSet('solana_ecosystem_github_usernames', githubUsernames);
    
    console.log(`Updated GitHub repos cache with ${repoUrls.length} repos and ${githubUsernames.length} usernames`);
  } catch (error) {
    console.error('Error updating GitHub repos cache:', error);
  }
} 