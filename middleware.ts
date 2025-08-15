import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

// Map pathname prefixes to feature keys used in FeaturePermission
const FEATURE_MAP: { prefix: string; feature: string }[] = [
  { prefix: '/dashboard', feature: 'dashboard' },
  { prefix: '/operator-time', feature: 'operatorPanel' },
  { prefix: '/project-summaries', feature: 'projects' },
  { prefix: '/components', feature: 'components' },
  { prefix: '/sales', feature: 'sales' },
  { prefix: '/activity', feature: 'activity' },
  { prefix: '/quality', feature: 'quality' },
  { prefix: '/production-planning/data-review', feature: 'dataReview' },
  { prefix: '/production-planning', feature: 'productionPlanning' },
  { prefix: '/admin/users', feature: 'usersAdmin' },
  { prefix: '/admin/feature-permissions', feature: 'usersAdmin' }, // reuse admin feature gate
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname.startsWith('/help') || // allow help page unauthenticated
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }
  const role = (token as any).role as string | undefined;

  // Admin always allowed to /admin base; other users blocked
  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Determine feature for path
  const match = FEATURE_MAP.find(m => pathname.startsWith(m.prefix));
  if (match && role) {
    try {
      const perm = await (prisma as any).featurePermission.findUnique({ where: { feature_role: { feature: match.feature, role } }, select: { allowed: true } });
      if (perm && !perm.allowed) {
        return NextResponse.redirect(new URL('/', req.url));
      }
      // default allow if no row
    } catch {
      // on error, fail closed redirect
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|css|js|json|txt)).*)'
  ]
};
