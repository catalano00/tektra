import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/*
POST body: { assignments: [{ componentId: string; weekKey: string | null }] }
- weekKey null => delete existing schedule (unschedule)
- Upsert per componentId
*/

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(()=>({}));
    const assignments: { componentId: string; weekKey: string | null }[] = Array.isArray(json.assignments) ? json.assignments : [];
    if (!assignments.length) return NextResponse.json({ updated: 0 });

    // Fetch components to validate ids
    const componentIds = assignments.map(a => a.componentId);
    const existing = await prisma.component.findMany({ where: { id: { in: componentIds } }, select: { id: true, projectId: true } });
    const existingMap = new Map(existing.map(c => [c.id, c.projectId] as const));

    // Execute sequentially within a transaction to ensure consistency
    await prisma.$transaction(async (tx: any) => {
      for (const a of assignments) {
        const proj = existingMap.get(a.componentId);
        if (!proj) continue;
        if (!a.weekKey) {
          await (tx.componentSchedule || tx.componentSchedules).deleteMany({ where: { componentId: a.componentId } });
        } else {
          await (tx.componentSchedule || tx.componentSchedules).upsert({
            where: { componentId: a.componentId },
            update: { weekKey: a.weekKey },
            create: { componentId: a.componentId, projectId: proj, weekKey: a.weekKey },
          });
        }
      }
    });

    return NextResponse.json({ updated: assignments.length });
  } catch (err) {
    console.error('❌ [ASSIGNMENTS POST ERROR]', err);
    return NextResponse.json({ error: 'Failed to update assignments' }, { status: 500 });
  }
}
