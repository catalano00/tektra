// Comparison payload for duplicate resolution modal
import { NextResponse } from 'next/server';
import { buildComparison } from '@/lib/duplicates';

export async function GET(_req: Request, context: any) {
  try {
    const id = context?.params?.id as string | undefined;
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    const payload = await buildComparison(id);
    if (!payload) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json(payload);
  } catch (e) {
    console.error('comparison error', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
