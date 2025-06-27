// /app/api/components/[id]/route.ts

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop()

    if (!id) {
      return NextResponse.json({ error: 'Missing component ID' }, { status: 400 })
    }

    const component = await prisma.component.findUnique({
      where: { id },
      include: {
        project: true,
        partList: true,
        sheathing: true,
        timeEntries: true,
      },
    })

    if (!component) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 })
    }

    const { id: componentId, ...rest } = component
    return NextResponse.json({ ...rest, componentId })
  } catch (err) {
    console.error('[COMPONENT GET ERROR]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    const updated = await prisma.component.update({
      where: { id: params.id },
      data: {
        currentStatus: body.currentStatus,
        completedAt: body.completedAt ?? undefined,
        lastCompletedProcess: body.lastCompletedProcess ?? undefined,
        nextProcess: body.nextProcess ?? undefined,
        processStatus: body.processStatus ?? undefined,
        percentComplete: body.percentComplete ?? undefined,
        totalCycleTime: body.totalCycleTime ?? undefined,
        workstation: body.workstation ?? undefined,
        teamLead: body.teamLead ?? undefined,
},
    });

    // Ensure consistent format on response too
    const { id, ...rest } = updated;
    const formattedUpdated = {
      ...rest,
      componentId: id,
    };

    return NextResponse.json(formattedUpdated);
  } catch (err) {
    console.error('[COMPONENT PUT ERROR]', err);
    return NextResponse.json({ error: 'Failed to update component' }, { status: 500 });
  }
}
