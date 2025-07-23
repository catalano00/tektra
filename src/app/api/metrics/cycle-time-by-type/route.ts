import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get all time entries with their component type
    const timeEntries = await prisma.timeEntry.findMany({
      select: {
        duration: true,
        component: {
          select: {
            componentType: true,
          },
        },
      },
    });

    // Aggregate durations by componentType
    const typeMap: Record<string, { total: number; count: number }> = {};
    for (const entry of timeEntries) {
      const type = entry.component?.componentType ?? 'Unknown';
      if (!typeMap[type]) typeMap[type] = { total: 0, count: 0 };
      typeMap[type].total += entry.duration;
      typeMap[type].count += 1;
    }

    // Format for chart
    const result = Object.entries(typeMap).map(([type, { total, count }]) => ({
      type,
      avgCycleTime: count ? Math.round(total / count) : 0,
    }));

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch cycle time by type' }, { status: 500 });
  }
}