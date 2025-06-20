import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const OPERATION_ORDER = ['Cut', 'Assemble', 'Fly', 'Ship']

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    console.log('Incoming time entry data:', data)

    // Check for paused entry first
    const existingPaused = await prisma.timeEntry.findFirst({
      where: {
        componentId: data.componentId,
        process: data.process,
        status: 'paused',
      },
    })

    let entry
    if (existingPaused) {
      entry = await prisma.timeEntry.update({
        where: { id: existingPaused.id },
        data: {
          status: 'complete',
          duration: data.duration,
        },
      })
    } else {
      entry = await prisma.timeEntry.create({ data })
    }

    // Fetch updated complete entries
    const entries = await prisma.timeEntry.findMany({
      where: {
        componentId: data.componentId,
        status: 'complete',
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    const totalCycleTime = entries.reduce((acc, e) => acc + e.duration, 0)
    const lastCompletedProcess = entries.length ? entries[entries.length - 1].process : null

    const lastIndex = OPERATION_ORDER.findIndex(p => p === lastCompletedProcess)
    const nextProcess = lastIndex < OPERATION_ORDER.length - 1 ? OPERATION_ORDER[lastIndex + 1] : null
    const percentComplete = ((lastIndex + 1) / OPERATION_ORDER.length) * 100
    const isComplete = lastCompletedProcess === 'Ship'

    await prisma.component.update({
      where: { id: data.componentId },
      data: {
        currentStatus: isComplete ? 'Complete' : `In Production (${lastCompletedProcess})`,
        completedAt: isComplete ? new Date() : null,
        lastCompletedProcess,
        nextProcess,
        percentComplete,
        totalCycleTime,
        processStatus: 'complete',
        workstation: data.workstation,
        teamLead: data.teamLead,
      },
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('POST /api/time-entry error:', error)
    return new NextResponse('Failed to create or resume time entry', { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const componentId = searchParams.get('componentId')
    if (!componentId) {
      return new NextResponse('Missing componentId', { status: 400 })
    }

    const entries = await prisma.timeEntry.findMany({
      where: { componentId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('GET /api/time-entry error:', error)
    return new NextResponse('Failed to fetch entries', { status: 500 })
  }
}
