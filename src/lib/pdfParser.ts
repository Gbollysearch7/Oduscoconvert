import type { TextItem, DocumentElement, DocumentStructure } from './types';

interface PDFTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName?: string;
}

// Lazy load pdfjs-dist
let pdfjsModule: typeof import('pdfjs-dist') | null = null;

async function getPdfJs() {
  if (pdfjsModule) return pdfjsModule;

  const pdfjs = await import('pdfjs-dist');

  // Set worker - use CDN for reliability
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

  pdfjsModule = pdfjs;
  return pdfjs;
}

// Constants for document structure detection
const TITLE_MIN_FONT_SIZE = 16;
const HEADING_MIN_FONT_SIZE = 13;
const SUBHEADING_MIN_FONT_SIZE = 11;
const BULLET_PATTERNS = /^[\u2022\u2023\u25E6\u2043\u2219•●○◦‣⁃\-\*]\s*/;
const NUMBERED_PATTERNS = /^(\d+[\.\)]\s*|\([a-z]\)\s*|[a-z][\.\)]\s*|[ivxIVX]+[\.\)]\s*)/;
const LEFT_MARGIN_THRESHOLD = 72; // ~1 inch
const INDENT_STEP = 36; // ~0.5 inch per indent level
const ROW_TOLERANCE = 5; // Y-coordinate tolerance for grouping items into rows
const MIN_COL_GAP = 20; // Minimum gap between columns to detect table
const MIN_TABLE_ROWS = 2;
const MIN_TABLE_COLS = 2;

export async function parsePdf(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number, step: string) => void
): Promise<TextItem[]> {
  onProgress?.(5, 'Loading PDF document...');

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const textItems: TextItem[] = [];
  const totalPages = pdf.numPages;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const progress = 10 + Math.floor((pageNum / totalPages) * 40);
    onProgress?.(progress, `Extracting page ${pageNum} of ${totalPages}...`);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();

    content.items.forEach((item) => {
      const textItem = item as PDFTextItem;
      if (textItem.str && textItem.str.trim()) {
        // Calculate font size from transform matrix
        const fontSize = Math.abs(textItem.transform[0]) || Math.abs(textItem.transform[3]) || 12;

        textItems.push({
          str: textItem.str,
          x: textItem.transform[4],
          y: viewport.height - textItem.transform[5],
          width: textItem.width,
          height: textItem.height || fontSize,
          page: pageNum,
          fontName: textItem.fontName,
          fontSize: fontSize,
        });
      }
    });
  }

  onProgress?.(50, 'PDF parsing complete');
  return textItems;
}

