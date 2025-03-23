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

    // Get current requests and rejected users
    const [requests, rejectedUsers] = await Promise.all([
      kv.get('access_requests') as Promise<any[]>,
      kv.get('rejected_users') as Promise<any[]>
    ]);

    // Remove the request
    const updatedRequests = requests.filter(req => req.username !== username);

    // Add to rejected users list
    const now = Date.now();
    const newRejectedUser = {
      username,
      rejectedAt: now
    };
    const updatedRejectedUsers = [...(rejectedUsers || []), newRejectedUser];

    // Store updated data
    await Promise.all([
      kv.set('access_requests', updatedRequests),
      kv.set('rejected_users', updatedRejectedUsers)
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 