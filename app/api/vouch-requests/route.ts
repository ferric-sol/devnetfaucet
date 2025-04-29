import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/lib/auth';
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { kv } from "@vercel/kv";
import { fetchGitHubUsername, checkUserHasRepo } from '@/app/airdrop';

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
    const vouchRequests = await kv.get('vouch_requests') as string[] || [];
    
    // Get whitelisted users
    const whitelistedUsers = await kv.get('whitelisted_users') as any[] || [];
    
    // Get access requests to find reasons for whitelisted users
    const accessRequests = await kv.get('access_requests') as any[] || [];
    
    // Create a map of usernames to reasons and timestamps from access requests
    const requestsMap = new Map();
    for (const request of accessRequests) {
      requestsMap.set(request.username, {
        reason: request.reason,
        timestamp: request.timestamp
      });
    }
    
    // Create structured data for all users
    const vouchRequestsData = vouchRequests.map(username => ({
      username,
      isWhitelisted: false,
      reason: '',
      timestamp: 0 // Default timestamp for sorting
    }));
    
    const whitelistedUsersData = whitelistedUsers.map(user => {
      const requestInfo = requestsMap.get(user.username) || { reason: 'No reason provided', timestamp: user.approvedAt || Date.now() };
      return {
        username: user.username,
        isWhitelisted: true,
        reason: requestInfo.reason,
        timestamp: requestInfo.timestamp
      };
    });
    
    // Combine all users
    const allUsers = [...vouchRequestsData, ...whitelistedUsersData];
    
    // Remove duplicates by username and keep the entry with the highest timestamp
    const uniqueUsersMap = new Map();
    for (const user of allUsers) {
      if (!uniqueUsersMap.has(user.username) || 
          user.timestamp > uniqueUsersMap.get(user.username).timestamp) {
        uniqueUsersMap.set(user.username, user);
      }
    }
    
    // Convert map to array and sort by timestamp in descending order (latest first)
    const uniqueUsers = Array.from(uniqueUsersMap.values())
      .sort((a, b) => {
        // First prioritize whitelisted users
        if (a.isWhitelisted && !b.isWhitelisted) return -1;
        if (!a.isWhitelisted && b.isWhitelisted) return 1;
        // Then sort by timestamp (newest first)
        return b.timestamp - a.timestamp;
      });
    
    // Return data with count
    return NextResponse.json({
      total: uniqueUsers.length,
      users: uniqueUsers
    });
  } catch (error) {
    console.error('Error in vouch-requests API:', error);
    return new NextResponse('An error occurred while processing your request', { status: 500 });
  }
} 