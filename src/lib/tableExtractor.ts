import type { TextItem, ExtractedTable } from './types';

const ROW_TOLERANCE = 8; // Y-coordinate tolerance for grouping items into rows
const COL_GAP_THRESHOLD = 12; // Minimum gap to detect column separation
const MIN_TABLE_ROWS = 2; // Minimum rows to be considered a table
const MIN_TABLE_COLS = 2; // Minimum columns to be considered a table

interface Row {
  y: number;
  items: TextItem[];
  avgHeight: number;
}

interface TableMetadata {
  hasDetectedHeader: boolean;
  columnTypes: ('text' | 'number' | 'currency' | 'date' | 'mixed')[];
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

    // Detect column boundaries using improved algorithm
    const columnBoundaries = detectColumnBoundaries(rows);

    if (columnBoundaries.length >= MIN_TABLE_COLS) {
      // Build table grid
      const tableRows = rows.map((row) => assignItemsToColumns(row.items, columnBoundaries));

      // Filter out mostly-empty rows
      const filteredRows = tableRows.filter(
        (row) => row.filter((cell) => cell.trim()).length >= Math.max(1, MIN_TABLE_COLS - 1)
      );

      if (filteredRows.length >= MIN_TABLE_ROWS) {
        tableIndex++;

        // Detect if first row is a header
        const headerInfo = detectHeader(filteredRows);
        const metadata = analyzeTableMetadata(filteredRows, headerInfo.isHeader);

        tables.push({
          rows: filteredRows,
          source: `Page ${pageNum}, Table ${tableIndex}`,
          pageNumber: pageNum,
          metadata,
          headerRow: headerInfo.isHeader ? filteredRows[0] : null,
        });
      }
    }
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

function detectColumnBoundaries(rows: Row[]): number[] {
  // Collect all x-positions across all rows with their frequencies
  const xPositionCounts = new Map<number, number>();

  rows.forEach((row) => {
    row.items.forEach((item) => {
      // Round to nearest 5 pixels for clustering
      const roundedX = Math.round(item.x / 5) * 5;
      xPositionCounts.set(roundedX, (xPositionCounts.get(roundedX) || 0) + 1);
    });
  });

  if (xPositionCounts.size === 0) return [];

  // Get positions sorted by frequency (most common first), then by position
  const sortedPositions = Array.from(xPositionCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([x]) => x);

  // Build boundaries from most common positions
  const boundaries: number[] = [];

  sortedPositions.forEach((x) => {
    // Check if this position is far enough from existing boundaries
    const isFarEnough = boundaries.every((b) => Math.abs(x - b) > COL_GAP_THRESHOLD);
    if (isFarEnough) {
      boundaries.push(x);
    }
  });

  // Sort boundaries left to right
  boundaries.sort((a, b) => a - b);

  return boundaries;
}

function assignItemsToColumns(items: TextItem[], boundaries: number[]): string[] {
  const cells: string[] = new Array(boundaries.length).fill('');

  items.forEach((item) => {
    // Find the closest column boundary
    let colIndex = 0;
    let minDist = Math.abs(item.x - boundaries[0]);

    for (let i = 1; i < boundaries.length; i++) {
      const dist = Math.abs(item.x - boundaries[i]);
      if (dist < minDist) {
        minDist = dist;
        colIndex = i;
      }
    }

    // Append text to the cell (with space if needed)
    if (cells[colIndex]) {
      cells[colIndex] += ' ' + item.str;
    } else {
      cells[colIndex] = item.str;
    }
  });

  return cells.map((cell) => cell.trim());
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

  if (firstRowNumericRatio < 0.3 && avgRestNumericRatio > 0.5) {
    headerScore += 2; // Strong indicator
  }

  // Check 2: First row cells look like headers (short, capitalized, no special chars)
  const headerLikeCount = firstRow.filter((cell) => isHeaderLike(cell)).length;
  if (headerLikeCount > firstRow.length * 0.6) {
    headerScore += 1.5;
  }

  // Check 3: First row has no empty cells while data rows might
  const firstRowEmptyCount = firstRow.filter((c) => !c.trim()).length;
  const avgEmptyInRest = restRows.reduce((sum, row) =>
    sum + row.filter((c) => !c.trim()).length, 0) / restRows.length;

  if (firstRowEmptyCount === 0 && avgEmptyInRest > 0) {
    headerScore += 0.5;
  }

  // Check 4: Common header keywords
  const headerKeywords = ['id', 'name', 'date', 'amount', 'total', 'description', 'type',
    'status', 'number', 'no', 'qty', 'quantity', 'price', 'value', 'code', 'ref'];
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
    const cleaned = cell.replace(/[$,\s%]/g, '');
    return !isNaN(parseFloat(cleaned)) && isFinite(parseFloat(cleaned));
  });

  return numericCells.length / nonEmptyCells.length;
}

