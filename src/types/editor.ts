export interface TextBlock {
  id: string;
  pageIndex: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
}

export interface TextEdit {
  blockId: string;
  pageIndex: number;
  originalText: string;
  newText: string;
}

export interface TextInsertion {
  id: string;
  pageIndex: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
}

export interface HighlightColor {
  name: string;
  hex: string;
  opacity: number;
}

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  { name: 'amarelo', hex: '#FFFF00', opacity: 0.3 },
  { name: 'verde', hex: '#00FF00', opacity: 0.3 },
  { name: 'azul', hex: '#00BFFF', opacity: 0.3 },
  { name: 'rosa', hex: '#FF69B4', opacity: 0.3 },
];

export interface Highlight {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: HighlightColor;
  text: string;
}

export type EditorMode = 'idle' | 'loading' | 'ocr' | 'editing' | 'exporting' | 'error';

export interface EditorState {
  mode: EditorMode;
  documentId: string | null;
  fileName: string;
  filePath: string;
  totalPages: number;
  currentPage: number;
  zoom: number;
  textBlocks: TextBlock[];
  edits: TextEdit[];
  insertions: TextInsertion[];
  highlights: Highlight[];
  ocrProgress: { current: number; total: number } | null;
  errorMessage: string | null;
}
