import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '3', 10);

  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' as any },
      take: limit,
      select: {
        projectId: true,
        currentStatus: true,
        updatedAt: true,
        city: true,
        state: true,
        buildableSqFt: true,
        contractAmount: true,
      },
    });

    return NextResponse.json(projects);
  } catch (err) {
    console.error('[RECENT PROJECTS ERROR]', err);
    return NextResponse.json({ error: 'Failed to load recent projects' }, { status: 500 });
  }
}
