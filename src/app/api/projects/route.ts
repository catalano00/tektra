// /app/api/projects/route.ts

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'active';

    const projects = await prisma.project.findMany({
      where: filter === 'all' ? {} : {
        currentStatus: {
          in: ['Planned', 'In Production']
        }
      },
      select: {
        projectId: true,
        currentStatus: true,
      },
      orderBy: {
        projectId: 'asc',
      },
    });

    return NextResponse.json(projects);
  } catch (err) {
    console.error('[PROJECTS GET ERROR]', err);
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}