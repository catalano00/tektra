// app/api/quality-issue/route.ts

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const QualityIssueSchema = z.object({
  componentId: z.string().uuid(),
  componentCode: z.string(),
  process: z.string(),
  issueCode: z.string(),
  engineeringAction: z.string().optional(),
  notes: z.string().optional(),
  training: z.string().optional(),
  teamLead: z.string().optional(),
  workstation: z.string().optional(),
  warehouse: z.string().optional(),
});

// ✅ POST
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = QualityIssueSchema.safeParse(json);
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
      teamLead,
      workstation,
      warehouse,
    } = parsed.data;

    const OPERATION_ORDER = ['Cut', 'Assemble', 'Fly', 'Ship'] as const;
    const currentIndex = OPERATION_ORDER.indexOf(process as typeof OPERATION_ORDER[number]);
    const nextProcess = OPERATION_ORDER[currentIndex + 1];

    // ✅ If it's the last process ('Ship'), skip creating a next time entry
    if (!nextProcess) {
      console.info(`✅ Component ${componentId} has completed all operations.`);
      return NextResponse.json({ message: 'All processes complete' }, { status: 200 });
    }

    // ✅ Prevent duplicate creation
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
  } catch (error) {
    console.error('❌ POST /api/v1/time-entry error:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });

    return NextResponse.json({ error: 'Failed to create next time entry' }, { status: 500 });
  }
}