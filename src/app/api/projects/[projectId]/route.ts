import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Extract the projectId from the URL
    const url = new URL(req.url);
    const projectId = url.pathname.split('/').pop(); // Extract the last part of the URL

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { projectId },
      select: {
        projectId: true,
        currentStatus: true,
        client: true,
        city: true,
        state: true,
        streetaddress: true,
        contractAmount: true,
        totalContract: true,
        buildableSqFt: true,
        estimatedPanelSqFt: true,
        expectedDrawingStart: true,
        expectedProductionStart: true,
        expectedProductionCompletion: true,
        notes: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (err) {
    console.error('❌ [PROJECT FETCH ERROR]', err);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}