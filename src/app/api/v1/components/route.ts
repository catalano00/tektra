// File: /src/app/api/v1/components/route.ts

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { formatDate } from '@/utils/format';

export async function GET() {
  try {
    const components = await prisma.component.findMany({
      select: {
        id: true,
        componentId: true,
        componentType: true,
        currentStatus: true,
        percentComplete: true,
        componentsqft: true,
        designUrl: true,
        projectId: true,
        lastCompletedProcess: true,
        nextProcess: true,
        teamLead: true,
        updatedAt: true,
        processStatus: true,
        timeEntries: {
          select: {
            process: true,
            status: true,
            teamLead: true,
            duration: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        Project: {
          select: {
            projectId: true,
            streetaddress: true,
          },
        },
      },
      orderBy: {
        projectId: 'asc',
      },
    });

    const formatted = components.map((c) => ({
      id: c.id,
      componentId: c.componentId,
      componentType: c.componentType,
      currentStatus: c.currentStatus,
      designUrl: c.designUrl,
      projectId: c.projectId,
      projectName: c.Project?.streetaddress || c.projectId,
      percentComplete: c.percentComplete,
      componentsqft: c.componentsqft,
      lastCompletedProcess: c.lastCompletedProcess,
      nextProcess: c.nextProcess,
      teamLead: c.teamLead,
      updatedAt: formatDate (c.updatedAt),
      processStatus: c.processStatus,
      timeEntries: c.timeEntries.map((t) => ({
        process: t.process,
        status: t.status,
        teamLead: t.teamLead,
        duration: t.duration,
        createdAt: formatDate(t.createdAt),
        updatedAt: formatDate(t.updatedAt),
      })),
    }));

    return NextResponse.json({ components: formatted });
  } catch (err) {
    console.error('❌ [GET COMPONENTS ERROR]', err);
    return NextResponse.json(
      { error: 'Failed to fetch components' },
      { status: 500 }
    );
  }
}