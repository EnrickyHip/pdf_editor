'use client';

import { useCallback, useRef } from 'react';
import styled from 'styled-components';
import { useEditorStore } from '@/stores/editorStore';

interface TextOverlayProps {
  pageIndex: number;
  zoom: number;
}

const OverlayContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  pointer-events: none;
  background: white;
`;

const EditableBlock = styled.div`
  position: absolute;
  pointer-events: auto;
  cursor: text;
  outline: none;
  white-space: nowrap;
  overflow: visible;
  color: ${({ theme }) => theme.colors.text};
  background: transparent;
  caret-color: ${({ theme }) => theme.colors.accent};
  border: 1px solid transparent;
  border-radius: 2px;
  padding: 1px 2px;
  line-height: 1.2;
  transition:
    border-color 150ms,
    box-shadow 150ms;

  &:hover {
    border-color: ${({ theme }) => `${theme.colors.accent}60`};
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent};
    box-shadow: 0 0 0 2px ${({ theme }) => `${theme.colors.accent}30`};
    background: white;
  }
`;

function TextOverlay({ pageIndex, zoom }: TextOverlayProps) {
  const textBlocks = useEditorStore((state) => state.textBlocks);
  const updateBlockText = useEditorStore((state) => state.updateBlockText);
  const editableRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleBlur = useCallback(
    (blockId: string) => {
      const element = editableRefs.current.get(blockId);
      if (!element) return;

      const newText = element.textContent ?? '';
      const block = textBlocks.find((item) => item.id === blockId);
      if (block && newText !== block.text) {
        updateBlockText(blockId, newText);
      }
    },
    [textBlocks, updateBlockText],
  );

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      (event.target as HTMLDivElement).blur();
    }
  }, []);

  const pageBlocks = textBlocks.filter((block) => block.pageIndex === pageIndex);

  if (pageBlocks.length === 0) return null;

  return (
    <OverlayContainer>
      {pageBlocks.map((block) => (
        <EditableBlock
          key={block.id}
          ref={(element) => {
            if (element) {
              editableRefs.current.set(block.id, element);
              if (element.textContent !== block.text) {
                element.textContent = block.text;
              }
            } else {
              editableRefs.current.delete(block.id);
            }
          }}
          contentEditable
          suppressContentEditableWarning
          style={{
            left: `${block.x * zoom}px`,
            top: `${block.y * zoom}px`,
            fontSize: `${block.fontSize * zoom}px`,
            fontFamily: block.fontFamily,
          }}
          onBlur={() => handleBlur(block.id)}
          onKeyDown={handleKeyDown}
        />
      ))}
    </OverlayContainer>
  );
}

export { TextOverlay };
