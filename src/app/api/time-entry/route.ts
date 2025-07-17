import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// 🔐 Shared constants
const OPERATION_ORDER = ['Cut', 'Assemble', 'Fly', 'Ship'] as const;

// ✅ Zod Schemas
const STATUS_VALUES = ['pending', 'complete', 'paused'] as const;
const StatusEnum = z.enum(STATUS_VALUES);

const OperationEnum = z.enum(OPERATION_ORDER);

// ✅ GET
const GetQuerySchema = z.object({
  componentId: z.string().min(1),
});

// ✅ PUT — all Prisma-required fields should be required here
const PutBodySchema = z.object({
  componentId: z.string().min(1),
  componentCode: z.string().optional(),
  process: OperationEnum,
  status: StatusEnum,
  duration: z.number().optional(),
  workstation: z.string().min(1),
  teamLead: z.string().min(1),
  warehouse: z.string().min(1),
});

// ✅ POST — values used to create the next entry
const PostBodySchema = z.object({
  componentId: z.string().min(1),
  componentCode: z.string().optional(),
  currentProcess: OperationEnum,
  teamLead: z.string().min(1),
  workstation: z.string().min(1),
  warehouse: z.string().min(1),
});

// ✅ GET
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = GetQuerySchema.safeParse({
      componentId: searchParams.get('componentId'),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Missing or invalid componentId' }, { status: 400 });
    }

    const entries = await prisma.timeEntry.findMany({
      where: { componentId: parsed.data.componentId },
      orderBy: { updatedAt: 'asc' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('❌ GET /api/v1/time-entry error:', error);
    return NextResponse.json({ error: 'Failed to retrieve entries' }, { status: 500 });
  }
}

// ✅ PUT
export async function PUT(req: Request) {
  try {
    const json = await req.json();

    const parsed = PutBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      componentId,
      componentCode,
      process,
      status,
      duration,
      workstation,
      teamLead,
      warehouse,
    }: z.infer<typeof PutBodySchema> = parsed.data;

    const durationInSeconds = Number.isFinite(duration) ? Math.round(Number(duration)) : 0;

    // 🔍 Check for existing entry
    const existingEntry = await prisma.timeEntry.findFirst({
      where: { componentId, process },
    });

    // ✅ Build update and create payloads safely
    const createData: any = {
      componentId,
      process,
      status,
      duration: durationInSeconds,
      workstation,
      teamLead,
      warehouse,
    };

    const updateData: any = {
      status,
      duration: durationInSeconds,
      workstation,
      teamLead,
      warehouse,
      updatedAt: new Date(),
    };

    if (componentCode) {
      createData.componentCode = componentCode;
      updateData.componentCode = componentCode;
    }

    let entry;
    if (existingEntry) {
      entry = await prisma.timeEntry.update({
        where: { id: existingEntry.id },
        data: updateData,
      });
    } else {
      entry = await prisma.timeEntry.create({
        data: createData,
      });
    }

    // ✅ Update component status if completed
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

    return NextResponse.json(entry);
  } catch (error) {
    console.error('❌ PUT /api/time-entry error:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
  }
}

// ✅ POST
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = PostBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', issues: parsed.error.format() }, { status: 400 });
    }

    const {
      componentId,
      componentCode = '',
      currentProcess,
      teamLead,
      workstation,
      warehouse,
    } = parsed.data;

    const currentIndex = OPERATION_ORDER.indexOf(currentProcess);
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
      return NextResponse.json({ message: 'Next process already exists' });
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
  } catch (error) {
    console.error('❌ POST /api/v1/time-entry error:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });

    return NextResponse.json({ error: 'Failed to create next time entry' }, { status: 500 });
  }
}
