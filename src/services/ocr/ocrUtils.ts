import type { OCRResult, OCRWord } from '@/types/pdf';
import type { TextBlock } from '@/types/editor';

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

export { extractWordsFromPage, groupWordsByLine, ocrWordsToTextBlocks, OCR_SCALE, MIN_CONFIDENCE };
