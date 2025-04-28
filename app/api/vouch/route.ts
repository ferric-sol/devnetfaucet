import { NextRequest, NextResponse } from 'next/server';
import { vouchForUserAction } from '@/app/airdrop';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const result = await vouchForUserAction(formData);
    
    return new NextResponse(result);
  } catch (error) {
    console.error('Error in vouch API:', error);
    return new NextResponse('An error occurred while processing your request', { status: 500 });
  }
} 