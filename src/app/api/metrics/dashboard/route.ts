// /app/api/metrics/dashboard/route.ts

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [totalProjects, activeComponents, completedPanels, avgCycleTime] = await Promise.all([
      prisma.project.count(),
      prisma.component.count({
        where: {
          currentStatus: {
            contains: 'Pending', // or use a specific status value if you store `pending` differently
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
    ])

    return NextResponse.json({
      totalProjects,
      activeComponents,
      completedPanels,
      avgCycleTime: avgCycleTime._avg.duration ? Math.round(avgCycleTime._avg.duration) : 0,
    })
  } catch (err) {
    console.error('[DASHBOARD METRICS ERROR]', err)
    return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 })
  }
}
