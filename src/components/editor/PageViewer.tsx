'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import styled from 'styled-components';
import { getDocument } from '@/lib/pdfjs';
import type { PDFPageProxy, PDFDocumentProxy } from '@/lib/pdfjs';

interface PageViewerProps {
  pdfData: Uint8Array;
  currentPage: number;
  totalPages: number;
  zoom: number;
  onPageChange: (page: number) => void;
}

interface PageRenderState {
  isLoading: boolean;
  error: string | null;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  overflow: auto;
  background: ${({ theme }) => theme.colors.background};
  padding: 1rem;
`;

const CanvasWrapper = styled.div`
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  background: #fff;
  flex-shrink: 0;
`;

const PageCanvas = styled.canvas`
  display: block;
`;

const PagePlaceholder = styled.div<{ $width: number; $height: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.875rem;
`;

const LoadingSpinner = styled.div`
  width: 2rem;
  height: 2rem;
  border: 3px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.accent};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const PageNumber = styled.div`
  margin-top: 0.75rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const PageGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
`;

const PLACEHOLDER_WIDTH = 595;
const PLACEHOLDER_HEIGHT = 842;

function renderPage(canvas: HTMLCanvasElement, page: PDFPageProxy, scale: number): Promise<void> {
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível obter contexto 2D do canvas.');

  return page.render({ canvasContext: context, viewport }).promise;
}

export function PageViewer({
  pdfData,
  currentPage,
  totalPages,
  zoom,
  onPageChange,
}: PageViewerProps) {
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const renderedRef = useRef<Set<number>>(new Set());
  const [pageStates, setPageStates] = useState<Map<number, PageRenderState>>(() => {
    const initial = new Map<number, PageRenderState>();
    for (let index = 0; index < totalPages; index++) {
      initial.set(index, { isLoading: true, error: null });
    }
    return initial;
  });

  const setCanvasRef = useCallback((pageIndex: number, element: HTMLCanvasElement | null) => {
    if (element) {
      canvasRefs.current.set(pageIndex, element);
    } else {
      canvasRefs.current.delete(pageIndex);
    }
  }, []);

  const renderSinglePage = useCallback(
    async (pageIndex: number) => {
      if (renderedRef.current.has(pageIndex)) return;

      const doc = pdfDocRef.current;
      if (!doc) return;

      const canvas = canvasRefs.current.get(pageIndex);
      if (!canvas) return;

      renderedRef.current.add(pageIndex);

      setPageStates((previous) => {
        const next = new Map(previous);
        next.set(pageIndex, { isLoading: true, error: null });
        return next;
      });

      try {
        const page = await doc.getPage(pageIndex + 1);
        await renderPage(canvas, page, zoom);

        setPageStates((previous) => {
          const next = new Map(previous);
          next.set(pageIndex, { isLoading: false, error: null });
          return next;
        });
      } catch (renderError) {
        renderedRef.current.delete(pageIndex);
        const message =
          renderError instanceof Error ? renderError.message : 'Erro ao renderizar página.';

        setPageStates((previous) => {
          const next = new Map(previous);
          next.set(pageIndex, { isLoading: false, error: message });
          return next;
        });
      }
    },
    [zoom],
  );

  useEffect(() => {
    renderedRef.current.clear();
    setPageStates((previous) => {
      const next = new Map<number, PageRenderState>();
      for (const [key] of previous) {
        next.set(key, { isLoading: true, error: null });
      }
      return next;
    });
  }, [zoom]);

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
        renderSinglePage(0);
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
  }, [pdfData]);

  useEffect(() => {
    renderSinglePage(currentPage - 1);
  }, [currentPage, renderSinglePage]);

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index);

  return (
    <Container>
      <PageGroup>
        {pageNumbers.map((pageIndex) => {
          const state = pageStates.get(pageIndex) ?? { isLoading: true, error: null };

          return (
            <div key={pageIndex}>
              <CanvasWrapper>
                {state.error ? (
                  <PagePlaceholder
                    $width={PLACEHOLDER_WIDTH * zoom}
                    $height={PLACEHOLDER_HEIGHT * zoom}
                  >
                    {state.error}
                  </PagePlaceholder>
                ) : (
                  <>
                    <PageCanvas ref={(element) => setCanvasRef(pageIndex, element)} />
                    {state.isLoading && (
                      <PagePlaceholder
                        $width={PLACEHOLDER_WIDTH * zoom}
                        $height={PLACEHOLDER_HEIGHT * zoom}
                      >
                        <LoadingSpinner />
                      </PagePlaceholder>
                    )}
                  </>
                )}
              </CanvasWrapper>
              <PageNumber>
                Página {pageIndex + 1} de {totalPages}
              </PageNumber>
            </div>
          );
        })}
      </PageGroup>
    </Container>
  );
}
