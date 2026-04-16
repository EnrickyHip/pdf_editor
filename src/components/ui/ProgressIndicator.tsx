'use client';

import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
`;

const Label = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
`;

const Percentage = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Track = styled.div`
  width: 100%;
  height: 8px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  overflow: hidden;
`;

const Fill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => `${Math.max(0, Math.min(100, $progress * 100))}%`};
  background: ${({ theme }) => theme.colors.accent};
  border-radius: ${({ theme }) => theme.radius.sm};
  transition: width 300ms ease;
`;

interface ProgressIndicatorProps {
  progress: number;
  label?: string;
}

export function ProgressIndicator({ progress, label }: ProgressIndicatorProps) {
  const percentage = Math.round(progress * 100);

  return (
    <Container>
      <Label>
        <Title>{label ?? 'Processando...'}</Title>
        <Percentage>{percentage}%</Percentage>
      </Label>
      <Track>
        <Fill $progress={progress} />
      </Track>
    </Container>
  );
}
