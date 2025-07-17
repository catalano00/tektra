// File: /src/app/api/v1/components/route.ts

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const components = await prisma.component.findMany({
      select: {
        id: true,
        componentId: true,
        componentType: true,
        currentStatus: true,
        designUrl: true,
        projectId: true,
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