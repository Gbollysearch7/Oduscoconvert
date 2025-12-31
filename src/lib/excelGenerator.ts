import XLSX from 'xlsx-js-style';
import type { ConversionResult } from './types';
import type { EnhancedExtractedTable } from './tableExtractor';

// Professional color palette
const COLORS = {
  // Header colors
  headerBg: '1E3A5F',           // Deep navy blue
  headerText: 'FFFFFF',          // White
  headerBorder: '2C5282',        // Slightly lighter navy

  // Data row colors
  evenRowBg: 'EBF4FF',           // Very light blue
  oddRowBg: 'FFFFFF',            // White

  // Column type accent colors (for header underline/accent)
  numberAccent: '2E7D32',        // Green for numbers
  currencyAccent: '1565C0',      // Blue for currency
  dateAccent: '7B1FA2',          // Purple for dates
  textAccent: '455A64',          // Blue-gray for text

  // Borders
  borderLight: 'CBD5E1',         // Light gray border
  borderMedium: '94A3B8',        // Medium gray border

  // Text mode
  textHeaderBg: '0D47A1',        // Dark blue for text mode
  pageColumnBg: 'E3F2FD',        // Light blue for page column

  // Title/info rows
  titleBg: '1E3A5F',             // Dark navy for title
  titleText: 'FFFFFF',           // White text for title

  // Totals row
  totalsBg: 'E8EAF6',            // Light indigo
  totalsText: '1A237E',          // Dark indigo
};

// Style factory functions
function createTitleStyle() {
  return {
    font: {
      bold: true,
      color: { rgb: COLORS.titleText },
      sz: 14,
      name: 'Calibri'
    },
    fill: {
      fgColor: { rgb: COLORS.titleBg },
      patternType: 'solid'
    },
    alignment: {
      horizontal: 'left',
      vertical: 'center',
    },
    border: {
      bottom: { style: 'medium', color: { rgb: COLORS.headerBorder } },
    },
  };
}

function createHeaderStyle(columnType?: string) {
  const accentColor = columnType === 'number' ? COLORS.numberAccent
    : columnType === 'currency' ? COLORS.currencyAccent
    : columnType === 'date' ? COLORS.dateAccent
    : COLORS.textAccent;

  return {
    font: {
      bold: true,
      color: { rgb: COLORS.headerText },
      sz: 11,
      name: 'Calibri'
    },
    fill: {
      fgColor: { rgb: COLORS.headerBg },
      patternType: 'solid'
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center',
      wrapText: true
    },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.headerBorder } },
      bottom: { style: 'medium', color: { rgb: accentColor } },
      left: { style: 'thin', color: { rgb: COLORS.headerBorder } },
      right: { style: 'thin', color: { rgb: COLORS.headerBorder } },
    },
  };
}

function createDataCellStyle(isEven: boolean, columnType?: string) {
  const bgColor = isEven ? COLORS.evenRowBg : COLORS.oddRowBg;

  // Determine alignment based on column type
  const alignment = columnType === 'number' || columnType === 'currency'
    ? 'right'
    : columnType === 'date'
    ? 'center'
    : 'left';

  return {
    font: {
      sz: 10,
      name: 'Calibri',
      color: { rgb: '1F2937' }
    },
    fill: {
      fgColor: { rgb: bgColor },
      patternType: 'solid'
    },
    alignment: {
      horizontal: alignment,
      vertical: 'center',
      wrapText: true
    },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.borderLight } },
      bottom: { style: 'thin', color: { rgb: COLORS.borderLight } },
      left: { style: 'thin', color: { rgb: COLORS.borderLight } },
      right: { style: 'thin', color: { rgb: COLORS.borderLight } },
    },
  };
}

function createTextModeHeaderStyle() {
  return {
    font: {
      bold: true,
      color: { rgb: COLORS.headerText },
      sz: 11,
      name: 'Calibri'
    },
    fill: {
      fgColor: { rgb: COLORS.textHeaderBg },
      patternType: 'solid'
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center'
    },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.borderMedium } },
      bottom: { style: 'medium', color: { rgb: COLORS.currencyAccent } },
      left: { style: 'thin', color: { rgb: COLORS.borderMedium } },
      right: { style: 'thin', color: { rgb: COLORS.borderMedium } },
    },
  };
}

function createPageCellStyle(isEven: boolean) {
  return {
    font: {
      bold: true,
      sz: 10,
      color: { rgb: '1565C0' },
      name: 'Calibri'
    },
    fill: {
      fgColor: { rgb: isEven ? COLORS.pageColumnBg : COLORS.oddRowBg },
      patternType: 'solid'
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center'
    },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.borderLight } },
      bottom: { style: 'thin', color: { rgb: COLORS.borderLight } },
      left: { style: 'thin', color: { rgb: COLORS.borderLight } },
      right: { style: 'thin', color: { rgb: COLORS.borderMedium } },
    },
  };
}

