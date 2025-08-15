// app/api/components/route.ts

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId');

    let components;
    if (projectId) {
      components = await prisma.component.findMany({
        where: { projectId },
        include: {
          part: true,
          sheathing: true,
          connectors: true,
          framingTL: true,
          timeEntries: true,
        },
      });
    } else {
      // Fetch all components (limit optional in future)
      components = await prisma.component.findMany({
        include: {
          part: true,
          sheathing: true,
          connectors: true,
          framingTL: true,
          timeEntries: true,
        },
        orderBy: { projectId: 'asc' },
      });
    }

    return NextResponse.json({ components });
  } catch (err) {
    console.error('❌ /api/components error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}