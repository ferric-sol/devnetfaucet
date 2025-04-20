import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/lib/auth';
import { kv } from "@vercel/kv";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  // Check if user is admin
  if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string' || username.trim() === '') {
      return NextResponse.json({ error: 'Valid username is required' }, { status: 400 });
    }

    // Clean up username
    const cleanUsername = username.trim().toLowerCase();

    // Get current upgraded users
    const upgradedUsers = await kv.get('upgraded_users') as any[] || [];
    
    // Check if user is already upgraded
    if (upgradedUsers.some(user => user.username === cleanUsername)) {
      return NextResponse.json({ success: false, message: 'User is already upgraded' });
    }

    // Add to upgraded users
    const newUpgradedUser = {
      username: cleanUsername,
      upgradedAt: Date.now()
    };
    const updatedUpgradedUsers = [...upgradedUsers, newUpgradedUser];
    await kv.set('upgraded_users', updatedUpgradedUsers);

    return NextResponse.json({ 
      success: true, 
      message: `User ${cleanUsername} has been upgraded to receive ${process.env.NEXT_PUBLIC_AIRDROP_AMOUNT} SOL` 
    });
  } catch (error) {
    console.error('Error adding upgraded user:', error);
    return NextResponse.json({ 
      error: 'Internal server error'  
    }, { status: 500 });
  }
} 