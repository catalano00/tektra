import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Ensure Prisma is properly configured

// Helper to extract the id from dynamic route params or fallback query/path
function resolveId(req: NextRequest, params?: { id?: string }): string | undefined {
  if (params?.id) return params.id; // preferred: dynamic segment
  const qp = req.nextUrl.searchParams.get('id');
  if (qp) return qp;
  // Fallback: last path segment
  const parts = req.nextUrl.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

// GET staging data by id (dynamic segment). Context typing relaxed to avoid build errors.
export async function GET(req: NextRequest, { params }: { params: { id?: string } }) {
  try {
    const id = resolveId(req, params);
    if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });

    const stagingData = await prisma.stagingData.findUnique({ where: { id } });
    if (!stagingData) return NextResponse.json({ error: 'Data not found' }, { status: 404 });

    return NextResponse.json(stagingData);
  } catch (error) {
    console.error('Error fetching staging data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Update staging data (rawData + status)
export async function PUT(req: NextRequest, { params }: { params: { id?: string } }) {
  try {
    const id = resolveId(req, params);
    if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    if (body.rawData === undefined) {
      return NextResponse.json({ error: 'rawData is required' }, { status: 400 });
    }

    const updatedData = await prisma.stagingData.update({
      where: { id },
      data: {
        rawData: body.rawData,
        status: body.status || 'reviewed',
      },
    });

    return NextResponse.json(updatedData);
  } catch (error: any) {
    console.error('Error updating staging data:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}