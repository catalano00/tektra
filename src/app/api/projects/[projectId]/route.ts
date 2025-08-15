import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    // Extract the projectId from the URL
    const url = new URL(req.url);
    const projectId = url.pathname.split('/').pop(); // Extract the last part of the URL

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { projectId },
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
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...project,
      client: project.Client ? `${project.Client.firstName} ${project.Client.lastName}` : '',
      clientAddressFormatted: project.Client && project.Client.address ? `${project.Client.address}, ${project.Client.city}, ${project.Client.state} ${project.Client.zip}`.trim() : '',
      contractAmount: Number(project.contractAmount),
      totalContract: Number(project.totalContract),
      expectedDrawingStart: project.expectedDrawingStart?.toISOString() ?? null,
      expectedProductionStart: project.expectedProductionStart?.toISOString() ?? null,
      expectedProductionCompletion: project.expectedProductionCompletion?.toISOString() ?? null,
    });
  } catch (err) {
    console.error('❌ [PROJECT FETCH ERROR]', err);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

const PutBodySchema = z.object({
  clientId: z.string().uuid().optional(),
  streetaddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  contractAmount: z.coerce.number().nonnegative().optional(),
  buildableSqFt: z.coerce.number().int().nonnegative().optional(),
  estimatedPanelSqFt: z.coerce.number().int().nonnegative().optional(),
  expectedDrawingStart: z.string().datetime().optional(),
  expectedProductionStart: z.string().datetime().optional(),
  expectedProductionCompletion: z.string().datetime().optional(),
  notes: z.union([z.string(), z.null()]).optional(),
  currentStatus: z.string().optional(),
}).partial();

export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectId = url.pathname.split('/').pop();
    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }
    const json = await req.json().catch(() => ({}));
    const parsed = PutBodySchema.safeParse(json);
    if (!parsed.success) {
      console.warn('[PROJECT PUT INVALID BODY]', parsed.error.format());
      return NextResponse.json({ error: 'Invalid body', issues: parsed.error.format() }, { status: 400 });
    }

    const project = await prisma.project.update({
      where: { projectId },
      data: { 
        ...parsed.data, 
        expectedDrawingStart: parsed.data.expectedDrawingStart ? new Date(parsed.data.expectedDrawingStart) : undefined, 
        expectedProductionStart: parsed.data.expectedProductionStart ? new Date(parsed.data.expectedProductionStart) : undefined, 
        expectedProductionCompletion: parsed.data.expectedProductionCompletion ? new Date(parsed.data.expectedProductionCompletion) : undefined 
      },
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
    });

    return NextResponse.json({
      ...project,
      client: project.Client ? `${project.Client.firstName} ${project.Client.lastName}` : '',
      clientAddressFormatted: project.Client && project.Client.address ? `${project.Client.address}, ${project.Client.city}, ${project.Client.state} ${project.Client.zip}`.trim() : '',
      contractAmount: Number(project.contractAmount),
      totalContract: Number(project.totalContract),
      expectedDrawingStart: project.expectedDrawingStart?.toISOString() ?? null,
      expectedProductionStart: project.expectedProductionStart?.toISOString() ?? null,
      expectedProductionCompletion: project.expectedProductionCompletion?.toISOString() ?? null,
    });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    console.error('❌ [PROJECT PUT ERROR]', err);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}