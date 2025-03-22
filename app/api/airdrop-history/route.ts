import { NextResponse } from 'next/server';
import { kv } from "@vercel/kv";

export async function GET() {
  try {
    const history = await kv.get('airdrop_history') as any[] || [];
    
    // Filter out anonymous users
    const publicHistory = history.filter(record => !record.isAnonymous);
    
    return NextResponse.json(publicHistory);
  } catch (error) {
    console.error('Error fetching airdrop history:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 