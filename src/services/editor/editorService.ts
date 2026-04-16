import type { TextBlock, TextEdit, TextInsertion, Highlight } from '@/types/editor';

export function getBlocksForPage(blocks: TextBlock[], pageIndex: number): TextBlock[] {
  return blocks.filter((block) => block.pageIndex === pageIndex);
}

export function getEditsForPage(edits: TextEdit[], pageIndex: number): TextEdit[] {
  return edits.filter((edit) => edit.pageIndex === pageIndex);
}

export function getInsertionsForPage(
  insertions: TextInsertion[],
  pageIndex: number,
): TextInsertion[] {
  return insertions.filter((ins) => ins.pageIndex === pageIndex);
}

export function getHighlightsForPage(highlights: Highlight[], pageIndex: number): Highlight[] {
  return highlights.filter((hl) => hl.pageIndex === pageIndex);
}

export function getChangedBlocks(edits: TextEdit[]): TextEdit[] {
  return edits.filter((edit) => edit.originalText !== edit.newText);
}

export function getPageText(
  blocks: TextBlock[],
  edits: TextEdit[],
  insertions: TextInsertion[],
  pageIndex: number,
): string {
  const pageBlocks = getBlocksForPage(blocks, pageIndex);
  const pageEdits = getEditsForPage(edits, pageIndex);
  const pageInsertions = getInsertionsForPage(insertions, pageIndex);

  const lines: string[] = [];

  for (const block of pageBlocks) {
    const edit = pageEdits.find((e) => e.blockId === block.id);
    lines.push(edit ? edit.newText : block.text);
  }

  for (const insertion of pageInsertions) {
    if (insertion.text.trim()) {
      lines.push(insertion.text);
    }
  }

  return lines.join('\n');
}
