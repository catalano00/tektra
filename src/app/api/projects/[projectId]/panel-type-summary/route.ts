import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ✅ Validation schema
const ParamsSchema = z.object({
  projectId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const pathParts = req.nextUrl.pathname.split('/');
    const projectId = pathParts.at(-1);

    const parsed = ParamsSchema.safeParse({ projectId });
    if (!parsed.success) {
      console.warn('[PROJECT DETAILS INVALID PARAM]', parsed.error.format());
      return NextResponse.json(
        { error: 'Invalid or missing projectId', issues: parsed.error.format() },
        { status: 400 }
      );
    }

    // ✅ Group component counts by type
    const summary = await prisma.component.groupBy({
      by: ['componentType'],
      where: { projectId: parsed.data.projectId },
      _count: true,
    });

    const formatted = summary.map((s) => ({
      componentType: s.componentType,
      count: s._count,
    }));

    return NextResponse.json({
      projectId: parsed.data.projectId,
      summary: formatted,
    });
  } catch (err) {
    console.error('❌ [PANEL TYPE SUMMARY ERROR]', {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });

    return NextResponse.json({ error: 'Failed to get panel type summary' }, { status: 500 });
  }
}
