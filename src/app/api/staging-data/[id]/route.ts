import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Ensure Prisma is properly configured

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
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