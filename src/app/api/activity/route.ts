import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  try {
    const recentActivity = await prisma.timeEntry.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        componentCode: true,
        process: true,
        status: true,
        teamLead: true,
        updatedAt: true,
      },
    });

    const normalized = recentActivity.map((entry) => ({
      componentId: entry.componentCode,
      process: entry.process,
      status: entry.status,
      teamLead: entry.teamLead,
      timestamp: entry.updatedAt.toISOString(), // serialize
    }));

    return NextResponse.json(normalized);
  } catch (err) {
    console.error('[ACTIVITY FEED ERROR]', err);
    return NextResponse.json({ error: 'Failed to load activity feed' }, { status: 500 });
  }
}