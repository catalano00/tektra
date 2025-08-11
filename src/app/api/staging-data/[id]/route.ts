import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Ensure Prisma is properly configured

// Next.js Route Handler expects (req: NextRequest)
export async function GET(req: NextRequest) {
  try {
    let id = req.nextUrl.searchParams.get('id') ?? undefined;
    // If using dynamic route, extract id from pathname:
    // const id = req.nextUrl.pathname.split('/').pop();
    // id will be either string or undefined

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

export async function PUT(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id') ?? undefined;
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
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}