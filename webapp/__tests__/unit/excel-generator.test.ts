import { describe, it, expect, vi } from 'vitest';

// ExcelJS をモック
vi.mock('exceljs', () => {
  const mockCell = {
    value: null as unknown,
    font: null as unknown,
    fill: null as unknown,
  };
  const mockRow = {
    getCell: vi.fn().mockReturnValue(mockCell),
    font: null as unknown,
    fill: null as unknown,
  };
  const mockSheet = {
    getCell: vi.fn().mockReturnValue(mockCell),
    addRow: vi.fn().mockReturnValue(mockRow),
    getRow: vi.fn().mockReturnValue(mockRow),
    columns: [] as unknown[],
  };
  return {
    default: class MockWorkbook {
      addWorksheet = vi.fn().mockReturnValue(mockSheet);
      xlsx = {
        writeBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      };
    },
  };
});

// matching-engine をモック
vi.mock('../../lib/matching-engine', () => ({}));

import { buildEstimateRows, EstimateParams } from '../../lib/excel-generator';
import { MatchResult, CatalogItem } from '../../lib/matching-engine';
import { ParsedItem } from '../../lib/excel-parser';

const sampleCatalog: CatalogItem = {
  code: 'QXPEM2-13A',
  name: '架橋ポリエチレン管',
  spec: '13A',
  unit: 'm',
  unitPrice: 480,
};

const sampleItem: ParsedItem = {
  category: '配管',
  subCategory: '給水',
  code: 'QXPEM2-13A',
  name: '架橋ポリエチレン管',
  spec: '13A',
  quantity: 10,
  unit: 'm',
  sourceFile: 'test.xlsx',
};

const sampleParams: EstimateParams = {
  projectName: 'テスト現場',
  workDate: '2026-03-09',
  developerName: '佐藤建設',
  markupRate: 1.0,
  processingCost: 0,
  expenseRate: 0,
  discountRate: 0,
};

describe('buildEstimateRows', () => {
  it('exact マッチの場合は単価×数量で金額が計算される', () => {
    const results: MatchResult[] = [{
      item: sampleItem,
      status: 'exact',
      matchedCatalog: sampleCatalog,
      candidates: [],
      confidence: 1.0,
    }];
    const rows = buildEstimateRows(results, sampleParams);
    expect(rows).toHaveLength(1);
    expect(rows[0].unitPrice).toBe(480); // markupRate=1.0なので変化なし
    expect(rows[0].amount).toBe(4800);   // 480 * 10
  });

  it('掛率が適用される', () => {
    const results: MatchResult[] = [{
      item: sampleItem,
      status: 'exact',
      matchedCatalog: sampleCatalog,
      candidates: [],
      confidence: 1.0,
    }];
    const paramsWithMarkup = { ...sampleParams, markupRate: 1.15 };
    const rows = buildEstimateRows(results, paramsWithMarkup);
    expect(rows[0].unitPrice).toBe(552); // Math.round(480 * 1.15)
    expect(rows[0].amount).toBe(5520);   // 552 * 10
  });

  it('unregistered の場合は unitPrice が 0 になる', () => {
    const results: MatchResult[] = [{
      item: sampleItem,
      status: 'unregistered',
      matchedCatalog: null,
      candidates: [],
      confidence: 0,
    }];
    const rows = buildEstimateRows(results, sampleParams);
    expect(rows[0].unitPrice).toBe(0);
    expect(rows[0].amount).toBe(0);
    expect(rows[0].status).toBe('unregistered');
  });

  it('複数品目の合計が正しい', () => {
    const results: MatchResult[] = [
      { item: sampleItem, status: 'exact', matchedCatalog: sampleCatalog, candidates: [], confidence: 1.0 },
      {
        item: { ...sampleItem, code: 'ELB-13A', name: 'エルボ', quantity: 5 },
        status: 'exact',
        matchedCatalog: { code: 'ELB-13A', name: 'エルボ', spec: '13A', unit: '個', unitPrice: 120 },
        candidates: [],
        confidence: 1.0,
      },
    ];
    const rows = buildEstimateRows(results, sampleParams);
    expect(rows).toHaveLength(2);
    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    expect(total).toBe(4800 + 600); // 480*10 + 120*5
  });
});
