# Design: Editor de PDF

## Problema
Usuário precisa editar PDFs no browser — alterar textos, inserir novos, grifar trechos. PDF pode ser imagem escaneada (precisa de OCR) ou PDF com texto nativo. Prazo de 24h (hackathon).

## Decisões

| Decisão | Escolha | Por quê |
|---|---|---|
| Abordagem de edição | Híbrida — overlay + reescrita no export | Preview instantâneo via overlay; PDF reescrito só no download |
| Backend | API Routes Next.js + Prisma + PostgreSQL | Menos infra, tudo em um repo |
| Storage | Filesystem local com adapter | Simples para hackathon, abstração para trocar depois |
| Renderização | Híbrida — PDF.js no client, OCR no server | Client-side é rápido para render; OCR server-side não trava browser |
| Layout | Editor style | PDF centro, toolbar topo, páginas lateral — padrão de editores |
| ORM | Prisma | Type-safe, migrations automáticas |
| UI | styled-components 6 (template existente) | Já configurado, não perder tempo |
| Auth | NextAuth (Google provider) | Login opcional — sem login: edita e exporta. Com login: salva e tem histórico |

## Arquitetura

```
src/
  app/
    layout.tsx           ← ThemeProvider
    page.tsx             ← Redirect para /editor
    editor/
      page.tsx           ← Página principal do editor
      [documentId]/
        page.tsx         ← Editor de documento específico
    api/
      auth/
        [...nextauth]/
          route.ts       ← NextAuth (Google provider)
      upload/
        route.ts         ← POST: upload PDF
      documents/
        route.ts         ← GET: listar, POST: salvar (requer login)
        [id]/
          route.ts       ← GET/PUT/DELETE documento
          versions/
            route.ts     ← GET: histórico de versões (requer login)
      ocr/
        route.ts         ← POST: processar OCR
  components/
    editor/
      Toolbar.tsx        ← Zoom, undo/redo, navegação páginas
      PageViewer.tsx     ← Renderiza página PDF (PDF.js canvas)
      TextOverlay.tsx    ← Textos editáveis sobre o PDF
      HighlightLayer.tsx ← Grifos/destaques
      PageNavigator.tsx  ← Sidebar com thumbnails de páginas
      UploadZone.tsx     ← Drag & drop de PDF
    auth/
      LoginButton.tsx    ← Botão "Entrar com Google"
      UserMenu.tsx       ← Menu do usuário logado (logout, meus documentos)
    ui/
      ProgressIndicator.tsx
      ZoomControls.tsx
      Button.tsx
  services/
    pdf/
      pdfService.ts      ← Extrair texto, renderizar, exportar
      pdfDetection.ts    ← Detectar texto vs imagem
      pdfExporter.ts     ← Gerar PDF final com pdf-lib
    ocr/
      ocrService.ts      ← Chamar API de OCR
    storage/
      StorageAdapter.ts  ← Interface de storage
      FileStorage.ts     ← Implementação filesystem
    document/
      documentService.ts ← CRUD de documentos + versões
  lib/
    prisma.ts            ← Instância do Prisma
  types/
    editor.ts            ← Tipos do editor (TextBlock, Highlight, etc.)
    pdf.ts               ← Tipos de PDF (Page, Document, etc.)
```

## Comportamento

### Fluxo principal
1. Usuário acessa `/editor` (não precisa estar logado)
2. Se logado: vê lista de documentos salvos + opção de novo upload
3. Se não logado: vê tela de upload direto
4. Upload de PDF (drag & drop ou seletor)
5. Sistema detecta: tem texto nativo? → Extrai posições. Não tem? → Envia para OCR
6. PDF renderiza com overlay de textos editáveis
7. Usuário edita inline, insere texto, grifa trechos
8. **Sem login:** pode exportar o PDF editado, mas não pode salvar no servidor
9. **Com login:** pode salvar (persiste estado + versão) e carregar depois
10. Exporta (reescreve PDF com mudanças aplicadas)

### Autenticação
- NextAuth com Google provider
- Login opcional — o editor funciona sem login
- Sem login: upload, edição e export disponíveis. Sem salvar, sem histórico, sem lista de documentos.
- Com login: tudo acima + salvar, carregar, histórico de versões (últimas 3)
- Sessão persistente via JWT

### Detecção PDF-texto vs PDF-imagem
- Extrair texto com PDF.js (`getTextContent`)
- Se quantidade de texto > threshold mínimo → texto nativo
- Caso contrário → imagem escaneada, precisa de OCR

### Edição
- Clicar em texto existente → input inline
- Clicar em área vazia → inserir novo bloco de texto
- Selecionar texto → botão de highlight (amarelo default, cores opcionais)

### Histórico
- Cada salva cria nova versão
- Manter últimas 3 versões
- Usuário pode restaurar versão anterior

### Undo/Redo
- Zustand store com padrão de undo/redo
- Limite de 50 passos

## Interface

### Tela principal
```
┌─────────────────────────────────────────────────┐
│ [Upload] [Zoom-] [Zoom+] [Undo] [Redo] [Export] │  ← Toolbar
├───────┬─────────────────────────────────────────┤
│ Pág 1 │                                         │
│ Pág 2 │    [PDF renderizado com overlay]        │  ← PageViewer
│ Pág 3 │                                         │
│ ...   │                                         │
├───────┴─────────────────────────────────────────┤
│ Página 1 de 15                    [◄] [1] [►]  │  ← Navegação
└─────────────────────────────────────────────────┘
```

### Estados
- **Vazio:** tela de upload com drag & drop
- **Carregando PDF:** spinner
- **OCR em progresso:** barra de progresso por página
- **Editando:** PDF com textos editáveis sobrepostos
- **Exportando:** spinner
- **Erro:** mensagem clara + botão de retry

## Fora do Escopo
- Múltiplos usuários simultâneos
- Colaboração em tempo real
- PDFs criptografados com senha
- Edição de imagens dentro do PDF
- Assinatura digital
- Múltiplos providers de auth (apenas Google)

## Riscos Mitigados (do Pre-mortem)
1. **OCR lento:** processar por página, indicador de progresso, limitar upload a 20MB
2. **PDF quebrado no export:** embed fontes, fallback claro
3. **Browser travando:** lazy loading de páginas, virtual scroll se > 20 páginas
4. **Disco cheio:** cleanup de versões antigas, limite de tamanho

## Verificação
- Login com Google via NextAuth ✓
- Sem login: editor funciona, export disponível, sem salvar ✓
- Com login: salvar, carregar, histórico disponível ✓
- Upload PDF nativo → textos extraídos e editáveis ✓
- Upload PDF imagem → OCR processa e textos aparecem ✓
- Editar texto inline → persiste ao salvar ✓
- Inserir novo texto → aparece na posição correta ✓
- Grifar trecho → highlight visível ✓
- Salvar e recarregar → edições preservadas ✓
- Exportar → PDF com mudanças aplicadas ✓
- Undo/redo → funciona corretamente ✓
- Navegar páginas → rápido e responsivo ✓
