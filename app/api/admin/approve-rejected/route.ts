import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/lib/auth';
import { kv } from "@vercel/kv";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Get current rejected users
    const rejectedUsers = await kv.get('rejected_users') as any[] || [];
    
    // Remove user from rejected list
    const updatedRejectedUsers = rejectedUsers.filter(user => user.username !== username);
    await kv.set('rejected_users', updatedRejectedUsers);

    // Add to whitelisted users
    const whitelistedUsers = await kv.get('whitelisted_users') as any[] || [];
    whitelistedUsers.push({
      username,
      approvedAt: Date.now()
    });
    await kv.set('whitelisted_users', whitelistedUsers);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error approving rejected user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 