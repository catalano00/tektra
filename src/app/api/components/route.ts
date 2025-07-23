// app/api/components/route.ts

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const components = await prisma.component.findMany({
      where: { projectId },
      include: {
        part: true,
        sheathing: true,
        timeEntries: true,
      },
    });

    return NextResponse.json({ components });
  } catch (err) {
    console.error('❌ /api/components error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}