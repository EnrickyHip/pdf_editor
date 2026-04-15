# Plano: Editor de PDF

> Autocontido. Sessão nova, sem histórico, executa do início ao fim.
> Estimativa: ~12-16h de implementação.

## Contexto

Editor de PDF no browser. Usuário faz upload, o sistema detecta se é texto nativo ou imagem (OCR), permite editar textos inline, inserir novos, grifar trechos, e exportar o PDF com mudanças. Login opcional via NextAuth — sem login edita e exporta, com login salva e tem histórico.

Template atual: Next.js 15 App Router, styled-components 6, TypeScript 5.8, Jest.

## Escopo

**Dentro:** upload, detecção, OCR, renderização, edição inline, inserção de texto, highlights, export, login (Google), salvar/carregar, histórico de versões (3), undo/redo, zoom, navegação entre páginas.

**Fora:** colaboração em tempo real, múltiplos usuários simultâneos, PDFs com senha, assinatura digital, múltiplos providers de auth.

## Decisões

| Decisão | Justificativa | Alternativa descartada | Por que não |
|---------|---------------|------------------------|-------------|
| Híbrida: overlay + reescrita no export | Preview instantâneo sem corromper PDF | Reescrever sempre | Risco de quebrar fontes/layouts |
| API Routes + Prisma | Menos infra, repo único | Backend separado | Overhead de config para 24h |
| Filesystem local | Simples, sem conta externa | S3/MinIO | Config extra desnecessária |
| PDF.js client-side | Mais rápido, sem latência | Server-side | Mais lento, precisa transferir bytes |
| OCR server-side (Tesseract.js) | Não trava browser, mais recursos | Client-side | Travaria com PDFs grandes |
| NextAuth Google | Único provider pedido | GitHub, credenciais | Não solicitado |
| styled-components 6 | Template já configurado | Tailwind | Não vale a pena trocar em 24h |

## Arquivos Para Ler

- `src/app/layout.tsx` — layout raiz com ThemeProvider
- `src/app/page.tsx` — página home
- `src/styles/theme.ts` — tema do styled-components
- `src/styles/globalStyles.ts` — estilos globais
- `package.json` — dependências atuais
- `next.config.js` — configuração do Next.js
- `tsconfig.json` — configuração do TypeScript

## Cobertura

- **Backend:** Prisma schema, API routes (upload, documents, ocr, auth), storage adapter
- **Frontend:** editor page, toolbar, page viewer, text overlay, highlight layer, upload zone, page navigator, login button, user menu
- **Banco:** migrations Prisma (documents, document_versions, users)

## Fases de Implementação

### Fase 1: Infra Base (Docker + Prisma + NextAuth)

### Fase 2: Upload e Detecção de PDF

### Fase 3: OCR

### Fase 4: Renderização do PDF

### Fase 5: Edição de Texto

### Fase 6: Highlights

### Fase 7: Salvar/Carregar + Histórico

### Fase 8: Undo/Redo

### Fase 9: UX (Zoom, Navegação, Loading)

### Fase 10: Testes

---

## Implementação Detalhada

---

### Fase 1.1: Docker Compose (PostgreSQL)

**Arquivo:** `docker-compose.yml`
**Risco:** nenhum

**Depois:**
```yaml
services:
  postgres:
    image: postgres:17-alpine
    env_file:
      - .env
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

**Verificação:**
```bash
docker compose up -d
# Esperado: container postgres rodando na porta 5432
```

---

### Fase 1.2: Prisma Setup

**Arquivo:** `package.json`, `src/lib/prisma.ts`
**Risco:** baixo

**Depois (package.json scripts):**
```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma push",
    "db:studio": "prisma studio"
  }
}
```

Instalar: `npm install prisma @prisma/client`

Inicializar: `npx prisma init`

**Schema (`prisma/schema.prisma`):**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  documents     Document[]
}

model Document {
  id            String              @id @default(cuid())
  userId        String
  user          User                @relation(fields: [userId], references: [id])
  name          String
  originalPath  String
  pages         Int
  isOcr         Boolean             @default(false)
  edits         Json                @default("[]")
  highlights    Json                @default("[]")
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  versions      DocumentVersion[]
}

model DocumentVersion {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id])
  name        String
  edits       Json
  highlights  Json
  filePath    String
  createdAt   DateTime @default(now())
}
```

