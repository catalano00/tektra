import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ✅ Param validation
const ParamSchema = z.object({
  id: z.string().min(1),
});

// ✅ Body validation for PUT
const PutBodySchema = z.object({
  currentStatus: z.string().optional(),
  completedAt: z.string().datetime().optional(),
  lastCompletedProcess: z.string().optional(),
  nextProcess: z.string().optional(),
  processStatus: z.string().optional(),
  percentComplete: z.number().int().min(0).max(100).optional(),
  workstation: z.string().optional(),
  teamLead: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop();
    const parsed = ParamSchema.safeParse({ id });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid or missing component ID', issues: parsed.error.format() },
        { status: 400 }
      );
    }

    const component = await prisma.component.findUnique({
      where: { id: parsed.data.id },
      include: {
        project: true,
        partList: true,
        sheathing: true,
        timeEntries: true,
      },
    });

    if (!component) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    }

    const { id: componentId, ...rest } = component;
    return NextResponse.json({ ...rest, componentId });
  } catch (err) {
    console.error('❌ [COMPONENT GET ERROR]', {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const id = req.url.split('/').pop();
    const paramParsed = ParamSchema.safeParse({ id });

    if (!paramParsed.success) {
      return NextResponse.json(
        { error: 'Invalid or missing component ID', issues: paramParsed.error.format() },
        { status: 400 }
      );
    }

    const json = await req.json();
    const bodyParsed = PutBodySchema.safeParse(json);

    if (!bodyParsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: bodyParsed.error.format() },
        { status: 400 }
      );
    }

    const update = await prisma.component.update({
      where: { id: paramParsed.data.id },
      data: {
        ...bodyParsed.data,
      },
    });

    const { id: componentId, ...rest } = update;
    return NextResponse.json({ ...rest, componentId });
  } catch (err) {
    console.error('❌ [COMPONENT PUT ERROR]', {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });

    return NextResponse.json({ error: 'Failed to update component' }, { status: 500 });
  }
}