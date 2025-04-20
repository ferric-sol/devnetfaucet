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

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Get current upgraded users
    const upgradedUsers = await kv.get('upgraded_users') as any[] || [];
    
    // Remove user from upgraded list
    const updatedUpgradedUsers = upgradedUsers.filter(user => user.username !== username);
    
    // If no changes were made, user wasn't in the list
    if (updatedUpgradedUsers.length === upgradedUsers.length) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found in upgraded users list' 
      });
    }
    
    await kv.set('upgraded_users', updatedUpgradedUsers);

    return NextResponse.json({ 
      success: true, 
      message: `User ${username} has been removed from upgraded users` 
    });
  } catch (error) {
    console.error('Error removing upgraded user:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 