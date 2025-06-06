import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
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
        ...(process.env.GITHUB_API_TOKEN ? { 'Authorization': `token ${process.env.GITHUB_API_TOKEN}` } : {})
      }
    });
    
    if (!response.ok) {
      console.error('GitHub API error:', response.status, await response.text());
      return null;
    }
    
    const data = await response.json();
    return data.login;
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

export async function GET() {
  try {
    // Get the session and token to verify the user is authenticated
    const session = await getServerSession(authOptions);
    const token = await getToken({ 
      req: { cookies: cookies() } as any,
      secret: process.env.NEXTAUTH_SECRET
    });
    
    if (!session || !session.user) {
      return NextResponse.json({ isEligible: false });
    }

    // Get GitHub user ID from token
    const githubUserId = token?.sub;
    if (!githubUserId) {
      return NextResponse.json({ isEligible: false });
    }
    
    // Fetch GitHub username using the user ID
    const githubUsername = await fetchGitHubUsername(githubUserId);
    if (!githubUsername) {
      return NextResponse.json({ isEligible: false });
    }
    
    // Check if user has repo in Solana ecosystem
    const hasRepo = await checkUserHasRepo(githubUsername);
    
    // Check if user is in the upgraded users list
    const upgradedUsers = await kv.get('upgraded_users') as any[] || [];
    const isUpgraded = upgradedUsers.some(user => user.username.toLowerCase() === githubUsername.toLowerCase());
    
    // User is eligible if they have a repo or are upgraded
    const isEligible = hasRepo || isUpgraded;
    
    return NextResponse.json({ isEligible });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    return NextResponse.json({ isEligible: false });
  }
} 