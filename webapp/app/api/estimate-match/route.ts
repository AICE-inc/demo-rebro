import { NextRequest, NextResponse } from 'next/server';
import { runMatching } from '@/lib/matching-engine';
import { ParsedItem } from '@/lib/excel-parser';

export async function POST(req: NextRequest) {
  try {
    const { items, catalog } = await req.json();
    const results = await runMatching(items as ParsedItem[], catalog);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('Estimate match error:', err);
    return NextResponse.json({ error: 'Matching failed' }, { status: 500 });
  }
}
