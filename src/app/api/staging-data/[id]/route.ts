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

// Next.js Route Handler expects (req: NextRequest)
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  try {
    const id = resolveId(req, context?.params);
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    // Fetch the staging data by ID
    const stagingData = await prisma.stagingData.findUnique({
      where: { id },
    });

    if (!stagingData) {
      return new NextResponse(JSON.stringify({ error: 'Data not found' }), { status: 404 });
    }

    return new NextResponse(JSON.stringify(stagingData), { status: 200 });
  } catch (error) {
    console.error('Error fetching staging data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  try {
    const id = resolveId(req, context?.params);
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }
    const body = await req.json();

    // Update the staging data
    const updatedData = await prisma.stagingData.update({
      where: { id },
      data: {
        rawData: body.rawData,
        status: body.status || 'reviewed',
      },
    });

    return new NextResponse(JSON.stringify(updatedData), { status: 200 });
  } catch (error) {
    console.error('Error updating staging data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if ((error as any)?.code === 'P2025') { // Prisma record not found
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}