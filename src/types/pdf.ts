export interface PDFDocument {
  id: string;
  name: string;
  originalPath: string;
  pages: number;
  isOcr: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PDFDetectionResult {
  hasText: boolean;
  textLength: number;
  threshold: number;
  pagesDetected: number;
}

export interface UploadResult {
  documentId: string;
  filePath: string;
  fileName: string;
  pageCount: number;
}

export interface OCRWord {
  text: string;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  confidence: number;
}

export interface OCRResult {
  text: string;
  words: OCRWord[];
}
