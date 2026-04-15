'use client';

import { useSession } from 'next-auth/react';
import { AuthButtons } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';
import styled from 'styled-components';

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Title = styled.h1`
  font-size: 1.125rem;
  font-weight: 600;
`;

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <>
      <Header>
        <Title>Editor de PDF</Title>
        {status === 'loading' ? null : session?.user ? (
          <UserMenu userName={session.user.name || session.user.email || 'Usuário'} />
        ) : (
          <AuthButtons />
        )}
      </Header>
    </>
  );
}
