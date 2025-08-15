import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/*
POST body: { capacities: [{ projectId?: string|null; weekKey: string; capacitySqFt: number }] }
projectId omitted or null => global capacity
Upsert each (projectId, weekKey)
*/

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(()=>({}));
    const capacities: { projectId?: string|null; weekKey: string; capacitySqFt: number }[] = Array.isArray(json.capacities) ? json.capacities : [];
    if (!capacities.length) return NextResponse.json({ upserted: 0 });

    const delegate: any = (prisma as any).projectWeekCapacity || (prisma as any).projectWeekCapacities;
    await prisma.$transaction(async (tx: any) => {
      for (const c of capacities) {
        if (!c.weekKey || typeof c.capacitySqFt !== 'number') continue;
        const projectId = c.projectId ?? null;
        await (tx.projectWeekCapacity || tx.projectWeekCapacities).upsert({
          where: { projectId_weekKey: { projectId, weekKey: c.weekKey } },
          update: { capacitySqFt: c.capacitySqFt },
          create: { projectId, weekKey: c.weekKey, capacitySqFt: c.capacitySqFt },
        });
      }
    });
    return NextResponse.json({ upserted: capacities.length });
  } catch (err) {
    console.error('❌ [CAPACITY POST ERROR]', err);
    return NextResponse.json({ error: 'Failed to upsert capacities' }, { status: 500 });
  }
}
