import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

function resolveId(req: NextRequest, params: any): string | undefined {
  if (params?.id) return params.id;
  const qp = req.nextUrl.searchParams.get('id');
  if (qp) return qp;
  const parts = req.nextUrl.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

export async function GET(req: NextRequest, context: any) {
  try {
    const id = resolveId(req, context?.params);
    if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    const stagingData = await prisma.stagingData.findUnique({ where: { id } });
    if (!stagingData) return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    return NextResponse.json(stagingData);
  } catch (error) {
    console.error('Error fetching staging data:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: any) {
  try {
    const session = await getServerSession(authOptions as any) as any;
    if (!session?.user?.email) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const userEmail = session.user.email as string;

    const id = resolveId(req, context?.params);
    if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    if (body.rawData === undefined) return NextResponse.json({ error: 'rawData is required' }, { status: 400 });

    const audit: any = {};
    if (body.status === 'approved') {
      audit.approvedAt = new Date();
      audit.approvedBy = userEmail;
    } else if (body.status === 'rejected') {
      audit.rejectedAt = new Date();
      audit.rejectedBy = userEmail;
    }

    const updatedData = await prisma.stagingData.update({
      where: { id },
      data: { rawData: body.rawData, status: body.status || 'reviewed', ...audit },
    });
    return NextResponse.json(updatedData);
  } catch (error: any) {
    console.error('Error updating staging data:', error);
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}