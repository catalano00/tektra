import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '7');

    const entries = await prisma.timeEntry.findMany({
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        component: true,
      },
    });

    const activities = entries.map(entry => ({
      id: entry.id,
      componentId: entry.component?.componentId ?? entry.componentId,
      process: entry.process,
      status: entry.status,
      teamLead: entry.teamLead ?? 'N/A',
      updatedAt: entry.updatedAt,
      timestamp: entry.updatedAt, // used by dashboard
    }));

    return NextResponse.json({ activities });
  } catch (err) {
    console.error('❌ GET /api/activity error:', err);
    return NextResponse.json({ error: 'Failed to fetch activity feed' }, { status: 500 });
  }
}