import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/lib/auth';
import { kv } from "@vercel/kv";

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

    // Get existing vouch requests
    const vouchRequests = await kv.get('vouch_requests') as string[] || [];
    
    // Remove the username from the vouch requests
    const updatedRequests = vouchRequests.filter(req => req !== username);
    
    // Update the vouch requests
    await kv.set('vouch_requests', updatedRequests);
    
    return new NextResponse('Vouch request rejected successfully', { status: 200 });
  } catch (error) {
    console.error('Error rejecting vouch request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 