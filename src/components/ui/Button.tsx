'use client';

import styled, { css } from 'styled-components';

const variants = {
  primary: css`
    background: ${({ theme }) => theme.colors.accent};
    color: #fff;
    border: none;

    &:hover {
      background: ${({ theme }) => theme.colors.accentHover};
    }
  `,
  secondary: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.accent};
    border: 1px solid ${({ theme }) => theme.colors.border};

    &:hover {
      border-color: ${({ theme }) => theme.colors.accent};
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.textSecondary};
    border: none;

    &:hover {
      color: ${({ theme }) => theme.colors.text};
    }
  `,
};

const StyledButton = styled.button<{ $variant: 'primary' | 'secondary' | 'ghost' }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 0.875rem;
  font-weight: 500;
  transition:
    background 150ms,
    border-color 150ms,
    color 150ms;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${({ $variant }) => variants[$variant]}
`;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({ variant = 'primary', ...props }: ButtonProps) {
  return <StyledButton $variant={variant} {...props} />;
}
