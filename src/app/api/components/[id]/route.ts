// /app/api/components/[id]/route.ts

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const component = await prisma.component.findUnique({
      where: { id: params.id },
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

    return NextResponse.json(component)
  } catch (err) {
    console.error('[COMPONENT GET ERROR]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()

    const updated = await prisma.component.update({
      where: { id: params.id },
      data: {
        currentStatus: body.currentStatus,
        completedAt: body.completedAt ?? undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[COMPONENT PUT ERROR]', err)
    return NextResponse.json({ error: 'Failed to update component' }, { status: 500 })
  }
}
