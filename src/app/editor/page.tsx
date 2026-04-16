'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import styled from 'styled-components';
import { UploadZone } from '@/components/editor/UploadZone';
import { AuthButtons } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';
import { Button } from '@/components/ui/Button';
import { ProgressIndicator } from '@/components/ui/ProgressIndicator';
import { detectPdfType } from '@/services/pdf/pdfDetection';
import { ocrDocument, ocrWordsToTextBlocks } from '@/services/ocr/ocrService';
import type { UploadResult, PDFDetectionResult, OCRResult } from '@/types/pdf';
import type { EditorMode, TextBlock } from '@/types/editor';

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
`;

const Title = styled.h1`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const Content = styled.main`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: ${({ theme }) => theme.colors.background};
`;

const UploadWrapper = styled.div`
  width: 100%;
  max-width: 480px;
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

const TextPreview = styled.div`
  max-height: 200px;
  overflow-y: auto;
  padding: 0.75rem;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.background};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
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

interface EditorPageState {
  mode: EditorMode;
  uploadResult: UploadResult | null;
  pdfData: Uint8Array | null;
  detection: PDFDetectionResult | null;
  ocrResults: OCRResult[] | null;
  textBlocks: TextBlock[];
  ocrProgress: { current: number; total: number; pageProgress: number; status: string } | null;
  errorMessage: string | null;
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
};

export default function EditorPage() {
  const { data: session, status } = useSession();
  const [state, setState] = useState<EditorPageState>(INITIAL_STATE);

  const handleUpload = useCallback(async (file: File) => {
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
        });
      } else {
        setState({
          mode: 'editing',
          uploadResult,
          pdfData,
          detection,
          ocrResults: null,
          textBlocks: [],
          ocrProgress: null,
          errorMessage: null,
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
  }, []);

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
  }, [state.uploadResult]);

  const handleReset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return (
    <PageContainer>
      <Header>
        <Title>Editor de PDF</Title>
        {status === 'loading' ? null : session?.user ? (
          <UserMenu userName={session.user.name || session.user.email || 'Usuário'} />
        ) : (
          <AuthButtons />
        )}
      </Header>

      <Content>
        <UploadWrapper>
          {state.mode === 'idle' && <UploadZone onUpload={handleUpload} />}

          {state.mode === 'loading' && <UploadZone onUpload={handleUpload} isUploading />}

          {state.mode === 'ocr' && state.uploadResult && (
            <ResultPanel>
              <ResultHeader>
                <ResultLabel>Arquivo enviado</ResultLabel>
                <ResultValue>{state.uploadResult.fileName}</ResultValue>
                <ResultLabel>{state.uploadResult.pageCount} página(s)</ResultLabel>
              </ResultHeader>

              {state.detection && (
                <StatusMessage $variant="info">
                  PDF sem texto nativo detectado — é necessário processar OCR para extrair o texto.
                </StatusMessage>
              )}

              {state.ocrProgress ? (
                <OcrSection>
                  <ProgressIndicator
                    progress={state.ocrProgress.pageProgress}
                    label={`Página ${state.ocrProgress.current} de ${state.ocrProgress.total} — ${state.ocrProgress.status}`}
                  />
                </OcrSection>
              ) : (
                <ActionsRow>
                  <Button variant="primary" onClick={handleStartOcr}>
                    Processar OCR
                  </Button>
                  <Button variant="ghost" onClick={handleReset}>
                    Cancelar
                  </Button>
                </ActionsRow>
              )}
            </ResultPanel>
          )}

          {state.mode === 'editing' && state.uploadResult && (
            <ResultPanel>
              <ResultHeader>
                <ResultLabel>Arquivo enviado</ResultLabel>
                <ResultValue>{state.uploadResult.fileName}</ResultValue>
                <ResultLabel>{state.uploadResult.pageCount} página(s)</ResultLabel>
              </ResultHeader>

              {state.detection && (
                <StatusMessage $variant={state.detection.hasText ? 'success' : 'info'}>
                  {state.detection.hasText ? 'PDF com texto nativo' : 'PDF processado com OCR'}
                </StatusMessage>
              )}

              {state.ocrResults && state.ocrResults.length > 0 && (
                <OcrSection>
                  <ResultLabel>
                    Texto extraído via OCR ({state.textBlocks.length} bloco(s) encontrado(s))
                  </ResultLabel>
                  {state.ocrResults.some((result) => result.text.length > 0) ? (
                    <TextPreview>
                      {state.ocrResults
                        .map((result, index) => `--- Página ${index + 1} ---\n${result.text}`)
                        .join('\n\n')}
                    </TextPreview>
                  ) : (
                    <StatusMessage $variant="info">
                      Nenhum texto foi detectado nas páginas do PDF.
                    </StatusMessage>
                  )}
                </OcrSection>
              )}

              <ActionsRow>
                <Button variant="secondary" onClick={handleReset}>
                  Enviar outro PDF
                </Button>
              </ActionsRow>
            </ResultPanel>
          )}

          {state.mode === 'error' && state.errorMessage && (
            <>
              <UploadZone onUpload={handleUpload} />
              <StatusMessage $variant="error">{state.errorMessage}</StatusMessage>
              <RetryButton onClick={handleReset}>Tentar novamente</RetryButton>
            </>
          )}
        </UploadWrapper>
      </Content>
    </PageContainer>
  );
}
