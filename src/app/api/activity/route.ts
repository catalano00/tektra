import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// ✅ Zod schema for limit param
const QuerySchema = z.object({
  limit: z.preprocess(
    (val) => {
      const num = Number(val);
      return Number.isFinite(num) && num > 0 && num <= 100 ? num : undefined;
    },
    z.number().int().min(1).max(100).default(10)
  ),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      limit: searchParams.get('limit'),
    });

    if (!parsed.success) {
      console.warn('[ACTIVITY FEED INVALID QUERY]', parsed.error.format());
      return NextResponse.json(
        { error: 'Invalid query parameters', issues: parsed.error.format() },
        { status: 400 }
      );
    }

    const { limit } = parsed.data;

    const recentActivity = await prisma.timeEntry.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        componentCode: true,
        process: true,
        status: true,
        teamLead: true,
        updatedAt: true,
      },
    });

    const normalized = recentActivity.map((entry) => ({
      componentId: entry.componentCode,
      process: entry.process,
      status: entry.status,
      teamLead: entry.teamLead,
      timestamp: entry.updatedAt.toISOString(),
    }));

    return NextResponse.json(normalized);
  } catch (err) {
    console.error('❌ [ACTIVITY FEED ERROR]', {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    return NextResponse.json({ error: 'Failed to load activity feed' }, { status: 500 });
  }
}