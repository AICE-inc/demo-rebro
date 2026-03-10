import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/analyze-pdf/route';

// lib/gemini の extractDimensions をモック
vi.mock('@/lib/gemini', () => ({
  extractDimensions: vi.fn(),
}));

import { extractDimensions } from '@/lib/gemini';

const mockedExtractDimensions = extractDimensions as ReturnType<typeof vi.fn>;

describe('/api/analyze-pdf', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('imageBase64 なしのリクエストで 400 が返る', async () => {
    const req = new NextRequest('http://localhost/api/analyze-pdf', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('imageBase64 is required');
  });

  it('imageBase64 ありで正常なレスポンスが返る', async () => {
    mockedExtractDimensions.mockResolvedValue({
      dimensions: ['5,300 mm', '2,400 mm'],
      rawText: '{"dimensions": ["5,300 mm", "2,400 mm"]}',
    });

    const req = new NextRequest('http://localhost/api/analyze-pdf', {
      method: 'POST',
      body: JSON.stringify({ imageBase64: 'base64data' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.dimensions).toEqual(['5,300 mm', '2,400 mm']);
  });

  it('エラー時に 500 が返る', async () => {
    mockedExtractDimensions.mockRejectedValue(new Error('API failure'));

    const req = new NextRequest('http://localhost/api/analyze-pdf', {
      method: 'POST',
      body: JSON.stringify({ imageBase64: 'base64data' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe('API failure');
  });
});
