import { NextRequest, NextResponse } from 'next/server';
import { generateEstimateExcel, buildEstimateRows, EstimateParams } from '@/lib/excel-generator';
import { MatchResult } from '@/lib/matching-engine';

export async function POST(req: NextRequest) {
  try {
    const { results, params } = await req.json();
    const rows = buildEstimateRows(results as MatchResult[], params as EstimateParams);
    const buffer = await generateEstimateExcel(rows, params as EstimateParams);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="estimate-${Date.now()}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
