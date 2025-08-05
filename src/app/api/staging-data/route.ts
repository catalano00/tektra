import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const stagingData = await prisma.stagingData.findMany({
      where: { status: 'pending' }, // Fetch only pending entries
    });

    return new NextResponse(JSON.stringify(stagingData), { status: 200 });
  } catch (error) {
    console.error('Error fetching staging data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}