import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/getSessionUser';

// GET /api/admin/users - list users (ADMIN only)
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const users = await (prisma as any).user.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ users });
}

// PUT /api/admin/users - not supported (need id)
export async function PUT() {
  return NextResponse.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}
