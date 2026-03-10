import ExcelJS from 'exceljs';

export interface ParsedItem {
  category: string;
  subCategory: string;
  code: string;
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  sourceFile: string;
}

export type FileType = 'water-hot' | 'drain';

function detectFileType(filename: string): FileType {
  const lower = filename.toLowerCase();
  if (lower.includes('排水') || lower.includes('haisui') || lower.includes('drain')) {
    return 'drain';
  }
  return 'water-hot';
}

function normalizeQuantity(value: number, unit: string, fileType: FileType): { quantity: number; unit: string } {
  if (fileType === 'drain' && (unit === 'mm' || unit === '')) {
    return { quantity: value / 1000, unit: 'm' };
  }
  return { quantity: value, unit: unit || 'm' };
}

function getCellValue(cell: ExcelJS.Cell): string {
  if (cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'object' && 'text' in cell.value) {
    return String((cell.value as unknown as { text: string }).text);
  }
  return String(cell.value).trim();
}

export async function parseExcelFile(buffer: ArrayBuffer, filename: string): Promise<ParsedItem[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const fileType = detectFileType(filename);
  const items: ParsedItem[] = [];

  workbook.eachSheet((worksheet) => {
    let currentCategory = '';
    let currentSubCategory = '';

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < 3) return;

      const colB = getCellValue(row.getCell(2));
      const colC = getCellValue(row.getCell(3));
      const colV = getCellValue(row.getCell(22));
      const colW = getCellValue(row.getCell(23));
      const colX = getCellValue(row.getCell(24));

      if (colB) currentCategory = colB;
      if (colC) currentSubCategory = colC;

      if (!colV || !colW) return;

      const quantityRaw = parseFloat(colW.replace(/[^0-9.]/g, ''));
      if (isNaN(quantityRaw) || quantityRaw === 0) return;

      const specMatch = colV.match(/(\d+[Aφ])/);
      const spec = specMatch ? specMatch[1] : '';
      const name = currentSubCategory || currentCategory;

      const { quantity, unit } = normalizeQuantity(quantityRaw, colX, fileType);

      items.push({
        category: currentCategory,
        subCategory: currentSubCategory,
        code: colV,
        name,
        spec,
        quantity,
        unit,
        sourceFile: filename,
      });
    });
  });

  return items;
}
