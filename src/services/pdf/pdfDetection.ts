import type { PDFDetectionResult } from '@/types/pdf';

interface PageTextResult {
  text: string;
  pageIndex: number;
}

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

export async function extractPageTexts(data: Uint8Array): Promise<PageTextResult[]> {
  return [];
}
