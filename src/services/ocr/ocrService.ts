import { createWorker } from 'tesseract.js';
import type { OCRResult, OCRWord } from '@/types/pdf';
import type { TextBlock } from '@/types/editor';

interface OCRProgress {
  pageIndex: number;
  totalPages: number;
  progress: number;
  status: string;
}

type ProgressCallback = (progress: OCRProgress) => void;

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerPort = null;
  return pdfjs;
}

const OCR_SCALE = 2;
const MIN_CONFIDENCE = 30;

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

function renderPageToCanvas(
  page: import('pdfjs-dist').PDFPageProxy,
  scale: number,
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  return page.render({ canvas, viewport }).promise.then(() => canvas);
}

function groupWordsByLine(words: OCRWord[]): OCRWord[][] {
  if (!words.length) return [];

  const sorted = [...words].sort(
    (first, second) => first.bbox.y0 - second.bbox.y0 || first.bbox.x0 - second.bbox.x0,
  );

  const lines: OCRWord[][] = [];
  let currentLine: OCRWord[] = [sorted[0]];

  for (let index = 1; index < sorted.length; index++) {
    const word = sorted[index];
    const prevWord = currentLine[0];
    const lineHeight = Math.abs(prevWord.bbox.y1 - prevWord.bbox.y0);
    const lineThreshold = lineHeight * 0.3;

    if (Math.abs(word.bbox.y0 - prevWord.bbox.y0) <= lineThreshold) {
      currentLine.push(word);
    } else {
      lines.push(currentLine);
      currentLine = [word];
    }
  }

  lines.push(currentLine);
  return lines;
}

export function ocrWordsToTextBlocks(ocrResults: OCRResult[], totalPages: number): TextBlock[] {
  const blocks: TextBlock[] = [];

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const result = ocrResults[pageIndex];
    if (!result || !result.words.length) continue;

    const filteredWords = result.words.filter((word) => word.confidence >= MIN_CONFIDENCE);
    if (!filteredWords.length) continue;

    const lines = groupWordsByLine(filteredWords);

    for (const lineWords of lines) {
      const minX = Math.min(...lineWords.map((word) => word.bbox.x0));
      const minY = Math.min(...lineWords.map((word) => word.bbox.y0));
      const maxX = Math.max(...lineWords.map((word) => word.bbox.x1));
      const maxY = Math.max(...lineWords.map((word) => word.bbox.y1));

      blocks.push({
        id: `ocr-${pageIndex}-${blocks.length}`,
        pageIndex,
        text: lineWords.map((word) => word.text).join(' '),
        x: minX / OCR_SCALE,
        y: minY / OCR_SCALE,
        width: (maxX - minX) / OCR_SCALE,
        height: (maxY - minY) / OCR_SCALE,
        fontSize: (maxY - minY) / OCR_SCALE,
        fontFamily: 'sans-serif',
      });
    }
  }

  return blocks;
}

export async function ocrPage(
  pdfData: Uint8Array,
  pageIndex: number,
  onProgress?: (progress: number, status: string) => void,
): Promise<OCRResult> {
  const pdfjsLib = await loadPdfjs();
  const doc = await pdfjsLib.getDocument({ data: pdfData, useWorkerFetch: false }).promise;

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

export { groupWordsByLine, OCR_SCALE, MIN_CONFIDENCE };
export type { OCRProgress };
