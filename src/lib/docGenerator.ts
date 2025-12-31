import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  convertInchesToTwip,
  Packer,
  PageBreak,
} from 'docx';
import type { DocumentStructure, DocumentElement, ConversionResult } from './types';
import type { EnhancedExtractedTable } from './tableExtractor';

// Document styling constants
const FONTS = {
  heading: 'Calibri',
  body: 'Calibri',
};

const FONT_SIZES = {
  title: 32,        // 16pt
  heading1: 28,     // 14pt
  heading2: 24,     // 12pt
  body: 22,         // 11pt
  small: 20,        // 10pt
};

const SPACING = {
  beforeTitle: 400,
  afterTitle: 300,
  beforeHeading: 300,
  afterHeading: 150,
  beforeParagraph: 120,
  afterParagraph: 120,
  lineSpacing: 276,  // 1.15 line spacing (240 = single)
};

const COLORS = {
  title: '1E3A5F',
  heading: '2C5282',
  body: '1F2937',
  tableHeader: '1E3A5F',
  tableHeaderText: 'FFFFFF',
  tableBorder: 'CBD5E1',
  tableAltRow: 'F1F5F9',
};

export async function generateDocFromStructure(
  structure: DocumentStructure,
  fileName: string,
  onProgress?: (progress: number, step: string) => void
): Promise<Blob> {
  onProgress?.(80, 'Creating Word document...');

  const children: Paragraph[] = [];

  // Add document title if present
  if (structure.title) {
    children.push(createTitleParagraph(structure.title));
  }

  // Process each element
  structure.elements.forEach((element, index) => {
    const progress = 80 + Math.floor((index / structure.elements.length) * 15);
    if (index % 20 === 0) {
      onProgress?.(progress, 'Formatting document...');
    }

    const paragraph = elementToParagraph(element);
    if (paragraph) {
      children.push(paragraph);
    }
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONTS.body,
            size: FONT_SIZES.body,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });

  onProgress?.(95, 'Generating document file...');

  const blob = await Packer.toBlob(doc);

  onProgress?.(100, 'Complete!');

  return blob;
}

export async function generateDocFromResult(
  result: ConversionResult,
  fileName: string,
  onProgress?: (progress: number, step: string) => void
): Promise<Blob> {
  onProgress?.(80, 'Creating Word document...');

  const children: (Paragraph | Table)[] = [];

  // Add document title
  const docTitle = fileName.replace(/\.pdf$/i, '');
  children.push(createTitleParagraph(`Converted: ${docTitle}`));

  if (result.mode === 'tables' && result.tables.length > 0) {
    // Add tables with proper formatting
    result.tables.forEach((table, tableIndex) => {
      const progress = 80 + Math.floor((tableIndex / result.tables.length) * 15);
      onProgress?.(progress, `Formatting table ${tableIndex + 1}...`);

      // Add table title/source
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: table.source,
              font: FONTS.heading,
              size: FONT_SIZES.heading2,
              color: COLORS.heading,
              bold: true,
            }),
          ],
          spacing: {
            before: SPACING.beforeHeading,
            after: SPACING.afterHeading,
          },
        })
      );

      // Create table
      const docTable = createFormattedTable(table);
      children.push(docTable);

      // Add spacing after table
      children.push(
        new Paragraph({
          children: [],
          spacing: { after: SPACING.afterParagraph * 2 },
        })
      );
    });
  } else if (result.textContent.length > 0) {
    // Add text content with page markers
    let currentPage = 0;

    result.textContent.forEach((item, index) => {
      // Add page break marker when page changes
      if (item.page !== currentPage) {
        currentPage = item.page;
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `— Page ${item.page} —`,
                font: FONTS.body,
                size: FONT_SIZES.small,
                color: '6B7280',
                italics: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              before: SPACING.beforeHeading,
              after: SPACING.afterHeading,
            },
          })
        );
      }

      // Add content paragraph
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: item.content,
              font: FONTS.body,
              size: FONT_SIZES.body,
              color: COLORS.body,
            }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: {
            before: SPACING.beforeParagraph,
            after: SPACING.afterParagraph,
            line: SPACING.lineSpacing,
          },
        })
      );
    });
  }

  // If we have document structure, use it for better formatting
  if (result.documentStructure) {
    // Clear and rebuild with proper structure
    children.length = 0;

    if (result.documentStructure.title) {
      children.push(createTitleParagraph(result.documentStructure.title));
    }

    result.documentStructure.elements.forEach((element) => {
      const paragraph = elementToParagraph(element);
      if (paragraph) {
        children.push(paragraph);
      }
    });
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONTS.body,
            size: FONT_SIZES.body,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });

  onProgress?.(95, 'Generating document file...');

  const blob = await Packer.toBlob(doc);

  onProgress?.(100, 'Complete!');

  return blob;
}

