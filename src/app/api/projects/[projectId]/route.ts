import { prisma } from '@/lib/prisma';import { NextRequest, NextResponse } from 'next/server';export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {  try {    const { projectId } = params;    const project = await prisma.project.findUnique({      where: { projectId },      select: {        projectId: true,        currentStatus: true,        client: true,        city: true,        state: true,        streetaddress: true,
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