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
    
    // Create a map of usernames to reasons from access requests
    const reasonsMap = new Map();
    for (const request of accessRequests) {
      reasonsMap.set(request.username, request.reason);
    }
    
    // Create structured data for all users
    const vouchRequestsData = vouchRequests.map(username => ({
      username,
      isWhitelisted: false,
      reason: ''
    }));
    
    const whitelistedUsersData = whitelistedUsers.map(user => ({
      username: user.username,
      isWhitelisted: true,
      reason: reasonsMap.get(user.username) || 'No reason provided'
    }));
    
    // Combine all users
    const allUsers = [...vouchRequestsData, ...whitelistedUsersData];
    
    // Remove duplicates by username
    const uniqueUsersMap = new Map();
    for (const user of allUsers) {
      if (!uniqueUsersMap.has(user.username)) {
        uniqueUsersMap.set(user.username, user);
      }
    }
    
    // Convert map to array
    const uniqueUsers = Array.from(uniqueUsersMap.values());
    
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