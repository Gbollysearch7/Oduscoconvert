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
};

// Style factory functions
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
    // Add each table as a separate sheet - direct 1:1 conversion, no extra rows
    result.tables.forEach((table, index) => {
      onProgress?.(80 + Math.floor((index / result.tables.length) * 15), `Styling table ${index + 1}...`);

      const enhancedTable = table as EnhancedExtractedTable;
      const hasMetadata = 'metadata' in enhancedTable;
      const metadata = hasMetadata ? enhancedTable.metadata : null;
      const hasHeader = metadata?.hasDetectedHeader ?? false;

      // Get the number of columns from the data
      const numCols = Math.max(...table.rows.map(r => r.length));

      // Build sheet data - DIRECT conversion, no extra rows
      const sheetData: (string | number)[][] = [];

      // Add table data directly - exactly as in the PDF
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

      // Style data rows (starting from row 0 - no extra rows)
      for (let row = 0; row <= range.e.r; row++) {
        const isHeaderRow = row === 0 && hasHeader;
        const isEvenDataRow = (row - (hasHeader ? 1 : 0)) % 2 === 0;

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

            // Format currency ONLY if a currency symbol was actually detected in the PDF
            if (columnType === 'currency') {
              const currencySymbol = metadata?.columnCurrencySymbols?.[col];

              // Only apply currency formatting if a currency symbol was actually detected
              if (currencySymbol) {
                const value = cell.v;
                if (typeof value === 'string' && value.trim()) {
                  // Remove all currency symbols and formatting to get the numeric value
                  const numValue = parseFloat(value.replace(/[₦$€£,\s]/g, ''));
                  if (!isNaN(numValue)) {
                    cell.v = numValue;
                    cell.t = 'n';

                    // Apply the detected currency format
                    if (currencySymbol === '₦') {
                      cell.z = '₦#,##0.00'; // Naira format
                    } else if (currencySymbol === '€') {
                      cell.z = '€#,##0.00'; // Euro format
                    } else if (currencySymbol === '£') {
                      cell.z = '£#,##0.00'; // Pound format
                    } else if (currencySymbol === '$') {
                      cell.z = '$#,##0.00'; // Dollar format
                    }
                  }
                }
              }
              // If no currency symbol detected, leave the cell as-is (original text)
            }
            // For regular numbers without currency symbols, leave them exactly as they appear
            // Do NOT convert or add any formatting - preserve the original representation
          }
        }
      }

      // Calculate and set column widths based on actual data
      const colWidths = calculateColumnWidths(table.rows);
      worksheet['!cols'] = colWidths.map((w) => ({
        wch: Math.min(Math.max(w + 4, 10), 50)
      }));

      // Set row heights - only for header if detected
      const rowHeights: XLSX.RowInfo[] = [];
      if (hasHeader) {
        rowHeights[0] = { hpt: 26 }; // Header row
      }
      worksheet['!rows'] = rowHeights;

      // Sheet name with table info
      const sheetName = `Table ${index + 1} (P${table.pageNumber})`.slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

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
