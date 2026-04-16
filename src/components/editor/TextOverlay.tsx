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
`;

const EditableBlock = styled.div`
  position: absolute;
  pointer-events: auto;
  cursor: text;
  outline: none;
  white-space: nowrap;
  overflow: visible;
  color: ${({ theme }) => theme.colors.text};
  background: white;
  caret-color: ${({ theme }) => theme.colors.accent};
  border: none;
  line-height: 1;
  padding: 0;
  margin: 0;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 1px;
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
          tabIndex={0}
          style={{
            left: `${block.x * zoom}px`,
            top: `${block.y * zoom}px`,
            fontSize: `${block.fontSize * zoom}px`,
            fontFamily: block.fontFamily,
            minHeight: `${block.fontSize * zoom}px`,
          }}
          onBlur={() => handleBlur(block.id)}
          onKeyDown={handleKeyDown}
        />
      ))}
    </OverlayContainer>
  );
}

export { TextOverlay };
