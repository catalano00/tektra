import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ✅ Validation schema for path param
const ParamsSchema = z.object({
  projectId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const pathParts = req.nextUrl.pathname.split('/');
    const projectId = pathParts.at(-1); // safer than hardcoding [4]

    const parsed = ParamsSchema.safeParse({ projectId });
    if (!parsed.success) {
      console.warn('[PROJECT DETAILS INVALID PARAM]', parsed.error.format());
      return NextResponse.json(
        { error: 'Invalid or missing projectId', issues: parsed.error.format() },
        { status: 400 }
      );
    }

    // ✅ Fetch panel type summary for this project
    const summary = await prisma.component.groupBy({
      by: ['componentType'],
      where: { projectId: parsed.data.projectId },
      _count: true,
    });

    return NextResponse.json(summary);
  } catch (err) {
    console.error('❌ [PANEL TYPE SUMMARY ERROR]', {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });

    return NextResponse.json({ error: 'Failed to get panel type summary' }, { status: 500 });
  }
}