import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

type Process = 'Cut' | 'Assemble' | 'Fly' | 'Ship';
const PROCESS_ORDER: Process[] = ['Cut', 'Assemble', 'Fly', 'Ship'];

// ✅ Validate query param
const QuerySchema = z.object({
  projectId: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const parsed = QuerySchema.safeParse({
      projectId: searchParams.get('projectId'),
    });

    if (!parsed.success) {
      console.warn('[COMPONENTS INVALID QUERY]', parsed.error.format());
      return NextResponse.json(
        { error: 'Invalid or missing projectId', issues: parsed.error.format() },
        { status: 400 }
      );
    }

    const { projectId } = parsed.data;

    const components = await prisma.component.findMany({
      where: { projectId },
      include: {
        timeEntries: true,
      },
      orderBy: { componentId: 'asc' },
    });

    const enrichedComponents = components.map((component) => {
      const completeEntries = component.timeEntries.filter((e) => e.status === 'complete');

      const completedProcesses = new Set(
        completeEntries
          .map((e) => e.process as Process)
          .filter((p): p is Process => PROCESS_ORDER.includes(p))
      );

      const totalCycleTime = completeEntries.reduce(
        (sum, e) => sum + (e.duration || 0),
        0
      );

      const lastCompletedProcess =
        [...PROCESS_ORDER].reverse().find((p) => completedProcesses.has(p)) || '';

      const nextProcess =
        component.currentStatus === 'Delivered'
          ? ''
          : PROCESS_ORDER.find((p) => !completedProcesses.has(p)) || '';

      return {
        ...component,
        totalCycleTime,
        lastCompletedProcess,
        nextProcess,
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
        currentStatus: true,
      },
    });

    return NextResponse.json({ project, components: enrichedComponents });
  } catch (err) {
    console.error('❌ [COMPONENTS GET ERROR]', {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });

    return NextResponse.json({ error: 'Failed to load components' }, { status: 500 });
  }
}