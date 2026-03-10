import ExcelJS from 'exceljs';
import { MatchResult } from './matching-engine';

export interface EstimateParams {
  projectName: string;
  workDate: string;
  developerName: string;
  markupRate: number;    // 掛率（例: 1.15 = 15%上乗せ）
  processingCost: number; // 加工費（円）
  expenseRate: number;   // 経費率（例: 0.1 = 10%）
  discountRate: number;  // 値引き（例: 0.05 = 5%引き）
}

export interface EstimateRow {
  category: string;
  subCategory: string;
  code: string;
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  status: 'exact' | 'candidate' | 'unregistered';
}

export function buildEstimateRows(results: MatchResult[], params: EstimateParams): EstimateRow[] {
  return results.map(r => {
    const unitPrice = r.matchedCatalog?.unitPrice ?? 0;
    const adjustedUnitPrice = Math.round(unitPrice * params.markupRate);
    const amount = Math.round(adjustedUnitPrice * r.item.quantity);
    return {
      category: r.item.category,
      subCategory: r.item.subCategory,
      code: r.item.code,
      name: r.matchedCatalog?.name ?? r.item.name,
      spec: r.item.spec,
      quantity: r.item.quantity,
      unit: r.item.unit,
      unitPrice: adjustedUnitPrice,
      amount,
      status: r.status,
    };
  });
}

export async function generateEstimateExcel(rows: EstimateRow[], params: EstimateParams): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // ---- 表紙シート ----
  const coverSheet = workbook.addWorksheet('表紙');
  coverSheet.getCell('B2').value = '見積書';
  coverSheet.getCell('B2').font = { size: 20, bold: true };
  coverSheet.getCell('B4').value = `工事件名：${params.projectName}`;
  coverSheet.getCell('B5').value = `工事日付：${params.workDate}`;
  coverSheet.getCell('B6').value = `提出先：${params.developerName}`;

  const subtotal = rows.reduce((sum, r) => sum + r.amount, 0);
  const withExpense = Math.round(subtotal * (1 + params.expenseRate));
  const withProcessing = withExpense + params.processingCost;
  const total = Math.round(withProcessing * (1 - params.discountRate));

  coverSheet.getCell('B8').value = `小計：¥${subtotal.toLocaleString()}`;
  coverSheet.getCell('B9').value = `経費込み：¥${withExpense.toLocaleString()}`;
  coverSheet.getCell('B10').value = `加工費込み：¥${withProcessing.toLocaleString()}`;
  coverSheet.getCell('B11').value = `合計（値引後）：¥${total.toLocaleString()}`;
  coverSheet.getCell('B11').font = { bold: true, size: 14 };

  // ---- 品目明細シート ----
  const detailSheet = workbook.addWorksheet('品目明細');
  const headers = ['大カテゴリ', '小カテゴリ', '品番', '品名', '規格', '数量', '単位', '単価', '金額', 'ステータス'];
  detailSheet.addRow(headers);
  detailSheet.getRow(1).font = { bold: true };
  detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  rows.forEach(row => {
    const newRow = detailSheet.addRow([
      row.category,
      row.subCategory,
      row.code,
      row.name,
      row.spec,
      row.quantity,
      row.unit,
      row.unitPrice,
      row.amount,
      row.status === 'exact' ? '確定' : row.status === 'candidate' ? '候補' : '未登録',
    ]);

    // 色分け
    const fillColor = row.status === 'exact' ? 'FF16A34A'
      : row.status === 'candidate' ? 'FFD97706'
      : 'FFDC2626';

    newRow.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
    newRow.getCell(10).font = { color: { argb: 'FFFFFFFF' } };
  });

  // 列幅調整
  detailSheet.columns = [
    { width: 15 }, { width: 15 }, { width: 25 }, { width: 20 },
    { width: 10 }, { width: 10 }, { width: 8 }, { width: 12 },
    { width: 12 }, { width: 10 },
  ];

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
