import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/lib/auth';
import { kv } from "@vercel/kv";
import { unvouchUser } from '@/app/airdrop';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Check if user is admin
  if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { username } = await request.json();
    if (!username) {
      return new NextResponse('Username is required', { status: 400 });
    }

    // Unvouch the user
    const success = await unvouchUser(username);
    
    if (success) {
      return new NextResponse('User unvouched successfully', { status: 200 });
    } else {
      return new NextResponse('Failed to unvouch user or user not vouched', { status: 400 });
    }
  } catch (error) {
    console.error('Error unvouching user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 