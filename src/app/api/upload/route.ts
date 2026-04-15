import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { FileStorage } from '@/services/storage/FileStorage';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPE = 'application/pdf';

function getPageCountFromBuffer(buffer: Buffer): number {
  const content = buffer.toString('latin1');
  const matches = content.match(/\/Type\s*\/Page(?!s)/g);
  return matches ? matches.length : 1;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    if (file.type !== ACCEPTED_TYPE && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Apenas arquivos PDF são aceitos.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pageCount = getPageCountFromBuffer(buffer);

    const documentId = randomUUID();
    const fileName = `${documentId}.pdf`;
    const storage = new FileStorage();
    await storage.save(buffer, fileName);

    return NextResponse.json(
      {
        documentId,
        filePath: fileName,
        fileName: file.name,
        pageCount,
      },
      { status: 201 },
    );
  } catch (uploadError) {
    const message =
      uploadError instanceof Error ? uploadError.message : 'Erro ao fazer upload do arquivo.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
