// /app/api/projects/route.ts

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const FilterSchema = z.object({
  filter: z
    .preprocess(
      (val) => (val === null || val === '' ? undefined : val),
      z.enum(['all', 'active', 'completed']).default('active')
    ),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = FilterSchema.safeParse({
      filter: searchParams.get('filter'),
    });

    if (!parsed.success) {
      console.warn('[PROJECTS INVALID QUERY]', parsed.error.format());
      return NextResponse.json(
        { error: 'Invalid query parameters', issues: parsed.error.format() },
        { status: 400 }
      );
    }

    const { filter } = parsed.data;

    let where = {};
    if (filter === 'active') {
      where = {
        currentStatus: { in: ['In Production'] },
      };
    } else if (filter === 'completed') {
      where = {
        currentStatus: { in: ['Delivered', 'Archived'] },
      };
    }

    // Select more fields for frontend use
    const projects = await prisma.project.findMany({
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
      orderBy: { projectId: 'asc' },
    });

    return NextResponse.json(projects);

  } catch (err) {
    console.error('❌ [PROJECTS FETCH ERROR]', err);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}