function createTitleParagraph(title: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        font: FONTS.heading,
        size: FONT_SIZES.title,
        color: COLORS.title,
        bold: true,
      }),
    ],
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.LEFT,
    spacing: {
      before: SPACING.beforeTitle,
      after: SPACING.afterTitle,
    },
  });
}

function elementToParagraph(element: DocumentElement): Paragraph | null {
  if (element.type === 'whitespace') {
    return new Paragraph({
      children: [],
      spacing: { after: SPACING.afterParagraph },
    });
  }

  if (!element.content.trim()) {
    return null;
  }

  switch (element.type) {
    case 'title':
      return new Paragraph({
        children: [
          new TextRun({
            text: element.content,
            font: FONTS.heading,
            size: FONT_SIZES.title,
            color: COLORS.title,
            bold: true,
          }),
        ],
        heading: HeadingLevel.TITLE,
        alignment: element.alignment === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: {
          before: SPACING.beforeTitle,
          after: SPACING.afterTitle,
        },
      });

    case 'heading':
      return new Paragraph({
        children: [
          new TextRun({
            text: element.content,
            font: FONTS.heading,
            size: FONT_SIZES.heading1,
            color: COLORS.heading,
            bold: true,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        alignment: element.alignment === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: {
          before: SPACING.beforeHeading,
          after: SPACING.afterHeading,
        },
      });

    case 'subheading':
      return new Paragraph({
        children: [
          new TextRun({
            text: element.content,
            font: FONTS.heading,
            size: FONT_SIZES.heading2,
            color: COLORS.heading,
            bold: true,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.LEFT,
        spacing: {
          before: SPACING.beforeHeading,
          after: SPACING.afterHeading,
        },
      });

    case 'bullet':
      return new Paragraph({
        children: [
          new TextRun({
            text: element.content,
            font: FONTS.body,
            size: FONT_SIZES.body,
            color: COLORS.body,
          }),
        ],
        bullet: {
          level: (element.level || 1) - 1,
        },
        alignment: AlignmentType.LEFT,
        indent: {
          left: convertInchesToTwip(0.5 * (element.indent || 0)),
        },
        spacing: {
          before: 60,
          after: 60,
          line: SPACING.lineSpacing,
        },
      });

    case 'numbered':
      return new Paragraph({
        children: [
          new TextRun({
            text: element.content,
            font: FONTS.body,
            size: FONT_SIZES.body,
            color: COLORS.body,
          }),
        ],
        numbering: {
          reference: 'default-numbering',
          level: (element.level || 1) - 1,
        },
        alignment: AlignmentType.LEFT,
        indent: {
          left: convertInchesToTwip(0.5 * (element.indent || 0)),
        },
        spacing: {
          before: 60,
          after: 60,
          line: SPACING.lineSpacing,
        },
      });

    case 'paragraph':
    default:
      return new Paragraph({
        children: [
          new TextRun({
            text: element.content,
            font: FONTS.body,
            size: FONT_SIZES.body,
            color: COLORS.body,
            bold: element.isBold,
            italics: element.isItalic,
          }),
        ],
        alignment: AlignmentType.LEFT,
        indent: element.indent
          ? { left: convertInchesToTwip(0.5 * element.indent) }
          : undefined,
        spacing: {
          before: SPACING.beforeParagraph,
          after: SPACING.afterParagraph,
          line: SPACING.lineSpacing,
        },
      });
  }
}

function createFormattedTable(table: ConversionResult['tables'][0]): Table {
  const enhancedTable = table as EnhancedExtractedTable;
  const hasHeader = enhancedTable.metadata?.hasDetectedHeader ?? true;

  const rows = table.rows.map((rowData, rowIndex) => {
    const isHeaderRow = rowIndex === 0 && hasHeader;
    const isAlternateRow = !isHeaderRow && rowIndex % 2 === 1;

    const cells = rowData.map((cellText) => {
      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: cellText || '',
                font: FONTS.body,
                size: isHeaderRow ? FONT_SIZES.body : FONT_SIZES.small,
                color: isHeaderRow ? COLORS.tableHeaderText : COLORS.body,
                bold: isHeaderRow,
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: {
              before: 60,
              after: 60,
            },
          }),
        ],
        shading: {
          fill: isHeaderRow
            ? COLORS.tableHeader
            : isAlternateRow
            ? COLORS.tableAltRow
            : 'FFFFFF',
        },
        margins: {
          top: convertInchesToTwip(0.05),
          bottom: convertInchesToTwip(0.05),
          left: convertInchesToTwip(0.1),
          right: convertInchesToTwip(0.1),
        },
      });
    });

    return new TableRow({
      children: cells,
      tableHeader: isHeaderRow,
    });
  });

  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
      left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
      right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
    },
  });
}

export function downloadDocBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.replace(/\.pdf$/i, '.docx');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
