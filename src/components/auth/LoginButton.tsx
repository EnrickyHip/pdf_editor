'use client';

import Link from 'next/link';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const StyledLink = styled(Link)<{ $variant: 'primary' | 'secondary' }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition:
    background 150ms,
    border-color 150ms;

  ${({ $variant, theme }) =>
    $variant === 'primary'
      ? `
    background: ${theme.colors.accent};
    color: #fff;
    &:hover { background: ${theme.colors.accentHover}; }
  `
      : `
    background: transparent;
    color: ${theme.colors.accent};
    border: 1px solid ${theme.colors.border};
    &:hover { border-color: ${theme.colors.accent}; }
  `}
`;

export function AuthButtons() {
  return (
    <Container>
      <StyledLink href="/login" $variant="secondary">
        Entrar
      </StyledLink>
      <StyledLink href="/registro" $variant="primary">
        Criar conta
      </StyledLink>
    </Container>
  );
}
