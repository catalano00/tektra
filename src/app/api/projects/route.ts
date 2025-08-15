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

    const projectsRaw = await prisma.project.findMany({
      select: {
        projectId: true,
        currentStatus: true,
        clientId: true,
        Client: { select: { firstName: true, lastName: true, address: true, city: true, state: true, zip: true } },
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
      where,
      orderBy: { projectId: 'asc' },
    });

    const projects = projectsRaw.map(p => {
      const clientName = p.Client ? `${p.Client.firstName} ${p.Client.lastName}` : '';
      const clientAddressFormatted = p.Client && p.Client.address ? `${p.Client.address}, ${p.Client.city}, ${p.Client.state} ${p.Client.zip}`.replace(/,\s*,/g, ', ').replace(/, \s*$/,'') : '';
      return ({
        projectId: p.projectId,
        currentStatus: p.currentStatus,
        clientId: p.clientId,
        client: clientName,
        clientAddressFormatted,
        city: p.city,
        state: p.state,
        streetaddress: p.streetaddress,
        contractAmount: Number(p.contractAmount),
        totalContract: Number(p.totalContract),
        buildableSqFt: p.buildableSqFt ?? null,
        estimatedPanelSqFt: p.estimatedPanelSqFt ?? null,
        expectedDrawingStart: p.expectedDrawingStart?.toISOString() ?? null,
        expectedProductionStart: p.expectedProductionStart?.toISOString() ?? null,
        expectedProductionCompletion: p.expectedProductionCompletion?.toISOString() ?? null,
        notes: p.notes ?? null,
      });
    });

    return NextResponse.json(projects);

  } catch (err) {
    console.error('❌ [PROJECTS FETCH ERROR]', err);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}