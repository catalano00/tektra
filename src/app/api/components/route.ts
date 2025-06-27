import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type Process = 'Cut' | 'Assemble' | 'Fly' | 'Ship';

const PROCESS_ORDER: Process[] = ['Cut', 'Assemble', 'Fly', 'Ship'];


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const components = await prisma.component.findMany({
      where: { projectId },
      include: {
        timeEntries: true,
      },
      orderBy: { componentId: 'asc' },
    });

    // Enhance each component with totalCycleTime, lastCompletedProcess, and nextProcess
    const enrichedComponents = components.map(component => {
      const completeEntries = component.timeEntries.filter(e => e.status === 'complete');
      const completedProcesses = new Set(
        completeEntries
          .map(e => e.process as Process)
        .filter(p => PROCESS_ORDER.includes(p))
      );
      const totalCycleTime = completeEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
      const lastCompletedProcess = [...PROCESS_ORDER].reverse().find(p => completedProcesses.has(p)) || '';
      const nextProcess = component.currentStatus === 'Delivered'
        ? ''
        : PROCESS_ORDER.find(p => !completedProcesses.has(p)) || '';

      return {
        ...component,
        totalCycleTime,
        lastCompletedProcess,
        nextProcess
      };
    });

    const project = await prisma.project.findUnique({
      where: { projectId },
      select: {
        projectId: true,
        streetaddress: true,
        city: true,
        state: true,
        zipcode: true,
        buildableSqFt: true,
        estimatedPanelSqFt: true,
        expectedDrawingStart: true,
        expectedProductionCompletion: true,
        expectedProductionStart: true,
        currentStatus: true
      },
    });

    return NextResponse.json({ project, components: enrichedComponents });
  } catch (err) {
    console.error('[COMPONENTS GET ERROR]', err);
    return NextResponse.json({ error: 'Failed to load components' }, { status: 500 });
  }
}