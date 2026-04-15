'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import styled from 'styled-components';
import { UploadZone } from '@/components/editor/UploadZone';
import { AuthButtons } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';
import type { UploadResult, PDFDetectionResult } from '@/types/pdf';
import type { EditorMode } from '@/types/editor';

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

const DetectionResult = styled.div`
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-top: 1rem;
  text-align: center;
`;

const DetectionLabel = styled.p`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 0.25rem;
`;

const DetectionValue = styled.p`
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

interface UploadState {
  mode: EditorMode;
  result: UploadResult | null;
  detection: PDFDetectionResult | null;
  errorMessage: string | null;
}

export default function EditorPage() {
  const { data: session, status } = useSession();
  const [uploadState, setUploadState] = useState<UploadState>({
    mode: 'idle',
    result: null,
    detection: null,
    errorMessage: null,
  });

  const handleUpload = useCallback(async (file: File) => {
    setUploadState({
      mode: 'loading',
      result: null,
      detection: null,
      errorMessage: null,
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Erro ao fazer upload do arquivo.');
      }

      const uploadResult: UploadResult = await response.json();

      setUploadState({
        mode: 'editing',
        result: uploadResult,
        detection: null,
        errorMessage: null,
      });
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Erro desconhecido.';
      setUploadState({
        mode: 'error',
        result: null,
        detection: null,
        errorMessage: message,
      });
    }
  }, []);

  const handleReset = useCallback(() => {
    setUploadState({
      mode: 'idle',
      result: null,
      detection: null,
      errorMessage: null,
    });
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
          {uploadState.mode === 'idle' && <UploadZone onUpload={handleUpload} />}

          {uploadState.mode === 'loading' && <UploadZone onUpload={handleUpload} isUploading />}

          {uploadState.mode === 'editing' && uploadState.result && (
            <DetectionResult>
              <DetectionLabel>Arquivo enviado</DetectionLabel>
              <DetectionValue>{uploadState.result.fileName}</DetectionValue>
              <DetectionLabel>{uploadState.result.pageCount} página(s)</DetectionLabel>
              {uploadState.detection && (
                <>
                  <DetectionLabel>
                    {uploadState.detection.hasText
                      ? 'PDF com texto nativo detectado'
                      : 'PDF sem texto nativo (pode precisar de OCR)'}
                  </DetectionLabel>
                  <DetectionLabel>
                    Caracteres detectados: {uploadState.detection.textLength}
                  </DetectionLabel>
                </>
              )}
              <StatusMessage $variant="success">Upload concluído com sucesso.</StatusMessage>
            </DetectionResult>
          )}

          {uploadState.mode === 'error' && uploadState.errorMessage && (
            <>
              <UploadZone onUpload={handleUpload} />
              <StatusMessage $variant="error">{uploadState.errorMessage}</StatusMessage>
              <button
                onClick={handleReset}
                style={{
                  display: 'block',
                  margin: '0.5rem auto 0',
                  background: 'none',
                  border: 'none',
                  color: '#4F6D7A',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                }}
              >
                Tentar novamente
              </button>
            </>
          )}
        </UploadWrapper>
      </Content>
    </PageContainer>
  );
}