export async function extractDocumentStructure(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number, step: string) => void
): Promise<DocumentStructure> {
  onProgress?.(5, 'Loading PDF document...');

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const elements: DocumentElement[] = [];
  const totalPages = pdf.numPages;
  let documentTitle: string | undefined;
  let maxFontSize = 0;

  // Track font names for bold/italic detection
  const fontUsage = new Map<string, number>();

  // First pass: analyze fonts and find max font size
  const firstPage = await pdf.getPage(1);
  const firstViewport = firstPage.getViewport({ scale: 1.0 });
  const firstContent = await firstPage.getTextContent();

  firstContent.items.forEach((item) => {
    const textItem = item as PDFTextItem;
    if (textItem.str && textItem.str.trim()) {
      const fontSize = Math.abs(textItem.transform[0]) || Math.abs(textItem.transform[3]) || 12;
      if (fontSize > maxFontSize) {
        maxFontSize = fontSize;
      }
      // Track font usage
      if (textItem.fontName) {
        fontUsage.set(textItem.fontName, (fontUsage.get(textItem.fontName) || 0) + 1);
      }
    }
  });

  // Second pass: extract all elements with enhanced structure detection
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const progress = 10 + Math.floor((pageNum / totalPages) * 50);
    onProgress?.(progress, `Analyzing page ${pageNum} of ${totalPages}...`);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();

    // Group text items into lines
    const lines = groupIntoLines(content.items as PDFTextItem[], viewport.height);

    // Detect tables in this page
    const tableRegions = detectTableRegions(lines, viewport.width);

    // Process lines, handling table regions specially
    let lineIndex = 0;
    while (lineIndex < lines.length) {
      const line = lines[lineIndex];

      // Check if this line is part of a table region
      const tableRegion = tableRegions.find(
        (region) => lineIndex >= region.startIndex && lineIndex <= region.endIndex
      );

      if (tableRegion && lineIndex === tableRegion.startIndex) {
        // Extract table and add as single element
        const tableRows = extractTableRows(lines.slice(tableRegion.startIndex, tableRegion.endIndex + 1), viewport.width);
        if (tableRows.length >= MIN_TABLE_ROWS) {
          elements.push({
            type: 'table',
            content: `Table (${tableRows.length} rows)`,
            page: pageNum,
            tableData: {
              rows: tableRows,
              hasHeader: detectTableHeader(tableRows),
            },
          });
        }
        lineIndex = tableRegion.endIndex + 1;
        continue;
      }

      // Skip lines that are part of an already-processed table
      if (tableRegion) {
        lineIndex++;
        continue;
      }

      // Process regular line
      const element = classifyLine(line, maxFontSize, pageNum, viewport.width, fontUsage);

      // Detect title (largest text on first page, usually at top)
      if (pageNum === 1 && lineIndex < 5 && element.type === 'title' && !documentTitle) {
        documentTitle = element.content;
      }

      elements.push(element);
      lineIndex++;
    }

    // Extract images from page
    onProgress?.(progress + 2, `Extracting images from page ${pageNum}...`);
    const images = await extractImagesFromPage(page, viewport, pageNum);
    elements.push(...images);
  }

  // Clean up elements - merge consecutive paragraphs, clean whitespace
  const cleanedElements = cleanDocumentElements(elements);

  onProgress?.(75, 'Document structure extracted');

  return {
    title: documentTitle,
    elements: cleanedElements,
    pages: totalPages,
  };
}

interface LineGroup {
  y: number;
  items: PDFTextItem[];
  avgFontSize: number;
  minX: number;
  maxX: number;
  fontNames: string[];
}

interface TableRegion {
  startIndex: number;
  endIndex: number;
  columnBoundaries: number[];
}

function groupIntoLines(items: PDFTextItem[], pageHeight: number): LineGroup[] {
  const sortedItems = [...items]
    .filter((item) => item.str && item.str.trim())
    .sort((a, b) => {
      const yA = pageHeight - a.transform[5];
      const yB = pageHeight - b.transform[5];
      return yA - yB;
    });

  const lines: LineGroup[] = [];
  let currentLine: LineGroup | null = null;

  sortedItems.forEach((item) => {
    const y = pageHeight - item.transform[5];
    const x = item.transform[4];
    const fontSize = Math.abs(item.transform[0]) || Math.abs(item.transform[3]) || 12;

    if (!currentLine || Math.abs(y - currentLine.y) > ROW_TOLERANCE) {
      currentLine = {
        y,
        items: [item],
        avgFontSize: fontSize,
        minX: x,
        maxX: x + item.width,
        fontNames: item.fontName ? [item.fontName] : [],
      };
      lines.push(currentLine);
    } else {
      currentLine.items.push(item);
      currentLine.avgFontSize =
        (currentLine.avgFontSize * (currentLine.items.length - 1) + fontSize) / currentLine.items.length;
      currentLine.minX = Math.min(currentLine.minX, x);
      currentLine.maxX = Math.max(currentLine.maxX, x + item.width);
      if (item.fontName && !currentLine.fontNames.includes(item.fontName)) {
        currentLine.fontNames.push(item.fontName);
      }
    }
  });

  // Sort items within each line by x position
  lines.forEach((line) => {
    line.items.sort((a, b) => a.transform[4] - b.transform[4]);
  });

  return lines;
}

