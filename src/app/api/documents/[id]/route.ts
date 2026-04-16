import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { getDocument, deleteDocument } from '@/services/document/documentService';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const userId = authResult.user.id as string;
    const document = await getDocument(id, userId);
    return NextResponse.json(document);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar documento.';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const userId = authResult.user.id as string;
    await deleteDocument(id, userId);
    return NextResponse.json({ message: 'Documento excluído.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao excluir documento.';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
