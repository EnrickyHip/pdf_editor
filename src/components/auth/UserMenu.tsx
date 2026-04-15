'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import styled from 'styled-components';

const Container = styled.div`
  position: relative;
`;

const Trigger = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text};
  transition: border-color 150ms;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const Dropdown = styled.div`
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 0.25rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  min-width: 180px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  z-index: 10;
  overflow: hidden;
`;

const UserName = styled.div`
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const LogoutButton = styled.button`
  display: block;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: none;
  border: none;
  text-align: left;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.error};
  transition: background 150ms;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }
`;

interface UserMenuProps {
  userName: string;
}

export function UserMenu({ userName }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Container ref={ref}>
      <Trigger onClick={() => setOpen(!open)}>{userName}</Trigger>
      {open && (
        <Dropdown>
          <UserName>{userName}</UserName>
          <LogoutButton
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: '/' });
            }}
          >
            Sair
          </LogoutButton>
        </Dropdown>
      )}
    </Container>
  );
}
