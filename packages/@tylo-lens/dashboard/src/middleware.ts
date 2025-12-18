import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'tylo_demo_token';

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.svg' ||
    pathname.startsWith('/public/')
  );
}

export function middleware(req: NextRequest) {
  const token = process.env.TYLO_LENS_DEMO_TOKEN;
  if (!token) return NextResponse.next();

  const pathname = req.nextUrl.pathname;
  if (isPublicAsset(pathname)) return NextResponse.next();

  const fromCookie = req.cookies.get(COOKIE_NAME)?.value;
  const fromQuery = req.nextUrl.searchParams.get('token');

  if (fromCookie === token || fromQuery === token) {
    const res = NextResponse.next();
    if (fromQuery === token && fromCookie !== token) {
      res.cookies.set(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', path: '/' });
    }
    return res;
  }

  return new NextResponse('Unauthorized. Provide ?token=... to access this demo.', {
    status: 401,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};

