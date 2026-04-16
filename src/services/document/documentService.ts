import { prisma } from '@/lib/prisma';
import { validateEdits, validateHighlights } from '@/lib/schemas';
import type { TextEdit, Highlight } from '@/types/editor';

const MAX_VERSIONS = 3;

interface SaveDocumentParams {
  userId: string;
  name: string;
  originalPath: string;
  pages: number;
  isOcr: boolean;
  edits: TextEdit[];
  highlights: Highlight[];
  documentId?: string;
}

export async function saveDocument(params: SaveDocumentParams) {
  const { userId, name, originalPath, pages, isOcr, edits, highlights, documentId } = params;

  const validatedEdits = validateEdits(edits);
  const validatedHighlights = validateHighlights(highlights);

  if (documentId) {
    const existing = await prisma.document.findUnique({ where: { id: documentId } });
    if (!existing || existing.userId !== userId) {
      throw new Error('Documento não encontrado.');
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        edits: validatedEdits,
        highlights: validatedHighlights,
      },
    });

    await prisma.documentVersion.create({
      data: {
        documentId: updated.id,
        name: `${name} - v${Date.now()}`,
        edits: validatedEdits,
        highlights: validatedHighlights,
        filePath: originalPath,
      },
    });

    await pruneOldVersions(documentId);

    return updated;
  }

  const document = await prisma.document.create({
    data: {
      userId,
      name,
      originalPath,
      pages,
      isOcr,
      edits: validatedEdits,
      highlights: validatedHighlights,
    },
  });

  await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      name: `${name} - v1`,
      edits: validatedEdits,
      highlights: validatedHighlights,
      filePath: originalPath,
    },
  });

  return document;
}

async function pruneOldVersions(documentId: string) {
  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { createdAt: 'desc' },
  });

  if (versions.length > MAX_VERSIONS) {
    const toDelete = versions.slice(MAX_VERSIONS);
    await prisma.documentVersion.deleteMany({
      where: { id: { in: toDelete.map((version) => version.id) } },
    });
  }
}

export async function listDocuments(userId: string) {
  return prisma.document.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      pages: true,
      isOcr: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getDocument(id: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { createdAt: 'desc' },
        take: MAX_VERSIONS,
      },
    },
  });

  if (!document || document.userId !== userId) {
    throw new Error('Documento não encontrado.');
  }

  return document;
}

export async function deleteDocument(id: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document || document.userId !== userId) {
    throw new Error('Documento não encontrado.');
  }

  return prisma.document.delete({ where: { id } });
}
