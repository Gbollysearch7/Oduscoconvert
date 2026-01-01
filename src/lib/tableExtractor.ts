import type { TextItem, ExtractedTable } from './types';

const ROW_TOLERANCE = 5; // Y-coordinate tolerance for grouping items into rows
const MIN_TABLE_ROWS = 2; // Minimum rows to be considered a table
const MIN_TABLE_COLS = 2; // Minimum columns to be considered a table
const MIN_COL_GAP = 15; // Minimum gap between columns

interface Row {
  y: number;
  items: TextItem[];
  avgHeight: number;
}

interface TableRegion {
  startY: number;
  endY: number;
  rows: Row[];
  letterheadRows: Row[]; // Rows before the table that contain letterhead/header content
}

interface TableMetadata {
  hasDetectedHeader: boolean;
  columnTypes: ('text' | 'number' | 'currency' | 'date' | 'mixed')[];
  columnCurrencySymbols: (string | null)[];
  totalRows: number;
  totalCols: number;
}

export interface EnhancedExtractedTable extends ExtractedTable {
  metadata: TableMetadata;
  headerRow: string[] | null;
}

export function extractTables(
  textItems: TextItem[],
  onProgress?: (progress: number, step: string) => void
): EnhancedExtractedTable[] {
  onProgress?.(55, 'Analyzing document structure...');

  // Group items by page
  const pageGroups = new Map<number, TextItem[]>();
  textItems.forEach((item) => {
    const items = pageGroups.get(item.page) || [];
    items.push(item);
    pageGroups.set(item.page, items);
  });

  const tables: EnhancedExtractedTable[] = [];
  let tableIndex = 0;
  const totalPages = pageGroups.size;

  pageGroups.forEach((items, pageNum) => {
    const progressPercent = 55 + Math.floor((pageNum / totalPages) * 20);
    onProgress?.(progressPercent, `Detecting tables on page ${pageNum}...`);

    // Group items into rows by y-coordinate
    const rows = groupIntoRows(items);

    // Detect table regions (rows that form a tabular structure)
    const tableRegions = detectTableRegions(rows);

    tableRegions.forEach((region) => {
      // Detect column boundaries for this specific region
      const columnBoundaries = detectColumnBoundariesForRegion(region.rows);

      if (columnBoundaries.length >= MIN_TABLE_COLS) {
        // Build table grid
        const tableRows = region.rows.map((row) => assignItemsToColumns(row.items, columnBoundaries));

        // Filter out mostly-empty rows
        const filteredRows = tableRows.filter(
          (row) => row.filter((cell) => cell.trim()).length >= Math.max(1, MIN_TABLE_COLS - 1)
        );

        if (filteredRows.length >= MIN_TABLE_ROWS) {
          tableIndex++;

          // Drop completely empty columns
          const cleanedRows = dropEmptyColumns(filteredRows);

          if (cleanedRows.length > 0 && cleanedRows[0].length >= MIN_TABLE_COLS) {
            // Detect if first row is a header
            const headerInfo = detectHeader(cleanedRows);
            const metadata = analyzeTableMetadata(cleanedRows, headerInfo.isHeader);

            // Extract letterhead content (combine each row's items into a single string)
            const letterhead = region.letterheadRows.map((row) => {
              // Sort items by x position and concatenate
              const sortedItems = [...row.items].sort((a, b) => a.x - b.x);
              return sortedItems.map((item) => item.str).join(' ').trim();
            }).filter((text) => text.length > 0); // Remove empty lines

            tables.push({
              rows: cleanedRows,
              source: `Page ${pageNum}, Table ${tableIndex}`,
              pageNumber: pageNum,
              metadata,
              headerRow: headerInfo.isHeader ? cleanedRows[0] : null,
              letterhead: letterhead.length > 0 ? letterhead : undefined,
            });
          }
        }
      }
    });
  });

  // If no tables found, try a more aggressive extraction
  if (tables.length === 0) {
    onProgress?.(70, 'No structured tables found, trying alternative extraction...');
    const alternativeTables = extractTablesAlternative(textItems);
    tables.push(...alternativeTables);
  }

  onProgress?.(75, `Found ${tables.length} table(s)`);
  return tables;
}

/**
 * Detect regions in the document that look like tables
 * A table region has consistent column alignment across multiple rows
 * Also captures letterhead content that appears before each table
 */
