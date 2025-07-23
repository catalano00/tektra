import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { formatDate } from '@/utils/format';
import { formatTime } from '@/utils/format';

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '7');

    const entries = await prisma.timeEntry.findMany({
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        component: {
          include: {
            Project: true, // <-- Project details from Component
          },
        },
      },
    });

    // Debug: log the first component to see its structure
    if (entries.length > 0) {
      console.log('First entry component:', entries[0].component);
    }

    const activities = entries.map(entry => ({
      id: entry.id,
      componentId: entry.component?.componentId ?? entry.componentId,
      componentType: entry.component?.componentType ?? null, // <-- add this line
      process: entry.process,
      status: entry.status,
      teamLead: entry.teamLead ?? 'N/A',
      duration: entry.duration, // <-- return as number, not formatTime
      createdAt: formatDate(entry.createdAt),
      updatedAt: formatDate(entry.updatedAt),
      projectId: entry.component?.Project?.projectId ?? null, // <-- add this line
      project:
        entry.component && entry.component.Project
          ? {
              projectId: entry.component.Project.projectId,
              currentStatus: entry.component.Project.currentStatus,
              client: entry.component.Project.client,
              streetaddress: entry.component.Project.streetaddress,
              city: entry.component.Project.city,
              state: entry.component.Project.state,
              zipcode: entry.component.Project.zipcode,
              contractAmount: entry.component.Project.contractAmount,
              contingency: entry.component.Project.contingency,
              totalContract: entry.component.Project.totalContract,
              buildableSqFt: entry.component.Project.buildableSqFt,
              estimatedPanelSqFt: entry.component.Project.estimatedPanelSqFt,
              expectedDrawingStart: entry.component.Project.expectedDrawingStart,
              expectedProductionStart: entry.component.Project.expectedProductionStart,
              expectedProductionCompletion: entry.component.Project.expectedProductionCompletion,
              notes: entry.component.Project.notes,
              updatedAt: entry.component.Project.updatedAt ? formatDate(entry.component.Project.updatedAt) : null,
            }
          : null,
      timestamp: entry.updatedAt, // used by dashboard
    }));

    return NextResponse.json({ activities });
  } catch (err) {
    console.error('❌ GET /api/activity error:', err);
    return NextResponse.json({ error: 'Failed to fetch activity feed' }, { status: 500 });
  }
}