function detectTableRegions(lines: LineGroup[], pageWidth: number): TableRegion[] {
  const regions: TableRegion[] = [];
  let regionStart: number | null = null;
  let consecutiveTableRows = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableRow = isLikelyTableRow(line, pageWidth);

    if (isTableRow) {
      if (regionStart === null) {
        regionStart = i;
      }
      consecutiveTableRows++;
    } else {
      if (regionStart !== null && consecutiveTableRows >= MIN_TABLE_ROWS) {
        // Detect column boundaries for this region
        const regionLines = lines.slice(regionStart, i);
        const columnBoundaries = detectColumnBoundaries(regionLines);

        if (columnBoundaries.length >= MIN_TABLE_COLS) {
          regions.push({
            startIndex: regionStart,
            endIndex: i - 1,
            columnBoundaries,
          });
        }
      }
      regionStart = null;
      consecutiveTableRows = 0;
    }
  }

  // Handle region at end of page
  if (regionStart !== null && consecutiveTableRows >= MIN_TABLE_ROWS) {
    const regionLines = lines.slice(regionStart);
    const columnBoundaries = detectColumnBoundaries(regionLines);

    if (columnBoundaries.length >= MIN_TABLE_COLS) {
      regions.push({
        startIndex: regionStart,
        endIndex: lines.length - 1,
        columnBoundaries,
      });
    }
  }

  return regions;
}

function isLikelyTableRow(line: LineGroup, pageWidth: number): boolean {
  // Multiple items with gaps suggest table structure
  if (line.items.length < 2) return false;

  const gaps = getGapsBetweenItems(line.items);
  const hasSignificantGaps = gaps.some((g) => g >= MIN_COL_GAP);

  // Check if items are distributed across the width (not all clustered)
  const lineSpan = line.maxX - line.minX;
  const wideEnough = lineSpan > pageWidth * 0.3;

  return hasSignificantGaps && wideEnough;
}

function getGapsBetweenItems(items: PDFTextItem[]): number[] {
  if (items.length < 2) return [];

  const sorted = [...items].sort((a, b) => a.transform[4] - b.transform[4]);
  const gaps: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].transform[4] + sorted[i - 1].width;
    const currStart = sorted[i].transform[4];
    gaps.push(currStart - prevEnd);
  }

  return gaps;
}

function detectColumnBoundaries(lines: LineGroup[]): number[] {
  const positions: number[] = [];

  lines.forEach((line) => {
    line.items.forEach((item) => {
      positions.push(item.transform[4]);
    });
  });

  if (positions.length === 0) return [];

  // Cluster positions
  const sorted = [...positions].sort((a, b) => a - b);
  const clusters: number[][] = [];
  let currentCluster: number[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap <= 15) {
      currentCluster.push(sorted[i]);
    } else {
      clusters.push(currentCluster);
      currentCluster = [sorted[i]];
    }
  }
  clusters.push(currentCluster);

  return clusters.map((cluster) => Math.min(...cluster));
}

function extractTableRows(lines: LineGroup[], pageWidth: number): string[][] {
  const columnBoundaries = detectColumnBoundaries(lines);

  return lines.map((line) => {
    const cells: string[] = new Array(columnBoundaries.length).fill('');

    line.items.forEach((item) => {
      const x = item.transform[4];
      let colIndex = -1;

      for (let i = 0; i < columnBoundaries.length; i++) {
        const colStart = columnBoundaries[i];
        const colEnd = columnBoundaries[i + 1] || Infinity;

        if (x >= colStart - 10 && x < colEnd - 10) {
          colIndex = i;
          break;
        }
      }

      if (colIndex === -1) {
        let minDist = Infinity;
        for (let i = 0; i < columnBoundaries.length; i++) {
          const dist = Math.abs(x - columnBoundaries[i]);
          if (dist < minDist) {
            minDist = dist;
            colIndex = i;
          }
        }
      }

      if (colIndex >= 0 && colIndex < cells.length) {
        if (cells[colIndex]) {
          cells[colIndex] += ' ' + item.str;
        } else {
          cells[colIndex] = item.str;
        }
      }
    });

    return cells.map((cell) => cell.trim());
  });
}

function detectTableHeader(rows: string[][]): boolean {
  if (rows.length < 2) return false;

  const firstRow = rows[0];
  const restRows = rows.slice(1);

  // Check if first row has different characteristics than data rows
  const firstRowNumericRatio = getNumericRatio(firstRow);
  const avgRestNumericRatio =
    restRows.reduce((sum, row) => sum + getNumericRatio(row), 0) / restRows.length;

  return firstRowNumericRatio < 0.3 && avgRestNumericRatio > 0.3;
}

