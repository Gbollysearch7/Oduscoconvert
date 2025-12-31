export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  fontName?: string;
  fontSize?: number;
}

export interface DocumentElement {
  type: 'title' | 'heading' | 'subheading' | 'paragraph' | 'bullet' | 'numbered' | 'table-header' | 'table-cell' | 'whitespace';
  content: string;
  page: number;
  level?: number; // For headings (1, 2, 3) and list items
  indent?: number; // Indentation level
  isBold?: boolean;
  isItalic?: boolean;
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right';
}

export interface DocumentStructure {
  title?: string;
  elements: DocumentElement[];
  pages: number;
}

export interface ExtractedTable {
  rows: string[][];
  source: string;
  pageNumber: number;
  title?: string; // Table title if detected
  headers?: string[]; // Column headers
}

export interface ConversionResult {
  tables: ExtractedTable[];
  textContent: { page: number; content: string }[];
  mode: 'tables' | 'text';
  documentStructure?: DocumentStructure;
}

export type ConversionMode = 'auto' | 'tables' | 'text';
export type OutputFormat = 'excel' | 'doc';

export type ConversionStatus =
  | 'idle'
  | 'reading'
  | 'parsing'
  | 'extracting'
  | 'generating'
  | 'complete'
  | 'error';

export interface ConversionState {
  status: ConversionStatus;
  progress: number;
  currentStep: string;
  result: ConversionResult | null;
  error: string | null;
  fileName: string | null;
  outputFormat: OutputFormat;
}
