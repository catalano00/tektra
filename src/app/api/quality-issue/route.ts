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
      issueCode,
      engineeringAction,
      notes,
      training,
      teamLead,
      workstation,
      warehouse,
    } = parsed.data;

    // 1. Create the QualityIssue entry
    const qualityIssue = await prisma.qualityIssue.create({
      data: {
        componentId,
        process,
        issueCode,
        engineeringAction,
        notes,
        training,
      },
    });

    // 2. Create the next time entry if not last process
    const OPERATION_ORDER = ['Cut', 'Assemble', 'Fly', 'Ship'] as const;
    const currentIndex = OPERATION_ORDER.indexOf(process as typeof OPERATION_ORDER[number]);
    const nextProcess = OPERATION_ORDER[currentIndex + 1];

    let newEntry = null;

    if (nextProcess) {
      // Prevent duplicate creation
      const existing = await prisma.timeEntry.findFirst({
        where: {
          componentId,
          process: nextProcess,
        },
      });

      if (!existing) {
        newEntry = await prisma.timeEntry.create({
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
      }
    }

    return NextResponse.json(
      { qualityIssue, nextTimeEntry: newEntry },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ POST /api/quality-issue error:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });

    return NextResponse.json({ error: 'Failed to create quality issue or next time entry' }, { status: 500 });
  }
}

// Example GET handler
export async function GET(req: Request) {
  try {
    const qualityIssues = await prisma.qualityIssue.findMany({
      include: {
        component: {
          select: {
            projectId: true,
            componentType: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Flatten and normalize for frontend
    const issues = qualityIssues.map(issue => ({
      id: issue.id,
      componentId: issue.componentId,
      componentCode: issue.componentId ?? '', // Only from QualityIssue, not Component
      componentType: issue.component?.componentType ?? '',
      projectId: issue.component?.projectId ?? '',
      process: issue.process,
      issueCode: issue.issueCode,
      engineeringAction: issue.engineeringAction ?? '',
      notes: issue.notes ?? '',
      training: issue.training ?? '',
      // updatedAt: issue.updatedAt ?? null,
      createdAt: issue.createdAt ?? null,
    }));

    return NextResponse.json({ qualityIssues: issues });
  } catch (error) {
    console.error('❌ GET /api/quality-issue error:', error);
    return NextResponse.json({ qualityIssues: [] }, { status: 500 });
  }
}