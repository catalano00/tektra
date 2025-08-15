// Provides duplicate summary across staging data
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeStagingDuplicates, markProductionConflicts } from '@/lib/duplicates';

export async function GET() {
  try {
    const staging = await prisma.stagingData.findMany({ select: { id: true, rawData: true } });
    const map = analyzeStagingDuplicates(staging as any);
    await markProductionConflicts(map);
    const list = Object.values(map).filter(m => m.stagingIds.length > 1 || m.productionExists);
    return NextResponse.json({ duplicates: list });
  } catch (e) {
    console.error('duplicate summary error', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
