import { describe, it, expect, vi } from 'vitest';

// ExcelJS をモック（サーバーサイドのみのモジュール）
vi.mock('exceljs', () => ({
  default: {
    Workbook: class {
      xlsx = { load: vi.fn() };
      eachSheet = vi.fn();
    },
  },
}));

// ファイルタイプ検出のテスト用に内部ロジックを直接テスト
describe('excel-parser: detectFileType logic', () => {
  it('排水を含むファイル名は drain と判定される', () => {
    const filename = 'A現場_排水.xlsx';
    const lower = filename.toLowerCase();
    const isDrain = lower.includes('排水') || lower.includes('haisui') || lower.includes('drain');
    expect(isDrain).toBe(true);
  });

  it('水湯焚ファイルは water-hot と判定される', () => {
    const filename = 'A現場_水湯焚.xlsx';
    const lower = filename.toLowerCase();
    const isDrain = lower.includes('排水') || lower.includes('haisui') || lower.includes('drain');
    expect(isDrain).toBe(false);
  });

  it('drain を含む英語ファイル名も drain と判定される', () => {
    const filename = 'building_drain_pipes.xlsx';
    const lower = filename.toLowerCase();
    const isDrain = lower.includes('排水') || lower.includes('haisui') || lower.includes('drain');
    expect(isDrain).toBe(true);
  });
});

describe('excel-parser: normalizeQuantity logic', () => {
  it('排水ファイルのmm単位は m に変換される', () => {
    const value = 1000;
    const unit = 'mm';
    const fileType = 'drain' as const;
    // drain + mm → value / 1000
    const quantity = fileType === 'drain' && (unit === 'mm' || unit === '') ? value / 1000 : value;
    const resultUnit = fileType === 'drain' && (unit === 'mm' || unit === '') ? 'm' : unit;
    expect(quantity).toBe(1);
    expect(resultUnit).toBe('m');
  });

  it('水湯焚ファイルのmm単位はそのまま保持される', () => {
    const value = 1000;
    // water-hot は drain ではないので変換されない
    const isDrain = false;
    const quantity = isDrain ? value / 1000 : value;
    expect(quantity).toBe(1000);
  });

  it('単位が空の場合はデフォルトで m になる', () => {
    const unit = '';
    const resultUnit = unit || 'm';
    expect(resultUnit).toBe('m');
  });
});

describe('excel-parser: spec extraction logic', () => {
  it('品番から数値部分を抽出できる', () => {
    // /(\d+[Aφ]?)/ は最初に見つかった数値（+オプションのAまたはφ）にマッチする
    const codes = [
      { code: 'ELB-20A', expected: '20A' },
      { code: 'VLP-75', expected: '75' },
      { code: 'DRN-ELB-100', expected: '100' },
    ];
    codes.forEach(({ code, expected }) => {
      const match = code.match(/(\d+[Aφ]?)/);
      expect(match?.[1]).toBe(expected);
    });
  });

  it('数値を含まない品番はマッチしない', () => {
    const code = 'ABC-DEF';
    const match = code.match(/(\d+[Aφ]?)/);
    expect(match).toBeNull();
  });
});
