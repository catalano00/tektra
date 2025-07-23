import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfWeek, formatISO } from 'date-fns';

export async function GET() {
  try {
    // Get all components with a completedAt date and componentsqft value
    const components = await prisma.component.findMany({
      where: { completedAt: { not: null }, componentsqft: { not: null } },
      select: { completedAt: true, componentsqft: true },
    });

    // Group sqft by week
    const weekMap: Record<string, number> = {};
    for (const c of components) {
      if (!c.completedAt || !c.componentsqft) continue;
      const week = formatISO(startOfWeek(new Date(c.completedAt)), { representation: 'date' });
      weekMap[week] = (weekMap[week] || 0) + Number(c.componentsqft);
    }

    // Format for chart: [{ week: '2025-07-01', sqft: 1200 }, ...]
    const result = Object.entries(weekMap)
      .map(([week, sqft]) => ({ week, sqft }))
      .sort((a, b) => a.week.localeCompare(b.week));

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch sqft per week' }, { status: 500 });
  }
}