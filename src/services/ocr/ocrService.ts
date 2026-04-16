import { createWorker } from 'tesseract.js';
import { getDocument } from '@/lib/pdfjs';
import type { PDFPageProxy } from '@/lib/pdfjs';
import type { OCRResult, OCRWord } from '@/types/pdf';

interface OCRProgress {
  pageIndex: number;
  totalPages: number;
  progress: number;
  status: string;
}

type ProgressCallback = (progress: OCRProgress) => void;

const OCR_SCALE = 2;

function renderPageToCanvas(page: PDFPageProxy, scale: number): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível obter contexto 2D do canvas.');

  return page.render({ canvasContext: context, viewport }).promise.then(() => canvas);
}

export async function ocrPage(
  pdfData: Uint8Array,
  pageIndex: number,
  onProgress?: (progress: number, status: string) => void,
): Promise<OCRResult> {
  const doc = await getDocument({ data: new Uint8Array(pdfData) }).promise;

  try {
    const page = await doc.getPage(pageIndex + 1);
    const canvas = await renderPageToCanvas(page, OCR_SCALE);

    const worker = await createWorker('por+eng', undefined, {
      logger: (message) => {
        if (onProgress && message.progress !== undefined) {
          onProgress(message.progress, message.status);
        }
      },
    });

    try {
      const result = await worker.recognize(canvas);
      const text = result.data.text.trim();
      const words = extractWordsFromPage(result.data);

      return { text, words };
    } finally {
      await worker.terminate();
    }
  } finally {
    await doc.destroy();
  }
}

function extractWordsFromPage(page: Tesseract.Page): OCRWord[] {
  const words: OCRWord[] = [];

  for (const block of page.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          words.push({
            text: word.text,
            bbox: {
              x0: word.bbox.x0,
              y0: word.bbox.y0,
              x1: word.bbox.x1,
              y1: word.bbox.y1,
            },
            confidence: word.confidence,
          });
        }
      }
    }
  }

  return words;
}

export async function ocrDocument(
  pdfData: Uint8Array,
  totalPages: number,
  onProgress?: ProgressCallback,
): Promise<OCRResult[]> {
  const results: OCRResult[] = [];

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    onProgress?.({
      pageIndex,
      totalPages,
      progress: 0,
      status: 'Iniciando',
    });

    const result = await ocrPage(pdfData, pageIndex, (progress, status) => {
      onProgress?.({ pageIndex, totalPages, progress, status });
    });

    results.push(result);

    onProgress?.({
      pageIndex,
      totalPages,
      progress: 1,
      status: 'Concluída',
    });
  }

  return results;
}

export type { OCRProgress };