function getNumericRatio(row: string[]): number {
  const nonEmpty = row.filter((c) => c.trim());
  if (nonEmpty.length === 0) return 0;

  const numeric = nonEmpty.filter((cell) => {
    const cleaned = cell.replace(/[$,.\s%]/g, '');
    return !isNaN(parseFloat(cleaned)) && isFinite(parseFloat(cleaned));
  });

  return numeric.length / nonEmpty.length;
}

async function extractImagesFromPage(
  page: any,
  viewport: any,
  pageNum: number
): Promise<DocumentElement[]> {
  const images: DocumentElement[] = [];

  try {
    const operatorList = await page.getOperatorList();
    const ops = operatorList.fnArray;
    const args = operatorList.argsArray;

    // OPS.paintImageXObject = 85, OPS.paintImageMaskXObject = 86
    for (let i = 0; i < ops.length; i++) {
      if (ops[i] === 85 || ops[i] === 86) {
        try {
          const imgName = args[i][0];
          const imgData = await page.objs.get(imgName);

          if (imgData && imgData.data) {
            // Convert image data to base64
            const canvas = createCanvas(imgData.width, imgData.height);
            if (canvas) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                const imageDataObj = ctx.createImageData(imgData.width, imgData.height);

                // Handle different image formats
                if (imgData.kind === 1) {
                  // Grayscale
                  for (let j = 0; j < imgData.data.length; j++) {
                    const gray = imgData.data[j];
                    imageDataObj.data[j * 4] = gray;
                    imageDataObj.data[j * 4 + 1] = gray;
                    imageDataObj.data[j * 4 + 2] = gray;
                    imageDataObj.data[j * 4 + 3] = 255;
                  }
                } else if (imgData.kind === 2) {
                  // RGB
                  for (let j = 0; j < imgData.data.length / 3; j++) {
                    imageDataObj.data[j * 4] = imgData.data[j * 3];
                    imageDataObj.data[j * 4 + 1] = imgData.data[j * 3 + 1];
                    imageDataObj.data[j * 4 + 2] = imgData.data[j * 3 + 2];
                    imageDataObj.data[j * 4 + 3] = 255;
                  }
                } else if (imgData.kind === 3) {
                  // RGBA
                  imageDataObj.data.set(imgData.data);
                }

                ctx.putImageData(imageDataObj, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                const base64Data = dataUrl.split(',')[1];

                // Only add images that are reasonably sized (not tiny icons)
                if (imgData.width > 50 && imgData.height > 50) {
                  images.push({
                    type: 'image',
                    content: `Image (${imgData.width}x${imgData.height})`,
                    page: pageNum,
                    imageData: {
                      data: base64Data,
                      width: imgData.width,
                      height: imgData.height,
                      type: 'png',
                    },
                  });
                }
              }
            }
          }
        } catch (imgError) {
          // Skip images that can't be extracted
          console.warn('Could not extract image:', imgError);
        }
      }
    }
  } catch (error) {
    // Image extraction failed, continue without images
    console.warn('Image extraction failed:', error);
  }

  return images;
}

function createCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return null;
}

