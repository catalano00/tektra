import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/getSessionUser';

const FEATURES = [
  'dashboard',
  'operatorPanel',
  'projects',
  'components',
  'sales',
  'activity',
  'quality',
  'productionPlanning',
  'dataReview',
  'usersAdmin'
];

// GET returns full matrix
export async function GET() {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (u.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const rows = await (prisma as any).featurePermission.findMany();
  return NextResponse.json({ permissions: rows, features: FEATURES });
}

// PATCH updates or creates a permission toggle
export async function PATCH(req: Request) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (u.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'INVALID_JSON'},{ status:400}); }
  const { feature, role, allowed } = body || {};
  if (!feature || !role || typeof allowed !== 'boolean') return NextResponse.json({ error: 'MISSING_FIELDS' }, { status:400 });
  try {
    const updated = await (prisma as any).featurePermission.upsert({
      where: { feature_role: { feature, role } },
      update: { allowed },
      create: { feature, role, allowed },
    });
    return NextResponse.json({ permission: updated });
  } catch (e:any) {
    return NextResponse.json({ error: 'UPSERT_FAILED' }, { status:500 });
  }
}
