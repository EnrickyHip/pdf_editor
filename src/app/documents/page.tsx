'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Button } from '@/components/ui/Button';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: ${({ theme }) => theme.colors.background};
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
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

const Content = styled.main`
  flex: 1;
  padding: 1.5rem;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: border-color 150ms;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const CardName = styled.h2`
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CardMeta = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem 1rem;
  text-align: center;
`;

const EmptyText = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const LoadingText = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
  padding: 2rem;
`;

const ErrorText = styled.p`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.error};
  text-align: center;
  padding: 1rem;
`;

interface SavedDocument {
  id: string;
  name: string;
  pages: number;
  isOcr: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/documents');
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Erro ao carregar documentos.');
      }

      const data: SavedDocument[] = await response.json();
      setDocuments(data);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Erro ao carregar documentos.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      loadDocuments();
    }
  }, [status, router, loadDocuments]);

  const handleOpenDocument = (documentId: string) => {
    router.push(`/editor?documentId=${documentId}`);
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erro ao excluir.');

      setDocuments((previous) => previous.filter((doc) => doc.id !== documentId));
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : 'Erro ao excluir documento.';
      setError(message);
    }
  };

  if (status === 'loading') {
    return (
      <PageContainer>
        <Header>
          <Title>Meus Documentos</Title>
        </Header>
        <LoadingText>Carregando...</LoadingText>
      </PageContainer>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <PageContainer>
      <Header>
        <Title>Meus Documentos</Title>
        <HeaderActions>
          <Button variant="secondary" onClick={() => router.push('/editor')}>
            Editor
          </Button>
        </HeaderActions>
      </Header>

      <Content>
        {error && <ErrorText>{error}</ErrorText>}

        {isLoading && <LoadingText>Carregando documentos...</LoadingText>}

        {!isLoading && documents.length === 0 && (
          <EmptyState>
            <EmptyText>Você ainda não salvou nenhum documento.</EmptyText>
            <Button variant="primary" onClick={() => router.push('/editor')}>
              Abrir Editor
            </Button>
          </EmptyState>
        )}

        {!isLoading && documents.length > 0 && (
          <Grid>
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardName>{doc.name}</CardName>
                <CardMeta>
                  {doc.pages} página(s) · Editado em{' '}
                  {new Date(doc.updatedAt).toLocaleDateString('pt-BR')}
                </CardMeta>
                <CardActions>
                  <Button variant="primary" onClick={() => handleOpenDocument(doc.id)}>
                    Abrir
                  </Button>
                  <Button variant="ghost" onClick={() => handleDeleteDocument(doc.id)}>
                    Excluir
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Grid>
        )}
      </Content>
    </PageContainer>
  );
}