function detectTableRegions(rows: Row[]): TableRegion[] {
  if (rows.length < MIN_TABLE_ROWS) return [];

  const regions: TableRegion[] = [];
  let currentRegion: TableRegion | null = null;
  let potentialLetterhead: Row[] = []; // Rows that might be letterhead (before a table)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowScore = scoreRowAsTableRow(row, rows, i);

    if (rowScore >= 0.5) {
      // This row looks like part of a table
      if (!currentRegion) {
        currentRegion = {
          startY: row.y,
          endY: row.y,
          rows: [row],
          letterheadRows: [...potentialLetterhead], // Capture letterhead rows collected so far
        };
        potentialLetterhead = []; // Reset for next table region
      } else {
        currentRegion.endY = row.y;
        currentRegion.rows.push(row);
      }
    } else {
      // This row doesn't look like part of a table
      if (currentRegion && currentRegion.rows.length >= MIN_TABLE_ROWS) {
        regions.push(currentRegion);
        currentRegion = null;
        potentialLetterhead = []; // Reset letterhead after table ends
      } else if (!currentRegion) {
        // Not in a table region - this could be letterhead content
        potentialLetterhead.push(row);
      }
      if (currentRegion) {
        currentRegion = null;
      }
    }
  }

  // Don't forget the last region
  if (currentRegion && currentRegion.rows.length >= MIN_TABLE_ROWS) {
    regions.push(currentRegion);
  }

  return regions;
}

/**
 * Score how likely a row is part of a table (0 to 1)
 */
function scoreRowAsTableRow(row: Row, allRows: Row[], rowIndex: number): number {
  let score = 0;

  // Check 1: Row has multiple items (columns)
  if (row.items.length >= 2) {
    score += 0.3;
  }
  if (row.items.length >= 3) {
    score += 0.2;
  }

  // Check 2: Items have clear gaps between them (column separation)
  const gaps = getGapsBetweenItems(row.items);
  const hasConsistentGaps = gaps.length > 0 && gaps.some((g) => g >= MIN_COL_GAP);
  if (hasConsistentGaps) {
    score += 0.3;
  }

  // Check 3: Row aligns with neighboring rows (same x-positions)
  const neighborRows = [
    allRows[rowIndex - 1],
    allRows[rowIndex + 1],
  ].filter(Boolean);

  if (neighborRows.length > 0) {
    const alignmentScore = calculateAlignmentWithNeighbors(row, neighborRows);
    score += alignmentScore * 0.2;
  }

  // Check 4: Row is not a header/footer line (single centered text, or very large font)
  const avgFontSize = row.items.reduce((sum, item) => sum + (item.fontSize || 12), 0) / row.items.length;
  const isSingleCenteredText = row.items.length === 1;

  // Penalize single-item rows or very large text (likely headers)
  if (isSingleCenteredText || avgFontSize > 14) {
    score -= 0.3;
  }

  // Check 5: Contains data-like content (numbers, dates, short text)
  const hasDataContent = row.items.some((item) => {
    const text = item.str.trim();
    // Numbers, dates, currency, account numbers, short text
    return /^\d+[\d,.\-\/]*$/.test(text) || // Numbers/dates
           /^\d{4,}$/.test(text) || // Account numbers
           text.length < 50; // Short text
  });
  if (hasDataContent) {
    score += 0.1;
  }

  return Math.min(Math.max(score, 0), 1);
}

/**
 * Get gaps between consecutive items in a row
 */
function getGapsBetweenItems(items: TextItem[]): number[] {
  if (items.length < 2) return [];

  const sorted = [...items].sort((a, b) => a.x - b.x);
  const gaps: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].x + sorted[i - 1].width;
    const currStart = sorted[i].x;
    gaps.push(currStart - prevEnd);
  }

  return gaps;
}

/**
 * Calculate how well a row aligns with its neighbors
 */
function calculateAlignmentWithNeighbors(row: Row, neighbors: Row[]): number {
  const rowXPositions = row.items.map((item) => Math.round(item.x / 5) * 5);

  let totalMatches = 0;
  let totalChecks = 0;

  neighbors.forEach((neighbor) => {
    const neighborXPositions = neighbor.items.map((item) => Math.round(item.x / 5) * 5);

    rowXPositions.forEach((x) => {
      totalChecks++;
      // Check if any neighbor item aligns within 10px
      if (neighborXPositions.some((nx) => Math.abs(nx - x) <= 10)) {
        totalMatches++;
      }
    });
  });

  return totalChecks > 0 ? totalMatches / totalChecks : 0;
}

