import { NextResponse } from 'next/server';
import { FileStorage } from '@/services/storage/FileStorage';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filePath } = body;

    if (!filePath) {
      return NextResponse.json({ error: 'Caminho não informado.' }, { status: 400 });
    }

    const storage = new FileStorage();
    const buffer = await storage.load(filePath);

    return new NextResponse(new Uint8Array(buffer), {
      headers: { 'Content-Type': 'application/pdf' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar arquivo.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
