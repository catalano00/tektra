import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// ✅ Reuse the same filter enum
const FilterSchema = z.object({
  filter: z
    .preprocess(
      (val) => (val === null || val === '' ? undefined : val),
      z.enum(['all', 'active', 'completed']).default('active')
    ),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const parsed = FilterSchema.safeParse({
      filter: searchParams.get('filter'),
    });

    if (!parsed.success) {
      console.warn('[PROJECTS COUNT INVALID QUERY]', parsed.error.format());
      return NextResponse.json(
        { error: 'Invalid query parameters', issues: parsed.error.format() },
        { status: 400 }
      );
    }

    const { filter } = parsed.data;

    let where = {};
    if (filter === 'active') {
      where = {
        currentStatus: { in: ['Planned', 'In Production'] },
      };
    } else if (filter === 'completed') {
      where = {
        currentStatus: { in: ['Delivered', 'Archived'] },
      };
    }

    const count = await prisma.project.count({ where });

    return NextResponse.json({ count });
  } catch (err) {
    console.error('❌ [PROJECTS COUNT ERROR]', {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });

    return NextResponse.json({ error: 'Failed to count projects' }, { status: 500 });
  }
}