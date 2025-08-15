import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/getSessionUser';

// Update user role (ADMIN only)
export async function PUT(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (sessionUser.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  // Derive id from the pathname (last segment)
  const segments = req.nextUrl.pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];
  if (!id) return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 });

  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const { role } = body || {};
  const allowed = ['ADMIN','PLANNER','ENGINEER','QA','VIEWER','OPERATOR','MANAGER'];
  if (!allowed.includes(role)) return NextResponse.json({ error: 'INVALID_ROLE' }, { status: 400 });

  try {
    const updated = await (prisma as any).user.update({ where: { id }, data: { role } });
    return NextResponse.json({ user: updated });
  } catch (e:any) {
    return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 });
  }
}
