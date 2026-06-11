import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Public API routes
  if (path.startsWith('/api/auth/login')) {
    return NextResponse.next();
  }
  
  // Allow GET /api/people for demo accounts on login page
  if (path === '/api/people' && request.method === 'GET') {
    return NextResponse.next();
  }

  // Protect API routes
  if (path.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