/**
 * Detect column boundaries for a specific table region
 */
function detectColumnBoundariesForRegion(rows: Row[]): number[] {
  // Collect all x-positions and their right edges
  const positions: { x: number; rightEdge: number }[] = [];

  rows.forEach((row) => {
    row.items.forEach((item) => {
      positions.push({
        x: item.x,
        rightEdge: item.x + item.width,
      });
    });
  });

  if (positions.length === 0) return [];

  // Cluster x-positions to find column starts
  const clusters = clusterXPositions(positions.map((p) => p.x));

  // Sort clusters by position
  clusters.sort((a, b) => a - b);

  return clusters;
}

/**
 * Cluster x-positions using a simple gap-based algorithm
 */
function clusterXPositions(positions: number[]): number[] {
  if (positions.length === 0) return [];

  // Sort positions
  const sorted = [...positions].sort((a, b) => a - b);

  // Group positions that are close together
  const clusters: number[][] = [];
  let currentCluster: number[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap <= 10) {
      // Same cluster
      currentCluster.push(sorted[i]);
    } else {
      // New cluster
      clusters.push(currentCluster);
      currentCluster = [sorted[i]];
    }
  }
  clusters.push(currentCluster);

  // Get the most common (mode) position in each cluster
  return clusters.map((cluster) => {
    // Use the minimum x position in each cluster (left edge of column)
    return Math.min(...cluster);
  });
}

/**
 * Assign items to columns based on boundaries
 */
function assignItemsToColumns(items: TextItem[], boundaries: number[]): string[] {
  const cells: string[] = new Array(boundaries.length).fill('');

  // Sort items by x position
  const sortedItems = [...items].sort((a, b) => a.x - b.x);

  sortedItems.forEach((item) => {
    // Find which column this item belongs to
    // An item belongs to a column if its x position is >= the column boundary
    // and < the next column boundary (or end of row)
    let colIndex = -1;

    for (let i = 0; i < boundaries.length; i++) {
      const colStart = boundaries[i];
      const colEnd = boundaries[i + 1] || Infinity;

      // Check if item starts within this column's range (with some tolerance)
      if (item.x >= colStart - 10 && item.x < colEnd - 10) {
        colIndex = i;
        break;
      }
    }

    // If no exact match, find the closest column
    if (colIndex === -1) {
      let minDist = Infinity;
      for (let i = 0; i < boundaries.length; i++) {
        const dist = Math.abs(item.x - boundaries[i]);
        if (dist < minDist) {
          minDist = dist;
          colIndex = i;
        }
      }
    }

    if (colIndex >= 0 && colIndex < cells.length) {
      // Append text to the cell (with space if needed)
      if (cells[colIndex]) {
        cells[colIndex] += ' ' + item.str;
      } else {
        cells[colIndex] = item.str;
      }
    }
  });

  return cells.map((cell) => cell.trim());
}

/**
 * Remove columns that are completely empty across all rows
 */
function dropEmptyColumns(rows: string[][]): string[][] {
  if (rows.length === 0) return rows;

  const numCols = Math.max(...rows.map((r) => r.length));
  const columnsToKeep: number[] = [];

  // Check each column for at least one non-empty value
  for (let col = 0; col < numCols; col++) {
    const hasContent = rows.some((row) => (row[col] || '').trim() !== '');
    if (hasContent) {
      columnsToKeep.push(col);
    }
  }

  // Return rows with only non-empty columns
  return rows.map((row) => columnsToKeep.map((colIndex) => row[colIndex] || ''));
}

function groupIntoRows(items: TextItem[]): Row[] {
  // Sort by y-coordinate (top to bottom)
  const sortedItems = [...items].sort((a, b) => a.y - b.y);

  const rows: Row[] = [];
  let currentRow: Row | null = null;

  sortedItems.forEach((item) => {
    if (!currentRow || Math.abs(item.y - currentRow.y) > ROW_TOLERANCE) {
      // Start new row
      currentRow = { y: item.y, items: [item], avgHeight: item.height };
      rows.push(currentRow);
    } else {
      // Add to current row
      currentRow.items.push(item);
      // Update average height
      currentRow.avgHeight =
        (currentRow.avgHeight * (currentRow.items.length - 1) + item.height) / currentRow.items.length;
    }
  });

  // Sort items within each row by x-coordinate (left to right)
  rows.forEach((row) => {
    row.items.sort((a, b) => a.x - b.x);
  });

  return rows;
}

