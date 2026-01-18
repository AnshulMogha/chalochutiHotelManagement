import * as XLSX from 'xlsx';

export interface ExportColumn {
  field: string;
  headerName: string;
  valueGetter?: (row: any) => any;
}

/**
 * Export data to CSV format
 */
export function exportToCSV(
  data: any[],
  columns: ExportColumn[],
  filename: string
) {
  // Prepare headers
  const headers = columns.map((col) => col.headerName);

  // Prepare rows
  const rows = data.map((row) =>
    columns.map((col) => {
      if (col.valueGetter) {
        return col.valueGetter(row);
      }
      return row[col.field] || '';
    })
  );

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma, newline, or quote
          const cellValue = String(cell || '').replace(/"/g, '""');
          if (cellValue.includes(',') || cellValue.includes('\n') || cellValue.includes('"')) {
            return `"${cellValue}"`;
          }
          return cellValue;
        })
        .join(',')
    )
    .join('\n');

  // Add BOM for UTF-8 (Excel compatibility)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to Excel format
 */
export function exportToExcel(
  data: any[],
  columns: ExportColumn[],
  filename: string
) {
  // Prepare data for Excel
  const headers = columns.map((col) => col.headerName);
  const rows = data.map((row) =>
    columns.map((col) => {
      if (col.valueGetter) {
        return col.valueGetter(row);
      }
      return row[col.field] || '';
    })
  );

  // Create worksheet
  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  const columnWidths = columns.map((col) => ({
    wch: Math.max(col.headerName.length, 15),
  }));
  worksheet['!cols'] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  // Generate Excel file and download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

