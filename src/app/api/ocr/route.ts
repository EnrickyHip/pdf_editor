import { NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';
import { FileStorage } from '@/services/storage/FileStorage';
import { MIN_CONFIDENCE, groupWordsByLine } from '@/services/ocr/ocrService';
import type { OCRResult } from '@/types/pdf';
import type { TextBlock } from '@/types/editor';

const OCR_SCALE = 2;

function extractWordsFromPage(page: Tesseract.Page): {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}[] {
  const words: {
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    confidence: number;
  }[] = [];

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

function ocrWordsToTextBlocks(ocrResults: OCRResult[], totalPages: number): TextBlock[] {
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentId, pageIndex } = body as {
      documentId: string;
      pageIndex?: number;
    };

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json({ error: 'documentId é obrigatório.' }, { status: 400 });
    }

    const storage = new FileStorage();
    const filePath = `${documentId}.pdf`;

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await storage.load(filePath);
    } catch {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    }

    const PDFLib = await import('pdf-lib');
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer);
    const totalPages = pdfDoc.getPageCount();

    const isSinglePage = typeof pageIndex === 'number' && pageIndex >= 0 && pageIndex < totalPages;
    const pagesToProcess = isSinglePage
      ? [pageIndex]
      : Array.from({ length: totalPages }, (_, index) => index);

    const results: OCRResult[] = [];

    const Pdf2pic = (await import('pdf2pic')).fromBuffer;
    const converter = Pdf2pic(pdfBuffer, {
      density: 150,
      saveFilename: `ocr-${documentId}`,
      savePath: '/tmp',
      format: 'png',
    });

    for (const pageIdx of pagesToProcess) {
      const base64Response = await converter(pageIdx + 1, { responseType: 'base64' });

      if (!base64Response || !base64Response.base64) {
        throw new Error(
          `Falha ao converter página ${pageIdx + 1} para imagem. Response: ${JSON.stringify(base64Response)}`,
        );
      }

      const base64Data = base64Response.base64;
      const imageBuffer = Buffer.from(base64Data, 'base64');

      const worker = await createWorker('por+eng');
      try {
        const { data } = await worker.recognize(imageBuffer);
        const text = data.text.trim();
        const words = extractWordsFromPage(data);
        results.push({ text, words });
      } finally {
        await worker.terminate();
      }
    }

    const textBlocks = ocrWordsToTextBlocks(results, totalPages);
    const combinedText = results
      .map((result) => result.text)
      .join('\n')
      .trim();

    return NextResponse.json(
      {
        text: combinedText,
        words: results.flatMap((result) => result.words),
        blocks: textBlocks,
        totalPages,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao processar OCR.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
