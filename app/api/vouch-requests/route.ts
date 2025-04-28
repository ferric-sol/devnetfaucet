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
    
    // Combine vouch requests and whitelisted users
    const allUsers = [
      ...vouchRequests,
      ...whitelistedUsers.map(user => user.username)
    ];
    
    // Remove duplicates using Array.from
    const uniqueUsers = Array.from(new Set(allUsers));
    
    return NextResponse.json(uniqueUsers);
  } catch (error) {
    console.error('Error in vouch-requests API:', error);
    return new NextResponse('An error occurred while processing your request', { status: 500 });
  }
} 