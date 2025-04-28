import { NextRequest, NextResponse } from 'next/server';
import { getVouchRequests } from '@/app/airdrop';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import { kv } from "@vercel/kv";

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

// Helper function to check if the user has a repo in the Solana ecosystem
async function checkUserHasRepo(username: string) {
  try {
    const githubUsernames = await kv.get('solana_ecosystem_github_usernames') as string[] || [];
    
    if (githubUsernames.includes(username.toLowerCase())) {
      return true;
    }
    
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (githubUsernames.includes(cleanUsername)) {
      return true;
    }
    
    const githubRepos = await kv.get('solana_ecosystem_github_repos') as string[] || [];
    
    return githubRepos.some((repoUrl) => {
      const repoUrlLower = repoUrl.toLowerCase();
      
      const githubPattern = new RegExp(`(?:https?://)?(?:www\\.)?github\\.com/${username.toLowerCase()}(?:/|$)`);
      const githubPatternClean = new RegExp(`(?:https?://)?(?:www\\.)?github\\.com/${cleanUsername}(?:/|$)`);
      
      return githubPattern.test(repoUrlLower) || githubPatternClean.test(repoUrlLower);
    });
  } catch (error) {
    console.error('Error checking user repository:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the session and token to verify the user is authenticated
    const session = await getServerSession(authOptions);
    const token = await getToken({ 
      req: { cookies: cookies() } as any,
      secret: process.env.NEXTAUTH_SECRET
    });
    
    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get GitHub user ID from token
    const githubUserId = token?.sub;
    if (!githubUserId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    // Fetch GitHub username using the user ID
    const githubUsername = await fetchGitHubUsername(githubUserId);
    if (!githubUsername) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    // Check if user has repo in Solana ecosystem
    const hasRepo = await checkUserHasRepo(githubUsername);
    
    // Check if user is in the upgraded users list
    const upgradedUsers = await kv.get('upgraded_users') as any[] || [];
    const isUpgraded = upgradedUsers.some(user => user.username.toLowerCase() === githubUsername.toLowerCase());
    
    // Only authenticated users with repos in the Solana ecosystem or who are upgraded can see vouch requests
    if (!hasRepo && !isUpgraded) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    // Get the vouch requests
    const vouchRequests = await getVouchRequests();
    
    return NextResponse.json(vouchRequests);
  } catch (error) {
    console.error('Error in vouch-requests API:', error);
    return new NextResponse('An error occurred while processing your request', { status: 500 });
  }
} 