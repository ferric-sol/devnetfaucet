import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import { resetUserCooldown } from "@/app/services/airdrop/cooldown-service";
import { safeKvGet, safeKvSet } from "@/app/services/storage/kv-storage";
import { AirdropRecord, VouchRecord, WhitelistedUser, UpgradedUser, AccessRequest } from "@/app/models/types";
import { fetchGitHubUsername } from '@/app/services/github/github-service';

// Admin-only API endpoint to remove a user for testing purposes
export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get admin's GitHub ID and username
    const token = await getToken({ 
      req: { cookies: cookies() } as any,
      secret: process.env.NEXTAUTH_SECRET
    });
    
    const adminGithubId = token?.sub;
    if (!adminGithubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const adminUsername = await fetchGitHubUsername(adminGithubId);
    
    // Check if user is an admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    const isAdmin = session.user.email && adminEmails.includes(session.user.email);
    
    if (!isAdmin) {
      console.log(`Unauthorized access attempt by ${adminUsername}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user to remove from request body
    const body = await request.json();
    const { username } = body;
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    
    console.log(`Admin ${adminUsername} is removing test user: ${username}`);
    
    // 1. Reset cooldown
    await resetUserCooldown(username);
    
    // 2. Remove from vouched users
    const vouchedUsers = await safeKvGet<VouchRecord[]>('vouched_users') || [];
    const updatedVouched = vouchedUsers.filter(record => record.username !== username);
    await safeKvSet('vouched_users', updatedVouched);
    
    // 3. Remove from whitelist
    const whitelistedUsers = await safeKvGet<WhitelistedUser[]>('whitelisted_users') || [];
    const updatedWhitelist = whitelistedUsers.filter(user => user.username !== username);
    await safeKvSet('whitelisted_users', updatedWhitelist);
    
    // 4. Remove from upgraded users
    const upgradedUsers = await safeKvGet<UpgradedUser[]>('upgraded_users') || [];
    const updatedUpgraded = upgradedUsers.filter(user => user.username.toLowerCase() !== username.toLowerCase());
    await safeKvSet('upgraded_users', updatedUpgraded);
    
    // 5. Remove from airdrop history
    const history = await safeKvGet<AirdropRecord[]>('airdrop_history') || [];
    const updatedHistory = history.filter(record => record.username !== username);
    await safeKvSet('airdrop_history', updatedHistory);
    
    // 6. Remove from vouch requests
    const vouchRequests = await safeKvGet<string[]>('vouch_requests') || [];
    const updatedRequests = vouchRequests.filter(req => req !== username);
    await safeKvSet('vouch_requests', updatedRequests);
    
    // 7. Remove from pending whitelist requests (access_requests)
    const accessRequests = await safeKvGet<AccessRequest[]>('access_requests') || [];
    const updatedAccessRequests = accessRequests.filter(req => req.username !== username);
    await safeKvSet('access_requests', updatedAccessRequests);
    
    // Return success
    return NextResponse.json({
      success: true,
      message: `User ${username} has been completely removed from the system`,
      removedRecords: {
        vouchedUsers: vouchedUsers.length - updatedVouched.length,
        whitelistedUsers: whitelistedUsers.length - updatedWhitelist.length,
        upgradedUsers: upgradedUsers.length - updatedUpgraded.length,
        airdropHistory: history.length - updatedHistory.length,
        vouchRequests: vouchRequests.length - updatedRequests.length,
        accessRequests: accessRequests.length - updatedAccessRequests.length
      }
    });
  } catch (error: any) {
    console.error('Error removing test user:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
} 