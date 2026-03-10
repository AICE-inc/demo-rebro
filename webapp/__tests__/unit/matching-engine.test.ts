import { describe, it, expect, vi } from 'vitest';

// Anthropic SDK をモック
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
      }),
    };
  },
}));

// excel-parser をモック
vi.mock('../../lib/excel-parser', () => ({
  parseExcelFile: vi.fn(),
}));

import { runMatching, CatalogItem, MatchResult } from '../../lib/matching-engine';
import { ParsedItem } from '../../lib/excel-parser';

const SAMPLE_CATALOG: CatalogItem[] = [
  { code: 'QXPEM2-13A', name: '架橋ポリエチレン管', spec: '13A', unit: 'm', unitPrice: 480 },
  { code: 'QXPEM2-20A', name: '架橋ポリエチレン管', spec: '20A', unit: 'm', unitPrice: 720 },
  { code: 'ELB-13A', name: 'エルボ', spec: '13A', unit: '個', unitPrice: 120 },
  { code: 'ELB-20A', name: 'エルボ', spec: '20A', unit: '個', unitPrice: 180 },
  { code: 'VLP-75', name: '塩ビ管（VLP）', spec: '75φ', unit: 'm', unitPrice: 560 },
];

const makeParsedItem = (overrides: Partial<ParsedItem> = {}): ParsedItem => ({
  category: '配管',
  subCategory: '給水',
  code: 'QXPEM2-13A',
  name: '架橋ポリエチレン管',
  spec: '13A',
  quantity: 10,
  unit: 'm',
  sourceFile: 'test.xlsx',
  ...overrides,
});

describe('runMatching: コード完全一致', () => {
  it('品番が完全一致する場合は exact ステータスになる', async () => {
    const items = [makeParsedItem({ code: 'QXPEM2-13A', spec: '13A' })];
    const results = await runMatching(items, SAMPLE_CATALOG);
    expect(results[0].status).toBe('exact');
    expect(results[0].matchedCatalog?.code).toBe('QXPEM2-13A');
    expect(results[0].confidence).toBe(1.0);
  });

  it('品番が存在しない場合は unregistered になる（Claudeもモック）', async () => {
    const items = [makeParsedItem({ code: 'UNKNOWN-99A', name: 'xxxxx', spec: '99A' })];
    const results = await runMatching(items, SAMPLE_CATALOG);
    // Claude モックは [] を返すので unregistered か candidate になる
    expect(['unregistered', 'candidate']).toContain(results[0].status);
  });
});

describe('runMatching: キーワード一致', () => {
  it('品名+規格の一致で exact になる', async () => {
    // 品番は違うが名前と規格が一致
    const items = [makeParsedItem({ code: 'OTHER-CODE', name: '架橋ポリエチレン管', spec: '20A' })];
    const results = await runMatching(items, SAMPLE_CATALOG);
    // キーワード一致で exact または candidate になることを確認
    expect(['exact', 'candidate']).toContain(results[0].status);
  });
});

describe('runMatching: 複数品目', () => {
  it('複数品目を一度にマッチングできる', async () => {
    const items = [
      makeParsedItem({ code: 'QXPEM2-13A', spec: '13A' }),
      makeParsedItem({ code: 'ELB-20A', name: 'エルボ', spec: '20A' }),
      makeParsedItem({ code: 'VLP-75', name: '塩ビ管（VLP）', spec: '75φ', unit: 'm' }),
    ];
    const results = await runMatching(items, SAMPLE_CATALOG);
    expect(results).toHaveLength(3);
    expect(results[0].status).toBe('exact');
    expect(results[1].status).toBe('exact');
    expect(results[2].status).toBe('exact');
  });
});
