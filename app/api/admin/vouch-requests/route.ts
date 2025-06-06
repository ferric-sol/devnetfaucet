import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/lib/auth';
import { kv } from "@vercel/kv";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // Check if user is admin
  if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const vouchRequests = await kv.get('vouch_requests') as string[] || [];
    return NextResponse.json(vouchRequests);
  } catch (error) {
    console.error('Error fetching vouch requests:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 