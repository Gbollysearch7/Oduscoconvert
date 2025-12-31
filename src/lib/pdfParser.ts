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

  // First pass: find the largest font size on first page (likely title)
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
    }
  });

  // Second pass: extract all elements with structure
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const progress = 10 + Math.floor((pageNum / totalPages) * 60);
    onProgress?.(progress, `Analyzing structure on page ${pageNum} of ${totalPages}...`);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();

    // Group text items into lines
    const lines = groupIntoLines(content.items as PDFTextItem[], viewport.height);

    lines.forEach((line, lineIndex) => {
      const element = classifyLine(line, maxFontSize, pageNum, viewport.width);

      // Detect title (largest text on first page, usually at top)
      if (pageNum === 1 && lineIndex < 5 && element.type === 'title' && !documentTitle) {
        documentTitle = element.content;
      }

      elements.push(element);
    });
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
}

function groupIntoLines(items: PDFTextItem[], pageHeight: number): LineGroup[] {
  const ROW_TOLERANCE = 5;
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
      };
      lines.push(currentLine);
    } else {
      currentLine.items.push(item);
      currentLine.avgFontSize =
        (currentLine.avgFontSize * (currentLine.items.length - 1) + fontSize) / currentLine.items.length;
      currentLine.minX = Math.min(currentLine.minX, x);
      currentLine.maxX = Math.max(currentLine.maxX, x + item.width);
    }
  });

  // Sort items within each line by x position
  lines.forEach((line) => {
    line.items.sort((a, b) => a.transform[4] - b.transform[4]);
  });

  return lines;
}

function classifyLine(line: LineGroup, maxFontSize: number, page: number, pageWidth: number): DocumentElement {
  // Combine all text in the line
  const content = line.items.map((item) => item.str).join(' ').trim();
  const fontSize = line.avgFontSize;
  const indent = Math.max(0, Math.floor((line.minX - LEFT_MARGIN_THRESHOLD) / INDENT_STEP));

  // Check if centered (roughly)
  const lineWidth = line.maxX - line.minX;
  const centerX = line.minX + lineWidth / 2;
  const pageCenterX = pageWidth / 2;
  const isCentered = Math.abs(centerX - pageCenterX) < 50;

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
  else if (fontSize >= SUBHEADING_MIN_FONT_SIZE && fontSize >= maxFontSize * 0.6) {
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
  let alignment: 'left' | 'center' | 'right' = 'left';
  if (isCentered && (type === 'title' || type === 'heading')) {
    alignment = 'center';
  }

  return {
    type,
    content: cleanTextContent(content),
    page,
    level,
    indent: indent > 0 ? indent : undefined,
    fontSize,
    alignment,
    isBold: fontSize >= HEADING_MIN_FONT_SIZE,
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
