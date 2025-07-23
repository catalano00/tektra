import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfWeek, formatISO } from 'date-fns';

export async function GET() {
  try {
    // Get all components with a dateshipped date and componentsqft value
    const components = await prisma.component.findMany({
      where: { dateshipped: { not: null }, componentsqft: { not: null } },
      select: { dateshipped: true, componentsqft: true },
    });

    // Group sqft and count by week
    const weekMap: Record<string, { sqft: number; count: number }> = {};
    for (const c of components) {
      if (!c.dateshipped || !c.componentsqft) continue;
      const week = formatISO(startOfWeek(new Date(c.dateshipped)), { representation: 'date' });
      if (!weekMap[week]) weekMap[week] = { sqft: 0, count: 0 };
      weekMap[week].sqft += Number(c.componentsqft);
      weekMap[week].count += 1;
    }

    // Format for chart: [{ week: '2025-07-01', sqft: 1200, count: 5 }, ...]
    const result = Object.entries(weekMap)
      .map(([week, { sqft, count }]) => ({ week, sqft, count }))
      .sort((a, b) => a.week.localeCompare(b.week));

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch sqft per week' }, { status: 500 });
  }
}