function detectHeader(rows: string[][]): { isHeader: boolean; confidence: number } {
  if (rows.length < 2) return { isHeader: false, confidence: 0 };

  const firstRow = rows[0];
  const restRows = rows.slice(1);

  let headerScore = 0;
  const maxScore = 5;

  // Check 1: First row has different pattern than others (mostly text vs numbers)
  const firstRowNumericRatio = getNumericRatio(firstRow);
  const restNumericRatios = restRows.map(getNumericRatio);
  const avgRestNumericRatio = restNumericRatios.reduce((a, b) => a + b, 0) / restNumericRatios.length;

  if (firstRowNumericRatio < 0.3 && avgRestNumericRatio > 0.3) {
    headerScore += 2;
  }

  // Check 2: First row cells look like headers (short, capitalized, no special chars)
  const headerLikeCount = firstRow.filter((cell) => isHeaderLike(cell)).length;
  if (headerLikeCount > firstRow.length * 0.5) {
    headerScore += 1.5;
  }

  // Check 3: First row has no empty cells while data rows might
  const firstRowEmptyCount = firstRow.filter((c) => !c.trim()).length;
  const avgEmptyInRest =
    restRows.reduce((sum, row) => sum + row.filter((c) => !c.trim()).length, 0) / restRows.length;

  if (firstRowEmptyCount === 0 && avgEmptyInRest > 0) {
    headerScore += 0.5;
  }

  // Check 4: Common header keywords
  const headerKeywords = [
    'id', 'name', 'date', 'amount', 'total', 'description', 'type',
    'status', 'number', 'no', 'qty', 'quantity', 'price', 'value',
    'code', 'ref', 'account', 'rate', 'customer', 'int',
  ];
  const hasHeaderKeywords = firstRow.some((cell) =>
    headerKeywords.some((kw) => cell.toLowerCase().includes(kw))
  );
  if (hasHeaderKeywords) {
    headerScore += 1;
  }

  return {
    isHeader: headerScore >= 2,
    confidence: Math.min(headerScore / maxScore, 1),
  };
}

function getNumericRatio(row: string[]): number {
  const nonEmptyCells = row.filter((c) => c.trim());
  if (nonEmptyCells.length === 0) return 0;

  const numericCells = nonEmptyCells.filter((cell) => {
    const cleaned = cell.replace(/[$₦€£,\s%]/g, '');
    return !isNaN(parseFloat(cleaned)) && isFinite(parseFloat(cleaned));
  });

  return numericCells.length / nonEmptyCells.length;
}

function isHeaderLike(text: string): boolean {
  if (!text.trim()) return false;

  // Short text (likely a label)
  if (text.length <= 40) {
    // Starts with capital or is all caps
    if (text[0] === text[0].toUpperCase() || text === text.toUpperCase()) {
      // Doesn't look like a number or currency
      const cleaned = text.replace(/[$₦€£,\s%]/g, '');
      if (isNaN(parseFloat(cleaned))) {
        return true;
      }
    }
  }
  return false;
}

// Detect the currency symbol used in values (if any)
export function detectCurrencySymbol(values: string[]): string | null {
  const currencyPatterns = [
    { symbol: '₦', pattern: /₦/ },
    { symbol: 'NGN', pattern: /NGN/i },
    { symbol: '=N=', pattern: /=N=/ },
    { symbol: '$', pattern: /\$/ },
    { symbol: 'USD', pattern: /USD/i },
    { symbol: '€', pattern: /€/ },
    { symbol: 'EUR', pattern: /EUR/i },
    { symbol: '£', pattern: /£/ },
    { symbol: 'GBP', pattern: /GBP/i },
  ];

  for (const { symbol, pattern } of currencyPatterns) {
    const matchCount = values.filter((v) => pattern.test(v)).length;
    if (matchCount > 0) {
      // Normalize to standard symbols
      if (symbol === 'NGN' || symbol === '=N=') return '₦';
      if (symbol === 'USD') return '$';
      if (symbol === 'EUR') return '€';
      if (symbol === 'GBP') return '£';
      return symbol;
    }
  }
  return null;
}

