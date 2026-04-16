'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { UploadZone } from '@/components/editor/UploadZone';
import { AuthButtons } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';
import { Button } from '@/components/ui/Button';
import { ProgressIndicator } from '@/components/ui/ProgressIndicator';
import { detectPdfType, extractPageTexts } from '@/services/pdf/pdfDetection';
import { useEditorStore } from '@/stores/editorStore';
import type { UploadResult, PDFDetectionResult, OCRResult } from '@/types/pdf';
import type { EditorMode, TextBlock } from '@/types/editor';

const PageViewer = dynamic(
  () => import('@/components/editor/PageViewer').then((module) => ({ default: module.PageViewer })),
  { ssr: false },
);

const PageNavigator = dynamic(
  () =>
    import('@/components/editor/PageNavigator').then((module) => ({
      default: module.PageNavigator,
    })),
  { ssr: false },
);

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100dvh;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  flex-shrink: 0;
`;

const Title = styled.h1`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  flex-shrink: 0;
`;

const ToolbarGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ToolbarSeparator = styled.div`
  width: 1px;
  height: 1.25rem;
  background: ${({ theme }) => theme.colors.border};
  margin: 0 0.25rem;
`;

const ZoomLabel = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  min-width: 3rem;
  text-align: center;
`;

const ToolbarButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme, $active }) => ($active ? `${theme.colors.accent}15` : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.textSecondary)};
  cursor: pointer;
  transition:
    background 150ms,
    color 150ms;
  font-size: 1rem;

  &:hover {
    background: ${({ theme }) => `${theme.colors.accent}10`};
    color: ${({ theme }) => theme.colors.accent};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const EditorBody = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const Content = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.background};
  overflow: hidden;
`;

const UploadWrapper = styled.div`
  width: 100%;
  max-width: 480px;
  padding: 2rem;
`;

const StatusMessage = styled.div<{ $variant: 'info' | 'error' | 'success' }>`
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 0.8125rem;
  margin-top: 1rem;
  text-align: center;
  background: ${({ theme, $variant }) => {
    switch ($variant) {
      case 'error':
        return `${theme.colors.error}10`;
      case 'success':
        return `${theme.colors.success}10`;
      default:
        return `${theme.colors.accent}10`;
    }
  }};
  color: ${({ theme, $variant }) => {
    switch ($variant) {
      case 'error':
        return theme.colors.error;
      case 'success':
        return theme.colors.success;
      default:
        return theme.colors.accent;
    }
  }};
`;

const ResultPanel = styled.div`
  padding: 1.5rem;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ResultHeader = styled.div`
  text-align: center;
`;

const ResultLabel = styled.p`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 0.25rem;
`;

const ResultValue = styled.p`
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
`;

const OcrSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const RetryButton = styled.button`
  display: block;
  margin: 0.5rem auto 0;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.accent};
  cursor: pointer;
  font-size: 0.8125rem;
  text-decoration: underline;

  &:hover {
    color: ${({ theme }) => theme.colors.accentHover};
  }
`;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.25;

interface EditorPageState {
  mode: EditorMode;
  uploadResult: UploadResult | null;
  pdfData: Uint8Array | null;
  detection: PDFDetectionResult | null;
  ocrResults: OCRResult[] | null;
  textBlocks: TextBlock[];
  ocrProgress: { current: number; total: number; pageProgress: number; status: string } | null;
  errorMessage: string | null;
  currentPage: number;
  zoom: number;
}

const INITIAL_STATE: EditorPageState = {
  mode: 'idle',
  uploadResult: null,
  pdfData: null,
  detection: null,
  ocrResults: null,
  textBlocks: [],
  ocrProgress: null,
  errorMessage: null,
  currentPage: 1,
  zoom: 1.0,
};