function createContentCellStyle(isEven: boolean) {
  return {
    font: {
      sz: 10,
      name: 'Calibri',
      color: { rgb: '374151' }
    },
    fill: {
      fgColor: { rgb: isEven ? COLORS.evenRowBg : COLORS.oddRowBg },
      patternType: 'solid'
    },
    alignment: {
      horizontal: 'left',
      vertical: 'center',
      wrapText: true
    },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.borderLight } },
      bottom: { style: 'thin', color: { rgb: COLORS.borderLight } },
      left: { style: 'thin', color: { rgb: COLORS.borderLight } },
      right: { style: 'thin', color: { rgb: COLORS.borderLight } },
    },
  };
}

export function generateExcel(
  result: ConversionResult,
  fileName: string,
  onProgress?: (progress: number, step: string) => void
): Blob {
  onProgress?.(80, 'Creating Excel workbook...');

  const workbook = XLSX.utils.book_new();

  if (result.mode === 'tables' && result.tables.length > 0) {
    // Add each table as a separate sheet with enhanced styling
    result.tables.forEach((table, index) => {
      onProgress?.(80 + Math.floor((index / result.tables.length) * 15), `Styling table ${index + 1}...`);

      const enhancedTable = table as EnhancedExtractedTable;
      const hasMetadata = 'metadata' in enhancedTable;
      const metadata = hasMetadata ? enhancedTable.metadata : null;
      const hasHeader = metadata?.hasDetectedHeader ?? false;

      // Get the number of columns from the data
      const numCols = Math.max(...table.rows.map(r => r.length));

      // Build sheet data - title row spans all columns, then table data starts fresh
      const sheetData: (string | number)[][] = [];

      // Row 0: Title row - put title in first cell, empty strings in rest for proper merge
      const titleRow: string[] = [table.source];
      for (let i = 1; i < numCols; i++) {
        titleRow.push('');
      }
      sheetData.push(titleRow);

      // Row 1: Empty spacing row
      const emptyRow: string[] = [];
      for (let i = 0; i < numCols; i++) {
        emptyRow.push('');
      }
      sheetData.push(emptyRow);

      // Add table data starting from row 2
      table.rows.forEach((row) => {
        // Ensure each row has the same number of columns
        const normalizedRow = [...row];
        while (normalizedRow.length < numCols) {
          normalizedRow.push('');
        }
        sheetData.push(normalizedRow);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

      // Initialize merges array
      const merges: XLSX.Range[] = [];

      // Merge title row across all columns (row 0, columns 0 to numCols-1)
      if (numCols > 1) {
        merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } });
      }

      // Apply title style to the merged cell
      const titleCellRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
      if (worksheet[titleCellRef]) {
        worksheet[titleCellRef].s = createTitleStyle();
      }

      // Style data rows (starting from row 2)
      const dataStartRow = 2;

      for (let row = dataStartRow; row <= range.e.r; row++) {
        const dataRowIndex = row - dataStartRow;
        const isHeaderRow = dataRowIndex === 0 && hasHeader;
        const isEvenDataRow = (dataRowIndex - (hasHeader ? 1 : 0)) % 2 === 0;

        for (let col = 0; col < numCols; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
          let cell = worksheet[cellRef];

          // Create cell if it doesn't exist
          if (!cell) {
            worksheet[cellRef] = { v: '', t: 's' };
            cell = worksheet[cellRef];
          }

          const columnType = metadata?.columnTypes?.[col];

          if (isHeaderRow) {
            cell.s = createHeaderStyle(columnType);
          } else {
            cell.s = createDataCellStyle(isEvenDataRow, columnType);

            // Format numbers and currency
            if (columnType === 'currency' || columnType === 'number') {
              const value = cell.v;
              if (typeof value === 'string' && value.trim()) {
                // Remove all currency symbols and formatting to get the numeric value
                const numValue = parseFloat(value.replace(/[₦$€£,\s]/g, ''));
                if (!isNaN(numValue)) {
                  cell.v = numValue;
                  cell.t = 'n';

                  // Use the detected currency symbol, or no symbol if none was detected
                  if (columnType === 'currency') {
                    const currencySymbol = metadata?.columnCurrencySymbols?.[col];
                    if (currencySymbol === '₦') {
                      cell.z = '₦#,##0.00'; // Naira format
                    } else if (currencySymbol === '€') {
                      cell.z = '€#,##0.00'; // Euro format
                    } else if (currencySymbol === '£') {
                      cell.z = '£#,##0.00'; // Pound format
                    } else if (currencySymbol === '$') {
                      cell.z = '$#,##0.00'; // Dollar format
                    } else {
                      // No currency symbol detected - just format as number (preserve original value appearance)
                      cell.z = '#,##0.00';
                    }
                  } else {
                    cell.z = '#,##0.00';
                  }
                }
              }
            }
          }
        }
      }

      // Apply merges
      worksheet['!merges'] = merges;

      // Calculate and set column widths based on actual data (not title)
      const colWidths = calculateColumnWidths(table.rows);
      worksheet['!cols'] = colWidths.map((w) => ({
        wch: Math.min(Math.max(w + 4, 10), 50)
      }));

      // Set row heights
      const rowHeights: XLSX.RowInfo[] = [];
      rowHeights[0] = { hpt: 24 };  // Title row
      rowHeights[1] = { hpt: 6 };   // Spacing row (smaller)
      if (hasHeader) {
        rowHeights[2] = { hpt: 26 }; // Header row
      }
      worksheet['!rows'] = rowHeights;

      // Sheet name with table info
      const sheetName = `Table ${index + 1} (P${table.pageNumber})`.slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // Add summary sheet if multiple tables
    if (result.tables.length > 1) {
      addSummarySheet(workbook, result.tables);
    }

  } else if (result.textContent.length > 0) {
    // Text mode with enhanced styling
    onProgress?.(85, 'Creating styled text content sheet...');

    const data: (string | number)[][] = [
      ['Page', 'Content'],
      ...result.textContent.map((item) => [item.page, item.content]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    // Style all cells
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellRef];

        if (cell) {
          if (row === 0) {
            // Header row
            cell.s = createTextModeHeaderStyle();
          } else {
            const isEven = row % 2 === 0;
            if (col === 0) {
              // Page number column
              cell.s = createPageCellStyle(isEven);
            } else {
              // Content column
              cell.s = createContentCellStyle(isEven);
            }
          }
        }
      }
    }

    // Set column widths - Page column narrow, Content column wide
    worksheet['!cols'] = [
      { wch: 8 },   // Page column
      { wch: 100 }, // Content column
    ];

    // Set row heights
    worksheet['!rows'] = [{ hpt: 28 }]; // Header row

    XLSX.utils.book_append_sheet(workbook, worksheet, 'PDF_Content');
  }

  onProgress?.(95, 'Generating Excel file...');

  // Generate the Excel file
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  onProgress?.(100, 'Complete!');

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function addSummarySheet(workbook: XLSX.WorkBook, tables: ConversionResult['tables']) {
  const summaryData: (string | number)[][] = [
    ['Extraction Summary', '', '', ''],
    ['', '', '', ''],
    ['Table #', 'Source', 'Rows', 'Columns'],
  ];

  tables.forEach((table, index) => {
    const enhancedTable = table as EnhancedExtractedTable;
    summaryData.push([
      index + 1,
      table.source,
      table.rows.length,
      enhancedTable.metadata?.totalCols ?? Math.max(...table.rows.map(r => r.length)),
    ]);
  });

  // Add total row
  const totalRows = tables.reduce((sum, t) => sum + t.rows.length, 0);
  summaryData.push(['', '', '', '']);
  summaryData.push(['Total', '', totalRows, '']);

  const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  // Merge and style title
  worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

  const titleCell = worksheet['A1'];
  if (titleCell) {
    titleCell.s = createTitleStyle();
  }

  // Style header row (row 2)
  for (let col = 0; col <= 3; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 2, c: col });
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = createHeaderStyle();
    }
  }

  // Style data rows
  for (let row = 3; row <= range.e.r - 2; row++) {
    const isEven = (row - 3) % 2 === 0;
    for (let col = 0; col <= 3; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = createDataCellStyle(isEven, col === 0 ? 'number' : 'text');
      }
    }
  }

  // Style total row
  const totalRowIndex = range.e.r;
  for (let col = 0; col <= 3; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: totalRowIndex, c: col });
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = {
        font: { bold: true, sz: 11, color: { rgb: COLORS.totalsText } },
        fill: { fgColor: { rgb: COLORS.totalsBg }, patternType: 'solid' },
        alignment: { horizontal: col === 0 ? 'left' : 'center' },
        border: {
          top: { style: 'medium', color: { rgb: COLORS.borderMedium } },
          bottom: { style: 'medium', color: { rgb: COLORS.borderMedium } },
        },
      };
    }
  }

  // Set column widths
  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 25 },
    { wch: 10 },
    { wch: 10 },
  ];

  // Set row heights
  worksheet['!rows'] = [
    { hpt: 24 },  // Title row
    { hpt: 6 },   // Spacing row
    { hpt: 26 },  // Header row
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
}

function calculateColumnWidths(rows: string[][]): number[] {
  if (rows.length === 0) return [];

  const maxCols = Math.max(...rows.map((r) => r.length));
  const widths: number[] = new Array(maxCols).fill(0);

  rows.forEach((row) => {
    row.forEach((cell, colIndex) => {
      if (colIndex < maxCols) {
        const cellLength = (cell || '').toString().length;
        widths[colIndex] = Math.max(widths[colIndex], cellLength);
      }
    });
  });

  return widths;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.replace(/\.pdf$/i, '.xlsx');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
