import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(_: Request, { params }: { params: { projectId: string } }) {
  try {
    const summary = await prisma.component.groupBy({
      by: ['componentType'],
      where: { projectId: params.projectId },
      _count: true,
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[PANEL TYPE SUMMARY ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}