function detectColumnType(values: string[]): 'text' | 'number' | 'currency' | 'date' | 'mixed' {
  const nonEmpty = values.filter((v) => v.trim());
  if (nonEmpty.length === 0) return 'text';

  let numberCount = 0;
  let currencyCount = 0;
  let dateCount = 0;
  let textCount = 0;

  const currencyPattern = /^[₦$€£][\d,]+\.?\d*$|^[\d,]+\.?\d*\s*[₦$€£]?$|^=N=\s*[\d,]+\.?\d*$/i;

  nonEmpty.forEach((value) => {
    // Check for currency symbols or codes
    if (currencyPattern.test(value) || /[₦$€£]|NGN|USD|EUR|GBP|=N=/i.test(value)) {
      currencyCount++;
    } else if (
      /^\d{1,2}[\/\-]\w{3}[\/\-]\d{2,4}$/i.test(value) || // 24-Dec-2025
      /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(value) || // 24/12/2025
      /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(value) // 2025-12-24
    ) {
      dateCount++;
    } else if (/^-?[\d,]+\.?\d*%?$/.test(value.replace(/\s/g, ''))) {
      numberCount++;
    } else {
      textCount++;
    }
  });

  const total = nonEmpty.length;
  const threshold = 0.5;

  if (currencyCount / total >= threshold) return 'currency';
  if (dateCount / total >= threshold) return 'date';
  if (numberCount / total >= threshold) return 'number';
  if (textCount / total >= threshold) return 'text';
  return 'mixed';
}

function analyzeTableMetadata(rows: string[][], hasHeader: boolean): TableMetadata {
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const numCols = Math.max(...rows.map((r) => r.length));

  const columnTypes: ('text' | 'number' | 'currency' | 'date' | 'mixed')[] = [];
  const columnCurrencySymbols: (string | null)[] = [];

  for (let col = 0; col < numCols; col++) {
    const columnValues = dataRows.map((row) => row[col] || '');
    const colType = detectColumnType(columnValues);
    columnTypes.push(colType);

    if (colType === 'currency') {
      columnCurrencySymbols.push(detectCurrencySymbol(columnValues));
    } else {
      columnCurrencySymbols.push(null);
    }
  }

  return {
    hasDetectedHeader: hasHeader,
    columnTypes,
    columnCurrencySymbols,
    totalRows: rows.length,
    totalCols: numCols,
  };
}

// Alternative extraction for documents without clear table structure
function extractTablesAlternative(textItems: TextItem[]): EnhancedExtractedTable[] {
  const pageGroups = new Map<number, TextItem[]>();
  textItems.forEach((item) => {
    const items = pageGroups.get(item.page) || [];
    items.push(item);
    pageGroups.set(item.page, items);
  });

  const tables: EnhancedExtractedTable[] = [];

  pageGroups.forEach((items, pageNum) => {
    const rows = groupIntoRows(items);

    // Find rows with multiple columns (gaps between items)
    const tableRows = rows
      .filter((row) => {
        const gaps = getGapsBetweenItems(row.items);
        return gaps.some((g) => g >= MIN_COL_GAP) || row.items.length >= 2;
      })
      .map((row) => {
        // Split row into columns based on gaps
        return splitRowByGaps(row.items);
      });

    if (tableRows.length >= MIN_TABLE_ROWS) {
      // Normalize column count
      const maxCols = Math.max(...tableRows.map((r) => r.length));
      const normalizedRows = tableRows.map((row) => {
        while (row.length < maxCols) row.push('');
        return row;
      });

      const cleanedRows = dropEmptyColumns(normalizedRows);

      if (cleanedRows.length > 0 && cleanedRows[0].length >= MIN_TABLE_COLS) {
        const headerInfo = detectHeader(cleanedRows);
        const metadata = analyzeTableMetadata(cleanedRows, headerInfo.isHeader);

        tables.push({
          rows: cleanedRows,
          source: `Page ${pageNum}`,
          pageNumber: pageNum,
          metadata,
          headerRow: headerInfo.isHeader ? cleanedRows[0] : null,
        });
      }
    }
  });

  return tables;
}

/**
 * Split a row into columns based on gaps between items
 */
function splitRowByGaps(items: TextItem[]): string[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [items[0].str];

  const sorted = [...items].sort((a, b) => a.x - b.x);
  const columns: string[] = [];
  let currentColumn = sorted[0].str;

  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].x + sorted[i - 1].width;
    const currStart = sorted[i].x;
    const gap = currStart - prevEnd;

    if (gap >= MIN_COL_GAP) {
      // New column
      columns.push(currentColumn.trim());
      currentColumn = sorted[i].str;
    } else {
      // Same column - append with space
      currentColumn += ' ' + sorted[i].str;
    }
  }

  columns.push(currentColumn.trim());
  return columns;
}
