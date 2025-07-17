import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ✅ Param validation
const ParamSchema = z.object({
  id: z.string().uuid('Invalid UUID'),
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

// ✅ GET /api/components/[id]
export async function GET(req: NextRequest): Promise<NextResponse> {
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
    Project: true,
    timeEntries: {
      orderBy: { updatedAt: 'asc' },
    },
    Part: true,
    Sheathing: true,
    Connectors: true,
    FramingTL: true,
    },
    });
    
    if (!component) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    }

    return NextResponse.json({
      componentId: component.id,
      componentCode: component.componentId,
      componentType: component.componentType,
      currentStatus: component.currentStatus,
      designUrl: component.designUrl,
      componentsqft: component.componentsqft,
      percentComplete: component.percentComplete,
      processStatus: component.processStatus,
      lastCompletedProcess: component.lastCompletedProcess,
      nextProcess: component.nextProcess,
      teamLead: component.teamLead,
      updatedAt: component.updatedAt,
      projectName: component.Project?.projectId || 'Unknown',
      sheathing: component.Sheathing,
      timeEntries: component.timeEntries.map((t) => ({
        process: t.process,
        status: t.status,
        teamLead: t.teamLead,
        duration: t.duration,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (err) {
    console.error('❌ [COMPONENT GET ERROR]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ✅ PUT /api/components/[id]
export async function PUT(req: Request): Promise<NextResponse> {
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
      data: { ...bodyParsed.data },
    });

    return NextResponse.json({
      ...update,
    });
  } catch (err) {
    console.error('❌ [COMPONENT PUT ERROR]', err);
    return NextResponse.json({ error: 'Failed to update component' }, { status: 500 });
  }
}