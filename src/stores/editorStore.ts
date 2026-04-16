import { create } from 'zustand';
import type { TextBlock, TextEdit, TextInsertion, Highlight, HighlightColor } from '@/types/editor';

interface Snapshot {
  textBlocks: TextBlock[];
  edits: TextEdit[];
  insertions: TextInsertion[];
  highlights: Highlight[];
}

interface EditorStore {
  textBlocks: TextBlock[];
  edits: TextEdit[];
  insertions: TextInsertion[];
  highlights: Highlight[];

  undoStack: Snapshot[];
  redoStack: Snapshot[];

  setTextBlocks: (blocks: TextBlock[]) => void;

  updateBlockText: (blockId: string, newText: string) => void;

  addInsertion: (insertion: TextInsertion) => void;
  updateInsertion: (id: string, text: string) => void;
  removeInsertion: (id: string) => void;

  addHighlight: (highlight: Highlight) => void;
  removeHighlight: (id: string) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  reset: () => void;
}

const MAX_UNDO = 50;

function takeSnapshot(state: EditorStore): Snapshot {
  return {
    textBlocks: state.textBlocks.map((block) => ({ ...block })),
    edits: state.edits.map((edit) => ({ ...edit })),
    insertions: state.insertions.map((ins) => ({ ...ins })),
    highlights: state.highlights.map((hl) => ({ ...hl })),
  };
}

function pushUndo(
  set: (fn: (state: EditorStore) => Partial<EditorStore>) => void,
  get: () => EditorStore,
) {
  const snapshot = takeSnapshot(get());
  set((state) => ({
    undoStack: [...state.undoStack.slice(-MAX_UNDO + 1), snapshot],
    redoStack: [],
  }));
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  textBlocks: [],
  edits: [],
  insertions: [],
  highlights: [],
  undoStack: [],
  redoStack: [],

  setTextBlocks: (blocks) => set({ textBlocks: blocks }),

  updateBlockText: (blockId, newText) => {
    pushUndo(set, get);
    set((state) => {
      const blockIndex = state.textBlocks.findIndex((block) => block.id === blockId);
      if (blockIndex === -1) return state;

      const block = state.textBlocks[blockIndex];
      const newBlocks = [...state.textBlocks];
      newBlocks[blockIndex] = { ...block, text: newText };

      const existingEditIndex = state.edits.findIndex((edit) => edit.blockId === blockId);
      let newEdits: TextEdit[];

      if (existingEditIndex !== -1) {
        newEdits = [...state.edits];
        newEdits[existingEditIndex] = {
          ...newEdits[existingEditIndex],
          newText,
        };
      } else {
        newEdits = [
          ...state.edits,
          { blockId, pageIndex: block.pageIndex, originalText: block.text, newText },
        ];
      }

      return { textBlocks: newBlocks, edits: newEdits };
    });
  },

  addInsertion: (insertion) => {
    pushUndo(set, get);
    set((state) => ({ insertions: [...state.insertions, insertion] }));
  },

  updateInsertion: (id, text) => {
    pushUndo(set, get);
    set((state) => ({
      insertions: state.insertions.map((ins) => (ins.id === id ? { ...ins, text } : ins)),
    }));
  },

  removeInsertion: (id) => {
    pushUndo(set, get);
    set((state) => ({
      insertions: state.insertions.filter((ins) => ins.id !== id),
    }));
  },

  addHighlight: (highlight) => {
    pushUndo(set, get);
    set((state) => ({ highlights: [...state.highlights, highlight] }));
  },

  removeHighlight: (id) => {
    pushUndo(set, get);
    set((state) => ({
      highlights: state.highlights.filter((hl) => hl.id !== id),
    }));
  },

  undo: () => {
    const { undoStack, textBlocks, edits, insertions, highlights } = get();
    if (undoStack.length === 0) return;

    const previous = undoStack[undoStack.length - 1];
    const currentSnapshot: Snapshot = { textBlocks, edits, insertions, highlights };

    set({
      textBlocks: previous.textBlocks,
      edits: previous.edits,
      insertions: previous.insertions,
      highlights: previous.highlights,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, currentSnapshot],
    });
  },

  redo: () => {
    const { redoStack, textBlocks, edits, insertions, highlights } = get();
    if (redoStack.length === 0) return;

    const next = redoStack[redoStack.length - 1];
    const currentSnapshot: Snapshot = { textBlocks, edits, insertions, highlights };

    set({
      textBlocks: next.textBlocks,
      edits: next.edits,
      insertions: next.insertions,
      highlights: next.highlights,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, currentSnapshot],
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  reset: () =>
    set({
      textBlocks: [],
      edits: [],
      insertions: [],
      highlights: [],
      undoStack: [],
      redoStack: [],
    }),
}));