export default function EditorPage() {
  const { data: session, status } = useSession();
  const [state, setState] = useState<EditorPageState>(INITIAL_STATE);
  const setTextBlocks = useEditorStore((s) => s.setTextBlocks);
  const resetEditorStore = useEditorStore((s) => s.reset);

  const handleUpload = useCallback(
    async (file: File) => {
      setState({
        ...INITIAL_STATE,
        mode: 'loading',
      });

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const responseData = await response.json().catch(() => null);
          throw new Error(responseData?.error ?? 'Erro ao fazer upload do arquivo.');
        }

        const uploadResult: UploadResult = await response.json();

        const arrayBuffer = await file.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer);

        let detection: PDFDetectionResult | null = null;
        try {
          detection = detectPdfType(pdfData);
        } catch {
          detection = null;
        }

        if (detection && !detection.hasText) {
          setState({
            mode: 'ocr',
            uploadResult,
            pdfData,
            detection,
            ocrResults: null,
            textBlocks: [],
            ocrProgress: null,
            errorMessage: null,
            currentPage: 1,
            zoom: 1.0,
          });
        } else {
          const nativeBlocks = await extractPageTexts(pdfData);
          setTextBlocks(nativeBlocks);

          setState({
            mode: 'editing',
            uploadResult,
            pdfData,
            detection,
            ocrResults: null,
            textBlocks: nativeBlocks,
            ocrProgress: null,
            errorMessage: null,
            currentPage: 1,
            zoom: 1.0,
          });
        }
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : 'Erro desconhecido.';
        setState({
          ...INITIAL_STATE,
          mode: 'error',
          errorMessage: message,
        });
      }
    },
    [setTextBlocks],
  );

  const handleStartOcr = useCallback(async () => {
    if (!state.pdfData || !state.uploadResult) return;

    const totalPages = state.uploadResult.pageCount;
    const documentId = state.uploadResult.documentId;

    setState((previous) => ({
      ...previous,
      mode: 'ocr',
      ocrProgress: { current: 1, total: totalPages, pageProgress: 0, status: 'Iniciando' },
      errorMessage: null,
    }));

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error ?? 'Erro ao processar OCR.');
      }

      const ocrData = await response.json();

      const textBlocks = ocrData.blocks;

      setTextBlocks(textBlocks);

      setState((previous) => ({
        ...previous,
        mode: 'editing',
        ocrResults:
          ocrData.words?.map((w: { text: string; words: unknown[] }) => ({
            text: w.text,
            words: w.words ?? [],
          })) ?? [],
        textBlocks,
        ocrProgress: null,
      }));
    } catch (ocrError) {
      const message = ocrError instanceof Error ? ocrError.message : 'Erro ao processar OCR.';
      setState((previous) => ({
        ...previous,
        mode: 'error',
        ocrProgress: null,
        errorMessage: message,
      }));
    }
  }, [state.uploadResult, state.pdfData, setTextBlocks]);

  const handleReset = useCallback(() => {
    setState(INITIAL_STATE);
    resetEditorStore();
  }, [resetEditorStore]);

  const handlePageChange = useCallback((page: number) => {
    setState((previous) => ({ ...previous, currentPage: page }));
  }, []);

  const handleZoomIn = useCallback(() => {
    setState((previous) => ({
      ...previous,
      zoom: Math.min(MAX_ZOOM, Math.round((previous.zoom + ZOOM_STEP) * 100) / 100),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setState((previous) => ({
      ...previous,
      zoom: Math.max(MIN_ZOOM, Math.round((previous.zoom - ZOOM_STEP) * 100) / 100),
    }));
  }, []);

  const isEditing = state.mode === 'editing' && state.pdfData && state.uploadResult;
  const canZoomIn = state.zoom < MAX_ZOOM;
  const canZoomOut = state.zoom > MIN_ZOOM;
  const zoomPercent = Math.round(state.zoom * 100);

  return (
    <PageContainer>
      <Header>
        <Title>Editor de PDF</Title>
        <HeaderActions>
          {isEditing && (
            <Button variant="secondary" onClick={handleReset}>
              Novo PDF
            </Button>
          )}
          {status === 'loading' ? null : session?.user ? (
            <UserMenu userName={session.user.name || session.user.email || 'Usuário'} />
          ) : (
            <AuthButtons />
          )}
        </HeaderActions>
      </Header>

      {isEditing && state.uploadResult !== null && (
        <Toolbar>
          <ToolbarGroup>
            <ToolbarButton onClick={handleZoomOut} disabled={!canZoomOut} title="Diminuir zoom">
              −
            </ToolbarButton>
            <ZoomLabel>{zoomPercent}%</ZoomLabel>
            <ToolbarButton onClick={handleZoomIn} disabled={!canZoomIn} title="Aumentar zoom">
              +
            </ToolbarButton>
          </ToolbarGroup>
          <ToolbarSeparator />
          <ToolbarGroup>
            <span
              style={{
                fontSize: '0.8125rem',
                color: '#6B7280',
              }}
            >
              {state.uploadResult.fileName} — {state.uploadResult.pageCount} página(s)
            </span>
          </ToolbarGroup>
        </Toolbar>
      )}

      <EditorBody>
        {isEditing && state.pdfData !== null && state.uploadResult !== null && (
          <PageNavigator
            pdfData={state.pdfData}
            currentPage={state.currentPage}
            totalPages={state.uploadResult.pageCount}
            onPageSelect={handlePageChange}
          />
        )}

        <Content>
          {state.mode === 'idle' && (
            <UploadWrapper>
              <UploadZone onUpload={handleUpload} />
            </UploadWrapper>
          )}

          {state.mode === 'loading' && (
            <UploadWrapper>
              <UploadZone onUpload={handleUpload} isUploading />
            </UploadWrapper>
          )}

          {state.mode === 'ocr' && !state.ocrProgress && state.uploadResult && (
            <UploadWrapper>
              <ResultPanel>
                <ResultHeader>
                  <ResultLabel>Arquivo enviado</ResultLabel>
                  <ResultValue>{state.uploadResult.fileName}</ResultValue>
                  <ResultLabel>{state.uploadResult.pageCount} página(s)</ResultLabel>
                </ResultHeader>

                {state.detection && (
                  <StatusMessage $variant="info">
                    PDF sem texto nativo detectado — é necessário processar OCR para extrair o
                    texto.
                  </StatusMessage>
                )}

                <ActionsRow>
                  <Button variant="primary" onClick={handleStartOcr}>
                    Processar OCR
                  </Button>
                  <Button variant="ghost" onClick={handleReset}>
                    Cancelar
                  </Button>
                </ActionsRow>
              </ResultPanel>
            </UploadWrapper>
          )}

          {state.mode === 'ocr' && state.ocrProgress && (
            <UploadWrapper>
              <ResultPanel>
                <ProgressIndicator
                  progress={state.ocrProgress.pageProgress}
                  label={`Página ${state.ocrProgress.current} de ${state.ocrProgress.total} — ${state.ocrProgress.status}`}
                />
              </ResultPanel>
            </UploadWrapper>
          )}

          {state.mode === 'editing' && state.pdfData && state.uploadResult && (
            <PageViewer
              pdfData={state.pdfData}
              currentPage={state.currentPage}
              totalPages={state.uploadResult.pageCount}
              zoom={state.zoom}
              onPageChange={handlePageChange}
            />
          )}

          {state.mode === 'error' && state.errorMessage && (
            <UploadWrapper>
              <UploadZone onUpload={handleUpload} />
              <StatusMessage $variant="error">{state.errorMessage}</StatusMessage>
              <RetryButton onClick={handleReset}>Tentar novamente</RetryButton>
            </UploadWrapper>
          )}
        </Content>
      </EditorBody>
    </PageContainer>
  );
}
