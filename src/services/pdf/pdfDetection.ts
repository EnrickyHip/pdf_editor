import type { PDFDetectionResult } from '@/types/pdf';

const TEXT_THRESHOLD_PER_PAGE = 50;

interface PageTextResult {
  text: string;
  pageIndex: number;
}

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerPort = null;
  return pdfjs;
}

export async function detectPdfType(data: Uint8Array): Promise<PDFDetectionResult> {
  const pdfjsLib = await loadPdfjs();
  const doc = await pdfjsLib.getDocument({ data, useWorkerFetch: false }).promise;

  try {
    let totalTextLength = 0;
    const pagesDetected = doc.numPages;

    for (let pageNumber = 1; pageNumber <= pagesDetected; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? (item as { str: string }).str : ''))
        .join(' ');
      totalTextLength += pageText.length;
    }

    const threshold = pagesDetected * TEXT_THRESHOLD_PER_PAGE;

    return {
      hasText: totalTextLength > threshold,
      textLength: totalTextLength,
      threshold,
      pagesDetected,
    };
  } finally {
    await doc.destroy();
  }
}

export async function extractPageTexts(data: Uint8Array): Promise<PageTextResult[]> {
  const pdfjsLib = await loadPdfjs();
  const doc = await pdfjsLib.getDocument({ data, useWorkerFetch: false }).promise;

  try {
    const results: PageTextResult[] = [];

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item) => ('str' in item ? (item as { str: string }).str : ''))
        .join(' ');

      results.push({ text, pageIndex: pageNumber - 1 });
    }

    return results;
  } finally {
    await doc.destroy();
  }
}