function isHeaderLike(text: string): boolean {
  if (!text.trim()) return false;

  // Short text (likely a label)
  if (text.length <= 30) {
    // Starts with capital or is all caps
    if (text[0] === text[0].toUpperCase() || text === text.toUpperCase()) {
      // Doesn't look like a number or currency
      const cleaned = text.replace(/[$,\s%]/g, '');
      if (isNaN(parseFloat(cleaned))) {
        return true;
      }
    }
  }
  return false;
}

function detectColumnType(values: string[]): 'text' | 'number' | 'currency' | 'date' | 'mixed' {
  const nonEmpty = values.filter((v) => v.trim());
  if (nonEmpty.length === 0) return 'text';

  let numberCount = 0;
  let currencyCount = 0;
  let dateCount = 0;
  let textCount = 0;

  nonEmpty.forEach((value) => {
    if (/^\$[\d,]+\.?\d*$|^[\d,]+\.?\d*\s*(?:USD|EUR|GBP|NGN)?$/i.test(value)) {
      currencyCount++;
    } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$|^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(value)) {
      dateCount++;
    } else if (/^-?[\d,]+\.?\d*%?$/.test(value.replace(/\s/g, ''))) {
      numberCount++;
    } else {
      textCount++;
    }
  });

  const total = nonEmpty.length;
  const threshold = 0.6;

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

  for (let col = 0; col < numCols; col++) {
    const columnValues = dataRows.map((row) => row[col] || '');
    columnTypes.push(detectColumnType(columnValues));
  }

  return {
    hasDetectedHeader: hasHeader,
    columnTypes,
    totalRows: rows.length,
    totalCols: numCols,
  };
}

// Alternative extraction for documents without clear table structure
function extractTablesAlternative(textItems: TextItem[]): EnhancedExtractedTable[] {
  // Group by page
  const pageGroups = new Map<number, TextItem[]>();
  textItems.forEach((item) => {
    const items = pageGroups.get(item.page) || [];
    items.push(item);
    pageGroups.set(item.page, items);
  });

  const tables: EnhancedExtractedTable[] = [];

  pageGroups.forEach((items, pageNum) => {
    // Simple row-based extraction
    const rows = groupIntoRows(items);

    if (rows.length >= MIN_TABLE_ROWS) {
      // Just concatenate items in each row
      const tableRows = rows.map((row) => {
        const text = row.items.map((item) => item.str).join(' ');
        // Try to split by multiple spaces or tabs
        const cells = text.split(/\s{2,}|\t/).map((s) => s.trim()).filter(Boolean);
        return cells.length > 0 ? cells : [text];
      });

      // Normalize column count
      const maxCols = Math.max(...tableRows.map((r) => r.length));
      const normalizedRows = tableRows.map((row) => {
        while (row.length < maxCols) row.push('');
        return row;
      });

      const headerInfo = detectHeader(normalizedRows);
      const metadata = analyzeTableMetadata(normalizedRows, headerInfo.isHeader);

      tables.push({
        rows: normalizedRows,
        source: `Page ${pageNum}`,
        pageNumber: pageNum,
        metadata,
        headerRow: headerInfo.isHeader ? normalizedRows[0] : null,
      });
    }
  });

  return tables;
}
