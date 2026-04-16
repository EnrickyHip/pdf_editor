import type { PDFDetectionResult } from '@/types/pdf';
import type { TextBlock } from '@/types/editor';
import { getDocument } from '@/lib/pdfjs';

function extractPdfObjects(buffer: Uint8Array): Map<string, string> {
  const content = new TextDecoder('latin1').decode(buffer);
  const objects = new Map<string, string>();

  const objRegex = /(\d+)\s+(\d+)\s+obj\s*(<<[^]*?>>)/g;
  let match;

  while ((match = objRegex.exec(content)) !== null) {
    const objKey = `${match[1]} ${match[2]}`;
    objects.set(objKey, match[3]);
  }

  return objects;
}

export function detectPdfType(data: Uint8Array): PDFDetectionResult {
  const objects = extractPdfObjects(data);

  let hasText = false;
  let hasImages = false;

  for (const [, objContent] of objects) {
    if (/\/Subtype\s*\/Image/.test(objContent)) {
      hasImages = true;
    }

    if (/\/Subtype\s*\/Text/.test(objContent)) {
      hasText = true;
    }

    if (/\/Type\s*\/Font/.test(objContent)) {
      hasText = true;
    }

    if (/\/Contents\s*[\d+\s]+\s+\d+\s+R/.test(objContent)) {
      const contentRef = objContent.match(/\/Contents\s*(\d+)\s+(\d+)\s+R/);
      if (contentRef) {
        const contentObj = objects.get(`${contentRef[1]} ${contentRef[2]}`);
        if (contentObj && /\b(TJ|Tj|BT|ET)\b/.test(contentObj)) {
          hasText = true;
        }
      }
    }
  }

  const content = new TextDecoder('latin1').decode(data);
  const pageCount = (content.match(/\/Type\s*\/Page(?!s)/g) || []).length || 1;

  if (!hasText && hasImages) {
    hasText = false;
  }

  return {
    hasText,
    textLength: hasText ? 1 : 0,
    pagesDetected: pageCount,
  };
}

export async function extractPageTexts(data: Uint8Array): Promise<TextBlock[]> {
  const doc = await getDocument({ data: new Uint8Array(data) }).promise;
  const blocks: TextBlock[] = [];

  try {
    for (let pageIndex = 0; pageIndex < doc.numPages; pageIndex++) {
      const page = await doc.getPage(pageIndex + 1);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });

      for (const item of textContent.items) {
        const textItem = item as {
          str: string;
          transform: number[];
          width?: number;
          height?: number;
        };
        if (!textItem.str.trim()) continue;

        const x = textItem.transform[4];
        const yPdf = textItem.transform[5];
        const fontSize = Math.abs(textItem.transform[0]) || Math.abs(textItem.transform[3]) || 12;
        const width = textItem.width ?? textItem.str.length * fontSize * 0.5;

        const topLeft = viewport.convertToViewportPoint(x, yPdf);
        const bottomLeft = viewport.convertToViewportPoint(x, yPdf - fontSize);

        blocks.push({
          id: `native-${pageIndex}-${blocks.length}`,
          pageIndex,
          text: textItem.str,
          x: topLeft[0],
          y: topLeft[1],
          width,
          height: Math.abs(bottomLeft[1] - topLeft[1]),
          fontSize,
          fontFamily: 'sans-serif',
        });
      }
    }
  } finally {
    await doc.destroy();
  }

  return blocks;
}
