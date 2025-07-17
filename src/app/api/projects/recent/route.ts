import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// ✅ Zod schema for query params
const QuerySchema = z.object({
  limit: z
    .preprocess((val) => {
      if (val === null || val === undefined || val === '') return undefined;
      return val;
    }, z.coerce.number().int().min(1).max(100).default(3)),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      limit: searchParams.get('limit'),
    });

    if (!parsed.success) {
      console.warn('[RECENT PROJECTS INVALID QUERY]', parsed.error.format());
      return NextResponse.json(
        { error: 'Invalid query parameters', issues: parsed.error.format() },
        { status: 400 }
      );
    }

    const { limit } = parsed.data;

    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
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
    console.error('❌ [RECENT PROJECTS ERROR]', {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });

    return NextResponse.json({ error: 'Failed to load recent projects' }, { status: 500 });
  }
}