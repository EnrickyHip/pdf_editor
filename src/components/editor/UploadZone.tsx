'use client';

import { useState, useRef, useCallback } from 'react';
import styled, { css, keyframes } from 'styled-components';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPE = 'application/pdf';

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
}

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

const Container = styled.div<{ $isDragging: boolean; $hasError: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem 2rem;
  border: 2px dashed
    ${({ theme, $isDragging, $hasError }) => {
      if ($hasError) return theme.colors.error;
      if ($isDragging) return theme.colors.accent;
      return theme.colors.border;
    }};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme, $isDragging }) =>
    $isDragging ? `${theme.colors.accent}08` : theme.colors.surface};
  cursor: pointer;
  transition:
    border-color 200ms,
    background 200ms;
  text-align: center;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent};
    background: ${({ theme }) => `${theme.colors.accent}08`};
  }
`;

const Icon = styled.div`
  font-size: 2.5rem;
  line-height: 1;
`;

const Title = styled.p`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const Subtitle = styled.p`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ErrorText = styled.p`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.error};
  font-weight: 500;
`;

const BrowseButton = styled.span`
  color: ${({ theme }) => theme.colors.accent};
  font-weight: 500;
  cursor: pointer;
`;

const UploadingIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const Spinner = styled.div`
  width: 2rem;
  height: 2rem;
  border: 3px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.accent};
  border-radius: 50%;
  animation: ${pulse} 1s ease-in-out infinite;
`;

const HiddenInput = styled.input`
  display: none;
`;

function validateFile(file: File): string | null {
  if (file.type !== ACCEPTED_TYPE && !file.name.toLowerCase().endsWith('.pdf')) {
    return 'Apenas arquivos PDF são aceitos.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
  }
  return null;
}

export function UploadZone({ onUpload, isUploading = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      onUpload(file);
    },
    [onUpload],
  );

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      const file = event.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [handleFile],
  );

  const handleClick = useCallback(() => {
    if (!isUploading) {
      inputRef.current?.click();
    }
  }, [isUploading]);

  if (isUploading) {
    return (
      <Container $isDragging={false} $hasError={false}>
        <UploadingIndicator>
          <Spinner />
          <Title>Enviando arquivo...</Title>
        </UploadingIndicator>
      </Container>
    );
  }

  return (
    <Container
      $isDragging={isDragging}
      $hasError={!!error}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
    >
      <Icon>📄</Icon>
      <Title>Arraste um PDF aqui</Title>
      <Subtitle>
        ou <BrowseButton>selecione um arquivo</BrowseButton>
      </Subtitle>
      <Subtitle>PDF • Máximo 20MB</Subtitle>
      {error && <ErrorText>{error}</ErrorText>}
      <HiddenInput
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleInputChange}
      />
    </Container>
  );
}