function classifyLine(
  line: LineGroup,
  maxFontSize: number,
  page: number,
  pageWidth: number,
  fontUsage: Map<string, number>
): DocumentElement {
  // Combine all text in the line with proper spacing
  const content = line.items
    .map((item) => item.str)
    .join(' ')
    .trim();
  const fontSize = line.avgFontSize;
  const indent = Math.max(0, Math.floor((line.minX - LEFT_MARGIN_THRESHOLD) / INDENT_STEP));

  // Check if centered (roughly)
  const lineWidth = line.maxX - line.minX;
  const centerX = line.minX + lineWidth / 2;
  const pageCenterX = pageWidth / 2;
  const isCentered = Math.abs(centerX - pageCenterX) < 50;

  // Detect bold/italic from font name
  const isBold = line.fontNames.some((name) =>
    /bold|black|heavy|demi/i.test(name)
  );
  const isItalic = line.fontNames.some((name) =>
    /italic|oblique/i.test(name)
  );

  // Determine element type
  let type: DocumentElement['type'] = 'paragraph';
  let level: number | undefined;

  // Title detection (largest font, usually centered)
  if (fontSize >= maxFontSize * 0.9 && fontSize >= TITLE_MIN_FONT_SIZE) {
    type = 'title';
  }
  // Heading detection
  else if (fontSize >= HEADING_MIN_FONT_SIZE && fontSize >= maxFontSize * 0.7) {
    type = 'heading';
    level = 1;
  }
  // Subheading detection
  else if (
    (fontSize >= SUBHEADING_MIN_FONT_SIZE && fontSize >= maxFontSize * 0.6) ||
    (isBold && fontSize >= 10)
  ) {
    type = 'subheading';
    level = 2;
  }
  // Bullet point detection
  else if (BULLET_PATTERNS.test(content)) {
    type = 'bullet';
    level = indent + 1;
  }
  // Numbered list detection
  else if (NUMBERED_PATTERNS.test(content)) {
    type = 'numbered';
    level = indent + 1;
  }
  // Empty or whitespace
  else if (!content || content.length === 0) {
    type = 'whitespace';
  }

  // Determine alignment
  let alignment: DocumentElement['alignment'] = 'left';
  if (isCentered && (type === 'title' || type === 'heading')) {
    alignment = 'center';
  } else if (line.minX > pageWidth * 0.6) {
    alignment = 'right';
  }

  // Get primary font name
  const primaryFont = line.fontNames[0];

  return {
    type,
    content: cleanTextContent(content),
    page,
    level,
    indent: indent > 0 ? indent : undefined,
    fontSize,
    fontName: primaryFont,
    alignment,
    isBold: isBold || fontSize >= HEADING_MIN_FONT_SIZE,
    isItalic,
  };
}

function cleanTextContent(text: string): string {
  return text
    // Remove bullet characters at start (we track type separately)
    .replace(BULLET_PATTERNS, '')
    // Clean up numbered list prefixes but keep the number
    .replace(/^(\d+)[\.\)]\s*/, '$1. ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

function cleanDocumentElements(elements: DocumentElement[]): DocumentElement[] {
  const cleaned: DocumentElement[] = [];
  let previousElement: DocumentElement | null = null;

  elements.forEach((element) => {
    // Keep images and tables as-is
    if (element.type === 'image' || element.type === 'table') {
      cleaned.push(element);
      previousElement = element;
      return;
    }

    // Skip empty whitespace
    if (element.type === 'whitespace' && !element.content.trim()) {
      // Add a single whitespace marker between sections
      if (previousElement && previousElement.type !== 'whitespace') {
        cleaned.push(element);
      }
      return;
    }

    // Skip empty content
    if (!element.content.trim()) {
      return;
    }

    // Merge consecutive paragraphs on the same page if they look like continuation
    if (
      previousElement &&
      previousElement.type === 'paragraph' &&
      element.type === 'paragraph' &&
      previousElement.page === element.page &&
      previousElement.indent === element.indent &&
      !previousElement.content.endsWith('.') &&
      !previousElement.content.endsWith(':') &&
      !previousElement.content.endsWith('!') &&
      !previousElement.content.endsWith('?')
    ) {
      previousElement.content += ' ' + element.content;
      return;
    }

    cleaned.push(element);
    previousElement = element;
  });

  return cleaned;
}

export async function extractTextByPage(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number, step: string) => void
): Promise<{ page: number; content: string }[]> {
  onProgress?.(5, 'Loading PDF document...');

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pages: { page: number; content: string }[] = [];
  const totalPages = pdf.numPages;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const progress = 10 + Math.floor((pageNum / totalPages) * 70);
    onProgress?.(progress, `Extracting text from page ${pageNum} of ${totalPages}...`);

    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item) => (item as PDFTextItem).str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (pageText) {
      pages.push({ page: pageNum, content: pageText });
    }
  }

  onProgress?.(80, 'Text extraction complete');
  return pages;
}
