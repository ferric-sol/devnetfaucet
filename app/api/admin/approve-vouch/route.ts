import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/lib/auth';
import { kv } from "@vercel/kv";
import { vouchForUser } from '@/app/airdrop';

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

    // Manually vouch for the user as an admin
    const success = await vouchForUser(username, 'ADMIN', 'upgraded');
    
    if (success) {
      return new NextResponse('User vouched successfully', { status: 200 });
    } else {
      return new NextResponse('Failed to vouch for user or user already vouched', { status: 400 });
    }
  } catch (error) {
    console.error('Error approving vouch:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 