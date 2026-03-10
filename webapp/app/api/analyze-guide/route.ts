import { NextRequest, NextResponse } from 'next/server';
import { extractDrawingInfo } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
    }

    const result = await extractDrawingInfo(imageBase64);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[analyze-guide]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
