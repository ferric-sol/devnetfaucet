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

    // Get current requests
    const requests = await kv.get('access_requests') as any[];

    // Remove the request
    const updatedRequests = requests.filter(req => req.username !== username);
    await kv.set('access_requests', updatedRequests);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 