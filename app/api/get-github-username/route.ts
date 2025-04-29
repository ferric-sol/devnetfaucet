import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import { authOptions } from '@/app/lib/auth';
import { fetchGitHubUsername } from '@/app/services/github/github-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the GitHub user ID from the token
    const token = await getToken({ 
      req: { cookies: cookies() } as any,
      secret: process.env.NEXTAUTH_SECRET
    });
    
    const githubUserId = token?.sub;
    
    if (!githubUserId) {
      return NextResponse.json({ error: 'GitHub user ID not found' }, { status: 400 });
    }
    
    // Fetch the GitHub username using the user ID
    const username = await fetchGitHubUsername(githubUserId);
    
    if (!username) {
      return NextResponse.json({ error: 'Failed to fetch GitHub username' }, { status: 500 });
    }
    
    return NextResponse.json({ username });
  } catch (error) {
    console.error('Error getting GitHub username:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
} 