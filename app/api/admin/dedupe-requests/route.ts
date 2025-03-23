import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/lib/auth';
import { kv } from "@vercel/kv";

export async function POST() {
  const session = await getServerSession(authOptions);
  
  // Check if user is admin
  if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Get all requests
    const requests = await kv.get('access_requests') as any[] || [];
    
    // Create a map to store the earliest request for each username
    const earliestRequests = new Map<string, any>();
    
    // Process each request
    requests.forEach(request => {
      const existingRequest = earliestRequests.get(request.username);
      
      // If no existing request or this one is earlier, update the map
      if (!existingRequest || request.timestamp < existingRequest.timestamp) {
        earliestRequests.set(request.username, request);
      }
    });
    
    // Convert map values back to array
    const dedupedRequests = Array.from(earliestRequests.values());
    
    // Sort by timestamp (oldest first)
    dedupedRequests.sort((a, b) => a.timestamp - b.timestamp);
    
    // Store the deduped requests
    await kv.set('access_requests', dedupedRequests);
    
    return NextResponse.json({
      success: true,
      originalCount: requests.length,
      dedupedCount: dedupedRequests.length,
      removedCount: requests.length - dedupedRequests.length
    });
  } catch (error) {
    console.error('Error deduping requests:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 