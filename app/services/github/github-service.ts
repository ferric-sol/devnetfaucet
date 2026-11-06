import { safeKvGet, safeKvSet } from '@/app/services/storage/kv-storage';

// Solana ecosystem repo list (Electric Capital Open Dev Data export)
const ECOSYSTEM_DATA_URL = process.env.ECOSYSTEM_DATA_URL
  || 'https://raw.githubusercontent.com/ferric-sol/devnetfaucet/main/solana.jsonl';

interface EcosystemEntry {
  eco_name: string;
  branch: string[];
  repo_url: string;
  tags: string[];
}

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
 * Fetch the Solana ecosystem repo list (Electric Capital Open Dev Data export,
 * one JSON object per line) and return its GitHub repo URLs.
 *
 * Electric Capital no longer publishes per-ecosystem TOML files, so this reads
 * the solana.jsonl committed to this repo. Override with ECOSYSTEM_DATA_URL.
 */
export async function fetchEcosystemRepos(): Promise<string[]> {
  const response = await fetch(ECOSYSTEM_DATA_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Ecosystem data fetch failed: ${response.status} ${ECOSYSTEM_DATA_URL}`);
  }

  const repoUrls: string[] = [];
  for (const line of (await response.text()).split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as EcosystemEntry;
      if (entry.repo_url?.includes('github.com/')) {
        repoUrls.push(entry.repo_url);
      }
    } catch {
      // Skip malformed lines rather than failing the whole refresh
    }
  }
  return repoUrls;
}

/**
 * Update the GitHub repos cache with the latest data.
 * Writes the same keys as scripts/update_ecosystem_data.ts, with no expiry.
 */
export async function updateGitHubReposCache(): Promise<void> {
  try {
    const repoUrls = await fetchEcosystemRepos();
    if (repoUrls.length === 0) {
      throw new Error('Ecosystem data was empty; keeping the existing cache');
    }

    const githubUsernames = new Set<string>();
    for (const url of repoUrls) {
      const match = url.match(/github\.com\/([a-zA-Z0-9-]+)/i);
      if (match?.[1]) {
        githubUsernames.add(match[1].toLowerCase());
      }
    }

    await safeKvSet('solana_ecosystem_github_repos', repoUrls);
    await safeKvSet('solana_ecosystem_github_usernames', Array.from(githubUsernames));

    console.log(`Updated GitHub repos cache with ${repoUrls.length} repos and ${githubUsernames.size} usernames`);
  } catch (error) {
    console.error('Error updating GitHub repos cache:', error);
  }
}