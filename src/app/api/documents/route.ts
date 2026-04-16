import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { saveDocument, listDocuments } from '@/services/document/documentService';

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { name, originalPath, pages, isOcr, edits, highlights, documentId } = body;

    if (!name || !originalPath || typeof pages !== 'number') {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    const userId = authResult.user.id as string;

    const document = await saveDocument({
      userId,
      name,
      originalPath,
      pages,
      isOcr: Boolean(isOcr),
      edits: edits ?? [],
      highlights: highlights ?? [],
      documentId,
    });

    return NextResponse.json(
      { id: document.id, message: 'Documento salvo com sucesso.' },
      { status: documentId ? 200 : 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar documento.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const userId = authResult.user.id as string;
    const documents = await listDocuments(userId);
    return NextResponse.json(documents);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar documentos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
