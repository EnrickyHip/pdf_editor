'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import styled from 'styled-components';
import { getDocument } from '@/lib/pdfjs';
import type { PDFDocumentProxy } from '@/lib/pdfjs';

interface PageNavigatorProps {
  pdfData: Uint8Array;
  currentPage: number;
  totalPages: number;
  onPageSelect: (page: number) => void;
}

interface ThumbnailState {
  isLoading: boolean;
  dataUrl: string | null;
}

const Container = styled.aside`
  display: flex;
  flex-direction: column;
  width: 140px;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  overflow-y: auto;
`;

const Title = styled.div`
  padding: 0.75rem 0.5rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const ThumbnailList = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
`;

const ThumbnailItem = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem;
  border: 2px solid ${({ theme, $active }) => ($active ? theme.colors.accent : 'transparent')};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: none;
  cursor: pointer;
  width: 100%;
  transition: border-color 150ms;

  &:hover {
    border-color: ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.border)};
  }
`;

const ThumbnailImage = styled.div`
  width: 100%;
  aspect-ratio: 595 / 842;
  background: #fff;
  border-radius: 2px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const ThumbnailPlaceholder = styled.div`
  width: 100%;
  aspect-ratio: 595 / 842;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MiniSpinner = styled.div`
  width: 1rem;
  height: 1rem;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.accent};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const PageLabel = styled.span<{ $active: boolean }>`
  font-size: 0.6875rem;
  color: ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.textSecondary)};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
`;

export function PageNavigator({
  pdfData,
  currentPage,
  totalPages,
  onPageSelect,
}: PageNavigatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const [thumbnails, setThumbnails] = useState<Map<number, ThumbnailState>>(() => {
    const initial = new Map<number, ThumbnailState>();
    for (let index = 0; index < totalPages; index++) {
      initial.set(index, { isLoading: true, dataUrl: null });
    }
    return initial;
  });

  const renderThumbnail = useCallback(async (pageIndex: number) => {
    const doc = pdfDocRef.current;
    if (!doc) return;

    try {
      const page = await doc.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 0.25 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const context = canvas.getContext('2d');
      if (!context) throw new Error('Não foi possível obter contexto 2D do canvas.');

      await page.render({ canvasContext: context, viewport }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

      setThumbnails((previous) => {
        const next = new Map(previous);
        next.set(pageIndex, { isLoading: false, dataUrl });
        return next;
      });
    } catch {
      setThumbnails((previous) => {
        const next = new Map(previous);
        next.set(pageIndex, { isLoading: false, dataUrl: null });
        return next;
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const doc = await getDocument({ data: new Uint8Array(pdfData) }).promise;
        if (cancelled) {
          doc.destroy();
          return;
        }

        pdfDocRef.current = doc;

        for (let index = 0; index < totalPages; index++) {
          renderThumbnail(index);
        }
      } catch (initError) {
        console.error('Erro ao inicializar PDF:', initError);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [pdfData, totalPages, renderThumbnail]);

  useEffect(() => {
    if (!containerRef.current) return;

    const activeItem = containerRef.current.querySelector(`[data-page="${currentPage}"]`);
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentPage]);

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index);

  return (
    <Container ref={containerRef}>
      <Title>Páginas</Title>
      <ThumbnailList>
        {pageNumbers.map((pageIndex) => {
          const state = thumbnails.get(pageIndex) ?? {
            isLoading: true,
            dataUrl: null,
          };
          const isActive = pageIndex + 1 === currentPage;

          return (
            <ThumbnailItem
              key={pageIndex}
              data-page={pageIndex + 1}
              $active={isActive}
              onClick={() => onPageSelect(pageIndex + 1)}
            >
              <ThumbnailImage>
                {state.isLoading ? (
                  <ThumbnailPlaceholder>
                    <MiniSpinner />
                  </ThumbnailPlaceholder>
                ) : state.dataUrl ? (
                  <img
                    src={state.dataUrl}
                    alt={`Miniatura da página ${pageIndex + 1}`}
                    loading="lazy"
                  />
                ) : (
                  <ThumbnailPlaceholder />
                )}
              </ThumbnailImage>
              <PageLabel $active={isActive}>{pageIndex + 1}</PageLabel>
            </ThumbnailItem>
          );
        })}
      </ThumbnailList>
    </Container>
  );
}