**`.env`:**
```
POSTGRES_USER=pdf_editor
POSTGRES_PASSWORD=pdf_editor_secret
POSTGRES_DB=pdf_editor

DATABASE_URL="postgresql://pdf_editor:pdf_editor_secret@localhost:5432/pdf_editor"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-change-in-production"

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Exemplo em `.env.example`.

**`src/lib/prisma.ts`:**
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Verificação:**
```bash
npx prisma migrate dev --name init
npx prisma generate
# Esperado: migrations criadas, client gerado
```

---

### Fase 1.3: NextAuth

**Arquivo:** `src/app/api/auth/[...nextauth]/route.ts`
**Risco:** baixo

Instalar: `npm install next-auth`

**`src/lib/auth.ts`:**
```typescript
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const db = (await import('@/lib/prisma')).prisma;
      await db.user.upsert({
        where: { email: user.email },
        update: { name: user.name, image: user.image },
        create: { email: user.email, name: user.name, image: user.image },
      });
      return true;
    },
    async session({ session }) {
      return session;
    },
  },
});
```

**`src/app/api/auth/[...nextauth]/route.ts`:**
```typescript
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
```

**Verificação:**
```bash
npm run build
# Esperado: build sem erros
```

---

### Fase 2.1: Upload Zone (Frontend)

**Arquivo:** `src/components/editor/UploadZone.tsx`
**Risco:** baixo

Componente com drag & drop + seletor de arquivo. Aceita apenas PDF. Valida tamanho (máx 20MB).

**Comportamento:**
- Arrastar PDF sobre a zona → destaque visual
- Soltar ou selecionar → callback com o File
- Arquivo > 20MB → mensagem de erro
- Arquivo não-PDF → mensagem de erro

---

### Fase 2.2: API de Upload

**Arquivo:** `src/app/api/upload/route.ts`
**Risco:** médio (operação de arquivo)

**Comportamento:**
- Recebe FormData com o PDF
- Salva em `uploads/{uuid}.pdf`
- Retorna `{ documentId, filePath, pageCount }`

---

### Fase 2.3: Detecção PDF-texto vs PDF-imagem

**Arquivo:** `src/services/pdf/pdfDetection.ts`
**Risco:** baixo

**Lógica:**
- Usar PDF.js para extrair texto de cada página
- Se total de caracteres extraídos > threshold (ex: 50 por página) → texto nativo
- Caso contrário → imagem escaneada, precisa de OCR

**Verificação:**
```bash
npm test -- --testPathPattern=pdfDetection
# Esperado: testes passando
```

---

### Fase 3: OCR

**Arquivo:** `src/app/api/ocr/route.ts`, `src/services/ocr/ocrService.ts`
**Risco:** médio (lento, consome CPU)

Instalar: `npm install tesseract.js`

**Comportamento:**
- Recebe `documentId` + `pageIndex`
- Abre o PDF, renderiza página como imagem (pdf-lib ou canvas)
- Envia para Tesseract.js
- Retorna `{ text: string, words: [{ text, bbox: { x0, y0, x1, y1 }, confidence }] }`
- Progresso reportado via streaming (SSE ou polling)

**Frontend:**
- Botão "Processar OCR" visível apenas se PDF detectado como imagem
- Barra de progresso por página
- Feedback visual: "Processando página 3 de 15..."

---

### Fase 4.1: Page Viewer (PDF.js)

**Arquivo:** `src/components/editor/PageViewer.tsx`
**Risco:** médio

Instalar: `npm install pdfjs-dist`

**Comportamento:**
- Recebe PDF como ArrayBuffer
- Renderiza página atual em canvas via PDF.js
- Suporte a zoom (escala do canvas)
- Lazy: carrega apenas página atual ± 2

---

### Fase 4.2: Editor Page

**Arquivo:** `src/app/editor/page.tsx`
**Risco:** médio

Página principal que orquestra:
- Upload Zone (quando sem documento)
- Page Viewer + Text Overlay + Toolbar (quando com documento)

---

### Fase 5.1: Text Overlay

**Arquivo:** `src/components/editor/TextOverlay.tsx`
**Risco:** alto (precisão de posicionamento)

**Comportamento:**
- Recebe text blocks (posições do PDF.js ou OCR)
- Renderiza div contentEditable em cada posição
- Posicionamento absoluto sobre o canvas do PDF
- Escala as posições conforme o zoom

---

### Fase 5.2: Edição de Texto

**Arquivo:** `src/services/editor/editorService.ts`, Zustand store
**Risco:** alto

**Zustand Store (`src/stores/editorStore.ts`):**
- `edits: TextEdit[]` — texto alterado, posição, página
- `highlights: Highlight[]`
- `addEdit()`, `updateEdit()`, `removeEdit()`
- `undo()`, `redo()`

---

### Fase 6: Highlights

**Arquivo:** `src/components/editor/HighlightLayer.tsx`
**Risco:** médio

**Comportamento:**
- Selecionar texto no PDF → botão de highlight
- Cores: amarelo (default), verde, azul, rosa
- Highlights salvos como overlay com posição

---

### Fase 7.1: Storage Adapter

**Arquivo:** `src/services/storage/StorageAdapter.ts`, `src/services/storage/FileStorage.ts`
**Risco:** baixo

```typescript
interface StorageAdapter {
  save(file: Buffer, path: string): Promise<string>;
  load(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
}
```

Implementação FileStorage: salva em `uploads/` local.

---

### Fase 7.2: Document Service (Salvar/Carregar)

**Arquivo:** `src/services/document/documentService.ts`
**Risco:** médio

**Endpoints:**
- `POST /api/documents` — salvar documento (requer auth)
- `GET /api/documents` — listar documentos do usuário (requer auth)
- `GET /api/documents/[id]` — carregar documento
- `DELETE /api/documents/[id]` — deletar (requer auth)

**Regra de negócio:** salvar cria versão (mantém últimas 3).

---

### Fase 7.3: PDF Export

**Arquivo:** `src/services/pdf/pdfExporter.ts`
**Risco:** alto (formatação)

Instalar: `npm install pdf-lib`

**Comportamento:**
- Lê PDF original
- Aplica edits (substitui texto, adiciona novos blocos)
- Aplica highlights como anotações
- Retorna Buffer do PDF modificado

---

### Fase 8: Undo/Redo

**Arquivo:** Zustand store com middleware
**Risco:** baixo

Usar `zustand/middleware` temporal:
```typescript
import { temporal } from 'zundo';
```

Ou implementar manualmente com stack de estados. Limite: 50 passos.

---

### Fase 9.1: Toolbar

**Arquivo:** `src/components/editor/Toolbar.tsx`
**Risco:** baixo

Componentes: zoom in/out, undo/redo, botão de export, botão de salvar (se logado).

---

### Fase 9.2: Page Navigator

**Arquivo:** `src/components/editor/PageNavigator.tsx`
**Risco:** baixo

Sidebar com thumbnails das páginas. Clicar navega para a página.

---

### Fase 9.3: Loading States

**Risco:** baixo

- Upload: spinner
- OCR: barra de progresso por página
- Export: spinner com "Gerando PDF..."
- Erro: toast/message com retry

---

### Fase 10: Testes

**Arquivo:** `src/services/pdf/__tests__/pdfDetection.test.ts`, `src/services/ocr/__tests__/ocrService.test.ts`, etc.

**Testes obrigatórios (conforme spec):**
1. `pdfDetection.ts` — detecta PDF texto vs imagem com input conhecido
2. `ocrService.ts` — input imagem → output texto esperado
3. Export — editar texto e salvar não corrompe o PDF

**Verificação:**
```bash
npm test
# Esperado: todos passando
```

---

## Verificação Final

```bash
# Lint/type-check
npx next lint && npx tsc --noEmit

# Testes
npm test

# Build
npm run build

# Rodar
npm run dev
# Abrir http://localhost:3000
# Testar: upload → editar → export → verificar PDF
```

## Critérios de Pronto

- [ ] Docker Compose com PostgreSQL rodando
- [ ] Prisma migrations executadas
- [ ] NextAuth com Google funcionando
- [ ] Upload de PDF funciona (drag & drop + seletor)
- [ ] Detecção texto vs imagem correta
- [ ] OCR processa PDFs imagem e retorna texto com posição
- [ ] PDF renderiza no browser com zoom
- [ ] Texto editável sobreposto ao PDF
- [ ] Inserir novo bloco de texto funciona
- [ ] Highlights funcionam (amarelo + cores)
- [ ] Export gera PDF com mudanças aplicadas
- [ ] Sem login: edita e exporta normalmente
- [ ] Com login: salva, carrega, histórico funciona
- [ ] Undo/redo funciona
- [ ] Navegação entre páginas funciona
- [ ] Testes passando (cobertura >= 80%)
- [ ] Lint/type-check limpo
- [ ] Zero TODOs, placeholders ou stubs

## Desvios

- Bug pontual ou dependência faltante → auto-fix (max 3 tentativas)
- Conflito com decisão já tomada → PARAR e reportar
- Tarefa maior que o esperado → completar o possível, documentar o resto
- OCR muito lento → processar com web worker ou limitar páginas
- pdf-lib não suporta fonte → fallback para Helvetica, documentar limitação
