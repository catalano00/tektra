import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const componentId = searchParams.get('componentId');

    if (!componentId) {
      return NextResponse.json({ error: 'Missing componentId' }, { status: 400 });
    }

    const entries = await prisma.timeEntry.findMany({
      where: { componentId },
      orderBy: { updatedAt: 'asc' },
    });

    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('GET /api/time-entry error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to retrieve entries' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const {
      componentId,
      componentCode,
      process,
      status,
      duration,
      workstation,
      teamLead,
      warehouse,
    } = body;

    if (!componentId || !process || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const durationInSeconds = Number.isFinite(duration) ? Math.round(Number(duration)) : 0;
    if (isNaN(durationInSeconds)) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
    }

    console.log('⏱️ Saving time entry:', {
      componentId,
      componentCode,
      process,
      status,
      durationInSeconds,
      workstation,
      teamLead,
      warehouse,
    });

    const entry = await prisma.timeEntry.upsert({
      where: {
        componentId_process: {
          componentId,
          process,
        },
      },
      update: {
        status,
        duration: durationInSeconds,
        workstation,
        teamLead,
        componentCode,
        warehouse,
        updatedAt: new Date(),
      },
      create: {
        componentId,
        componentCode,
        process,
        status,
        duration: durationInSeconds,
        workstation,
        teamLead,
        warehouse,
      },
    });

    if (status === 'complete') {
      const allCompleted = await prisma.timeEntry.findMany({
        where: { componentId, status: 'complete' },
        select: { process: true },
      });

      const completedProcesses = allCompleted.map(e => e.process);
      const percentComplete = Math.round((completedProcesses.length / 4) * 100);

      const statusMap: Record<string, string> = {
        Cut: 'Cutting Complete',
        Assemble: 'Framing Complete',
        Fly: 'Ready to Ship',
        Ship: 'Delivered',
      };

      const lastProcess = completedProcesses.at(-1) ?? '';
      const currentStatus = statusMap[lastProcess] || 'In Progress';

      await prisma.component.update({
        where: { id: componentId },
        data: {
          lastCompletedProcess: lastProcess,
          percentComplete,
          currentStatus,
          teamLead,
        },
      });
    }

    return NextResponse.json(entry, { status: 200 });
  } catch (error: any) {
    console.error('❌ PUT /api/time-entry error:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      componentId,
      componentCode,
      currentProcess,
      teamLead,
      workstation,
      warehouse,
    } = body;

    if (!componentId || !componentCode || !currentProcess || !warehouse) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const OPERATION_ORDER = ['Cut', 'Assemble', 'Fly', 'Ship'] as const;
    const currentIndex = OPERATION_ORDER.indexOf(currentProcess);
    if (currentIndex === -1) {
      return NextResponse.json({ error: 'Invalid currentProcess value' }, { status: 400 });
    }

    const nextProcess = OPERATION_ORDER[currentIndex + 1];
    if (!nextProcess) {
      console.info(`✅ Component ${componentId} has completed all operations.`);
      return NextResponse.json({ message: 'All processes complete' }, { status: 204 });
    }

    const existing = await prisma.timeEntry.findFirst({
      where: {
        componentId,
        process: nextProcess,
      },
    });

    if (existing) {
      console.info(`ℹ️ Next process '${nextProcess}' already exists for component ${componentId}.`);
      return NextResponse.json({ message: 'Next process already exists' }, { status: 200 });
    }

    const newEntry = await prisma.timeEntry.create({
      data: {
        componentId,
        componentCode,
        process: nextProcess,
        status: 'pending',
        duration: 0,
        teamLead,
        workstation,
        warehouse,
      },
    });

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST /api/time-entry error:', {
      message: error.message,
      stack: error.stack,
    });

    return NextResponse.json({ error: 'Failed to create next time entry' }, { status: 500 });
  }
}
