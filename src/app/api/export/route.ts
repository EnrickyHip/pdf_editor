import { NextResponse } from 'next/server';
import { FileStorage } from '@/services/storage/FileStorage';
import { exportPdf } from '@/services/pdf/pdfExporter';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filePath, edits, insertions, highlights, textBlocks } = body;

    if (!filePath) {
      return NextResponse.json({ error: 'Caminho do arquivo não informado.' }, { status: 400 });
    }

    const storage = new FileStorage();
    const buffer = await storage.load(filePath);
    const pdfData = new Uint8Array(buffer);

    const result = await exportPdf({
      pdfData,
      edits: edits ?? [],
      insertions: insertions ?? [],
      highlights: highlights ?? [],
      textBlocks: textBlocks ?? [],
    });

    return new NextResponse(Buffer.from(result), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="documento-editado.pdf"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao exportar PDF.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
