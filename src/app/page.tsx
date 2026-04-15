'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import styled from 'styled-components';
import { AuthButtons } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';
import { Button } from '@/components/ui/Button';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
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
`;

const Hero = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 2rem;
  text-align: center;
`;

const HeroTitle = styled.h2`
  font-size: clamp(1.25rem, 3vw, 1.75rem);
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const HeroSubtitle = styled.p`
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  max-width: 400px;
`;

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'loading' && session?.user) {
      router.replace('/editor');
    }
  }, [status, session, router]);

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

      <Hero>
        <HeroTitle>Edite PDFs diretamente no navegador</HeroTitle>
        <HeroSubtitle>
          Faça upload, edite textos inline, insira novos textos, grife trechos e exporte o
          resultado. Sem instalar nada.
        </HeroSubtitle>
        <Button onClick={() => router.push('/editor')}>Abrir Editor</Button>
      </Hero>
    </PageContainer>
  );
}
