import { NextRequest, NextResponse } from 'next/server';
import { createVouchRequest } from '@/app/airdrop';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const result = await createVouchRequest(formData);
    
    return new NextResponse(result);
  } catch (error) {
    console.error('Error in create-vouch-request API:', error);
    return new NextResponse('An error occurred while processing your request', { status: 500 });
  }
} 