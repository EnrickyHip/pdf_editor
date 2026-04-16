import { PDFDocument as PdfLibDocument, rgb, StandardFonts } from 'pdf-lib';
import type { TextEdit, TextInsertion, Highlight, TextBlock } from '@/types/editor';

interface ExportParams {
  pdfData: Uint8Array;
  edits: TextEdit[];
  insertions: TextInsertion[];
  highlights: Highlight[];
  textBlocks: TextBlock[];
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

const CSS_FONT_TO_STANDARD: Record<string, StandardFonts> = {
  'Arial, sans-serif': StandardFonts.Helvetica,
  'Helvetica, Arial, sans-serif': StandardFonts.Helvetica,
  'Times New Roman, serif': StandardFonts.TimesRoman,
  'Courier New, monospace': StandardFonts.Courier,
  'Georgia, serif': StandardFonts.TimesRoman,
  'Verdana, sans-serif': StandardFonts.Helvetica,
  'Trebuchet MS, sans-serif': StandardFonts.Helvetica,
  'Calibri, sans-serif': StandardFonts.Helvetica,
  'Cambria, serif': StandardFonts.TimesRoman,
  'Tahoma, sans-serif': StandardFonts.Helvetica,
  'Impact, sans-serif': StandardFonts.Helvetica,
  'Comic Sans MS, cursive': StandardFonts.Courier,
  'Symbol, serif': StandardFonts.Symbol,
  'Zapf Dingbats, serif': StandardFonts.ZapfDingbats,
  'sans-serif': StandardFonts.Helvetica,
  serif: StandardFonts.TimesRoman,
  monospace: StandardFonts.Courier,
};

type FontCache = Map<StandardFonts, import('pdf-lib').PDFFont>;

async function getFontForBlock(
  doc: PdfLibDocument,
  fontFamily: string,
  cache: FontCache,
): Promise<import('pdf-lib').PDFFont> {
  const standardFont = CSS_FONT_TO_STANDARD[fontFamily] ?? StandardFonts.Helvetica;

  const cached = cache.get(standardFont);
  if (cached) return cached;

  const font = await doc.embedFont(standardFont);
  cache.set(standardFont, font);
  return font;
}

export async function exportPdf(params: ExportParams): Promise<Uint8Array> {
  const { pdfData, edits, insertions, highlights, textBlocks } = params;

  const srcDoc = await PdfLibDocument.load(pdfData);
  const srcPages = srcDoc.getPages();

  const outDoc = await PdfLibDocument.create();
  const fontCache: FontCache = new Map();

  const editsMap = new Map<string, TextEdit>();
  for (const edit of edits) {
    editsMap.set(edit.blockId, edit);
  }

  const insertionsByPage = new Map<number, TextInsertion[]>();
  for (const insertion of insertions) {
    const list = insertionsByPage.get(insertion.pageIndex) ?? [];
    list.push(insertion);
    insertionsByPage.set(insertion.pageIndex, list);
  }

  const highlightsByPage = new Map<number, Highlight[]>();
  for (const highlight of highlights) {
    const list = highlightsByPage.get(highlight.pageIndex) ?? [];
    list.push(highlight);
    highlightsByPage.set(highlight.pageIndex, list);
  }

  for (let pageIndex = 0; pageIndex < srcPages.length; pageIndex++) {
    const srcPage = srcPages[pageIndex];
    const { width, height } = srcPage.getSize();

    const page = outDoc.addPage([width, height]);

    const pageBlocks = textBlocks.filter((block) => block.pageIndex === pageIndex);
    for (const block of pageBlocks) {
      const edit = editsMap.get(block.id);
      const text = edit ? edit.newText : block.text;
      if (!text.trim()) continue;

      const font = await getFontForBlock(outDoc, block.fontFamily, fontCache);

      page.drawText(text, {
        x: block.x,
        y: height - block.y - block.fontSize,
        size: block.fontSize,
        font,
        color: rgb(0.1, 0.1, 0.18),
      });
    }

    const pageInsertions = insertionsByPage.get(pageIndex) ?? [];
    const defaultFont = await getFontForBlock(outDoc, 'sans-serif', fontCache);
    for (const insertion of pageInsertions) {
      if (!insertion.text.trim()) continue;

      page.drawText(insertion.text, {
        x: insertion.x,
        y: height - insertion.y - insertion.fontSize,
        size: insertion.fontSize,
        font: defaultFont,
        color: rgb(0.1, 0.1, 0.18),
      });
    }

    const pageHighlights = highlightsByPage.get(pageIndex) ?? [];
    for (const highlight of pageHighlights) {
      const color = hexToRgb(highlight.color.hex);
      page.drawRectangle({
        x: highlight.x,
        y: height - highlight.y - highlight.height,
        width: highlight.width,
        height: highlight.height,
        color: rgb(color.r, color.g, color.b),
        opacity: highlight.color.opacity,
      });
    }
  }

  return outDoc.save();
}
