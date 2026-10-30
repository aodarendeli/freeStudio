import { getCellValue, getDisplayText, type GridColumn } from '../columns';
import { toDate } from '../utils';

const DEFAULT_FILE_NAME = 'DataGrid';

/**
 * Görünür sütunları `caption` başlıklarıyla Excel'e yazar.
 * Sayılar ve tarihler hücre tipinde, diğerleri (lookup / format uygulanmış) metin olarak yazılır.
 * `exceljs` sadece dışa aktarımda yüklenir (ana paket boyutunu büyütmemek için).
 */
export const exportToExcel = async (rows: any[], columns: GridColumn[], fileName = DEFAULT_FILE_NAME) => {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');

  worksheet.columns = columns.map((column) => ({
    header: column.caption,
    key: column.id,
    width: Math.max(12, Math.min(48, column.caption.length + 4)),
  }));
  worksheet.getRow(1).font = { bold: true };

  rows.forEach((row) => {
    const values: Record<string, unknown> = {};
    columns.forEach((column) => {
      const value = getCellValue(column, row);
      if (column.lookupOptions || column.format) {
        values[column.id] = getDisplayText(column, value);
      } else if (column.dataType === 'number' && typeof value === 'number') {
        values[column.id] = value;
      } else if (column.dataType === 'date' || column.dataType === 'datetime') {
        values[column.id] = toDate(value) ?? '';
      } else {
        values[column.id] = getDisplayText(column, value);
      }
    });
    worksheet.addRow(values);
  });

  columns.forEach((column, index) => {
    if (column.dataType === 'date' || column.dataType === 'datetime') {
      worksheet.getColumn(index + 1).numFmt = column.dataType === 'date' ? 'dd.mm.yyyy' : 'dd.mm.yyyy hh:mm';
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
