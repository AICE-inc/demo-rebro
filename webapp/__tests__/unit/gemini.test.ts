import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractDimensions, extractDrawingInfo } from '@/lib/gemini';

describe('extractDimensions', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('正常なGemini APIレスポンスから寸法を抽出できる', async () => {
    const mockResponse = {
      candidates: [{
        content: {
          parts: [{
            text: '{"dimensions": ["5,300 mm", "2,400 mm", "1,820 mm"]}'
          }]
        }
      }]
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const result = await extractDimensions('base64imagedata');
    expect(result.dimensions).toEqual(['5,300 mm', '2,400 mm', '1,820 mm']);
    expect(result.rawText).toBe('{"dimensions": ["5,300 mm", "2,400 mm", "1,820 mm"]}');
  });

  it('GEMINI_API_KEYが未設定の場合にエラーをthrowする', async () => {
    vi.unstubAllEnvs();
    delete process.env.GEMINI_API_KEY;

    await expect(extractDimensions('base64imagedata')).rejects.toThrow('GEMINI_API_KEY is not set');
  });

  it('APIエラー時にエラーをthrowする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limit exceeded'),
    }));

    await expect(extractDimensions('base64imagedata')).rejects.toThrow('Gemini API error: 429 - Rate limit exceeded');
  });

  it('JSON以外のレスポンス時にエラーをthrowする', async () => {
    const mockResponse = {
      candidates: [{
        content: {
          parts: [{
            text: 'This is not JSON at all, just plain text'
          }]
        }
      }]
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    await expect(extractDimensions('base64imagedata')).rejects.toThrow('Gemini returned no JSON');
  });

  it('末尾カンマを含むJSONでも正常パースできる', async () => {
    const mockResponse = {
      candidates: [{
        content: {
          parts: [{
            text: '{"dimensions": ["5,300 mm", "2,400 mm",]}'
          }]
        }
      }]
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const result = await extractDimensions('base64imagedata');
    expect(result.dimensions).toEqual(['5,300 mm', '2,400 mm']);
  });
});

describe('extractDrawingInfo', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('正常なGemini APIレスポンスから図面情報を抽出できる', async () => {
    const mockJson = {
      drawingType: '平面図(給水給湯)',
      pipeSystems: [
        { type: '給水', mainDiameter: '16φ', branchDiameter: '13φ', material: 'ポリブデン管', routing: '床配管(SL±0)' },
        { type: '給湯', mainDiameter: '16φ', branchDiameter: '13φ', material: 'ポリブデン管', routing: '床配管(SL±0)' },
      ],
      fixtures: [
        { name: '洗面台', count: 1, slLevel: 'SL+1000', drainDiameter: '40φ' },
        { name: 'トイレ', count: 1, slLevel: 'SL+1000', drainDiameter: '75φ' },
      ],
      scaleDimension: '5,300mm',
      siteRules: [
        { category: 'ソケット挿入', description: 'パイプ2m超でソケットが必要', value: '2000mm超' },
      ],
      uncertainItems: [
        { item: 'MB内補足配管長', reason: '図面上に記載なし', suggestedQuestion: 'MB内の補足配管長は何mですか？' },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: JSON.stringify(mockJson) }] } }]
      }),
    }));

    const result = await extractDrawingInfo('base64imagedata');

    expect(result.drawingType).toBe('平面図(給水給湯)');
    expect(result.pipeSystems).toHaveLength(2);
    expect(result.pipeSystems[0].type).toBe('給水');
    expect(result.pipeSystems[0].mainDiameter).toBe('16φ');
    expect(result.fixtures).toHaveLength(2);
    expect(result.fixtures[1].name).toBe('トイレ');
    expect(result.fixtures[1].drainDiameter).toBe('75φ');
    expect(result.scaleDimension).toBe('5,300mm');
    expect(result.siteRules).toHaveLength(1);
    expect(result.siteRules[0].category).toBe('ソケット挿入');
    expect(result.uncertainItems).toHaveLength(1);
    expect(result.uncertainItems[0].item).toBe('MB内補足配管長');
  });

  it('GEMINI_API_KEYが未設定の場合にエラーをthrowする', async () => {
    vi.unstubAllEnvs();
    delete process.env.GEMINI_API_KEY;

    await expect(extractDrawingInfo('base64imagedata')).rejects.toThrow('GEMINI_API_KEY is not set');
  });

  it('APIエラー時にエラーをthrowする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    }));

    await expect(extractDrawingInfo('base64imagedata')).rejects.toThrow('Gemini API error: 500 - Internal Server Error');
  });

  it('JSON以外のレスポンス時にエラーをthrowする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: '図面を解析できませんでした' }] } }]
      }),
    }));

    await expect(extractDrawingInfo('base64imagedata')).rejects.toThrow('Gemini returned no JSON');
  });

  it('フィールドが欠落したレスポンスでも空配列・空文字でフォールバックする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: '{"drawingType": "設計図"}' }] } }]
      }),
    }));

    const result = await extractDrawingInfo('base64imagedata');

    expect(result.drawingType).toBe('設計図');
    expect(result.pipeSystems).toEqual([]);
    expect(result.fixtures).toEqual([]);
    expect(result.scaleDimension).toBe('');
    expect(result.siteRules).toEqual([]);
    expect(result.uncertainItems).toEqual([]);
  });

  it('gemini-3-flashエンドポイントにリクエストを送る', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: '{"drawingType":"テスト","pipeSystems":[],"fixtures":[],"scaleDimension":"","siteRules":[],"uncertainItems":[]}' }] } }]
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await extractDrawingInfo('base64imagedata');

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('gemini-3-flash-preview');
  });
});
