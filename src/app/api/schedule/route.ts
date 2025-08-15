import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Utility: ISO week key YYYY-Www
function isoWeekKey(date: Date) {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // shift to Thursday
  tmp.setUTCDate(tmp.getUTCDate() + 3 - ((tmp.getUTCDay() + 6) % 7));
  const week1 = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const weekNo = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function startOfISOWeek(d: Date) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  if (day !== 1) date.setUTCDate(date.getUTCDate() - (day - 1));
  return date;
}
function addDays(date: Date, days: number) { const d = new Date(date); d.setUTCDate(d.getUTCDate() + days); return d; }

const HORIZON_WEEKS = 20;
const DEFAULT_CAPACITY = 15000; // fallback when no capacity row

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId') || null;

    // Fetch components first WITHOUT relation include (client not yet regenerated). After prisma generate we can switch back.
    const components = await prisma.component.findMany({
      where: projectId ? { projectId } : undefined,
      // include: { schedule: true }, // <-- enable after prisma generate
      orderBy: [ { projectId: 'asc' }, { sequence: 'asc' }, { componentId: 'asc' } ]
    });

    // Dynamically fetch schedules using any delegate (pre-generation fallback)
    const scheduleDelegate: any = (prisma as any).componentSchedule || (prisma as any).componentSchedules;
    let schedules: any[] = [];
    if (scheduleDelegate) {
      const compIds = components.map(c => c.id);
      if (compIds.length) {
        schedules = await scheduleDelegate.findMany({ where: { componentId: { in: compIds } } });
      }
    }
    const scheduleMap = new Map(schedules.map(s => [s.componentId, s.weekKey] as const));

    const panels = components.map(c => ({
      id: c.id,
      componentId: c.componentId,
      projectId: c.projectId,
      sequence: (c as any).sequence,
      componentType: c.componentType,
      componentsqft: (c as any).componentsqft ?? null,
      currentStatus: (c as any).currentStatus ?? null,
      scheduledWeek: scheduleMap.get(c.id) || null,
    }));

    // Capacities via dynamic delegate (projectWeekCapacity not yet typed before generate)
    const capacityDelegate: any = (prisma as any).projectWeekCapacity || (prisma as any).projectWeekCapacities;
    const capacities: any[] = capacityDelegate ? await capacityDelegate.findMany({
      where: projectId ? { OR: [ { projectId }, { projectId: null } ] } : undefined,
    }) : [];

    // Build week horizon starting current week
    const start = startOfISOWeek(new Date());
    const weeks: { weekKey: string; capacitySqFt: number; source: 'project' | 'global' | 'default' }[] = [];
    for (let i=0;i<HORIZON_WEEKS;i++) {
      const ws = addDays(start, i*7);
      const weekKey = isoWeekKey(ws);
      // Determine effective capacity precedence: project > global > default
      let capacitySqFt = DEFAULT_CAPACITY;
      let source: 'project'|'global'|'default' = 'default';
      if (projectId) {
        const projectCap = capacities.find((c: any) => c.projectId === projectId && c.weekKey === weekKey);
        if (projectCap) { capacitySqFt = projectCap.capacitySqFt; source = 'project'; }
        else {
          const globalCap = capacities.find((c: any) => c.projectId === null && c.weekKey === weekKey);
          if (globalCap) { capacitySqFt = globalCap.capacitySqFt; source = 'global'; }
        }
      } else {
        const globalCap = capacities.find((c: any) => c.projectId === null && c.weekKey === weekKey);
        if (globalCap) { capacitySqFt = globalCap.capacitySqFt; source = 'global'; }
      }
      weeks.push({ weekKey, capacitySqFt, source });
    }

    return NextResponse.json({ panels, capacities: capacities.map(c => ({ id: c.id, projectId: c.projectId, weekKey: c.weekKey, capacitySqFt: c.capacitySqFt })), weeks, defaultCapacity: DEFAULT_CAPACITY });
  } catch (err) {
    console.error('❌ [SCHEDULE GET ERROR]', err);
    return NextResponse.json({ error: 'Failed to load schedule' }, { status: 500 });
  }
}
