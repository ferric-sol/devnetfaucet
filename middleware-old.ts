import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const ratelimit = new Ratelimit({
  redis: kv,
  // 5 requests from the same IP in 10 seconds
  limiter: Ratelimit.slidingWindow(2, '10 s'),
});

// Define which routes you want to rate limit
export const config = {
  matcher: '/',
};

function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || '127.0.0.1';
  }

  return request.headers.get('x-real-ip') ?? '127.0.0.1';
}

export default async function middleware(request: NextRequest) {
  if(request.method === 'GET') {
    // You could alternatively limit based on user ID or similar
    const ip = getRequestIp(request);
    await kv.incr(`ip_${ip}`);
    const request_num = await kv.get(`ip_${ip}`);
    console.log(`ip: ${ip} request_num: ${request_num}`);
    return NextResponse.next();
  } else {
    // You could alternatively limit based on user ID or similar
    const ip = getRequestIp(request);
    await kv.incr(`ip_${ip}`);
    const request_num = await kv.get(`ip_${ip}`);
    const { success, pending, limit, reset, remaining } = await ratelimit.limit(
     ip
    );
    console.log(`ip: ${ip} request_num: ${request_num} success: ${success}`);
    return success
    ? NextResponse.next()
    : NextResponse.redirect(new URL('/blocked', request.url));
  }
}
