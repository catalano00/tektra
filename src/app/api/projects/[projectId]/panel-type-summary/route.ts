import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.pathname.split('/')[4] // or use a more robust path parser

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    // Run your query here using `projectId`
    const summary = await prisma.component.groupBy({
      by: ['componentType'],
      where: { projectId },
      _count: true,
    })

    return NextResponse.json(summary)
  } catch (err) {
    console.error('[PANEL TYPE SUMMARY ERROR]', err)
    return NextResponse.json({ error: 'Failed to get panel type summary' }, { status: 500 })
  }
}