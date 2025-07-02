import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [
      totalProjects,
      activeComponents,
      completedPanels,
      avgCycleTimeRaw,
    ] = await Promise.all([
      prisma.project.count(),

      prisma.component.count({
        where: {
          currentStatus: {
            contains: 'Pending', // You can tighten this if needed
          },
        },
      }),

      prisma.component.count({
        where: {
          currentStatus: 'Delivered',
        },
      }),

      prisma.timeEntry.aggregate({
        _avg: {
          duration: true,
        },
        where: {
          status: 'complete',
        },
      }),
    ]);

    const avgCycleTime = Math.round(avgCycleTimeRaw._avg?.duration || 0);

    return NextResponse.json({
      totalProjects,
      activeComponents,
      completedPanels,
      avgCycleTime,
    });
  } catch (err) {
    console.error('❌ [DASHBOARD METRICS ERROR]', {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });

    return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 });
  }
}