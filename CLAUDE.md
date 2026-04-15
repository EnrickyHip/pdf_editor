# PDF Editor -- CLAUDE.md

## Projeto

- **Nome:** PDF Editor
- **Propósito:** Editor de PDF no browser com OCR, edição inline e exportação
- **Stack:** Next.js 15 (App Router), React 19, TypeScript 5.8, styled-components 6, PostgreSQL 17, Prisma, NextAuth

## Comandos

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Rodar testes
npm test

# Testes em watch
npm run test-watch

# Testes com cobertura
npm run test-coverage

# Build de produção
npm run build

# Lint
npm run lint

# Formatação
npm run format

# Banco (Prisma)
npm run db:generate    # gerar client
npm run db:migrate     # criar migrations
npm run db:push        # push schema (sem migration)
npm run db:studio      # abrir Prisma Studio

# Docker
docker compose up -d   # iniciar PostgreSQL
docker compose down    # parar PostgreSQL
```

## Estrutura de Diretórios

```
pdf_editor/
├── prisma/                -- Schema Prisma + migrations
├── uploads/               -- PDFs armazenados (gitignored)
├── docs/                  -- Design e plano de implementação
├── src/
│   ├── app/
│   │   ├── api/           -- API Routes
│   │   │   ├── auth/      -- NextAuth (Google)
│   │   │   ├── upload/    -- Upload de PDF
│   │   │   ├── documents/ -- CRUD de documentos
│   │   │   └── ocr/       -- Processamento OCR
│   │   └── editor/        -- Páginas do editor
│   ├── components/
│   │   ├── editor/        -- Componentes do editor
│   │   ├── auth/          -- Login, UserMenu
│   │   └── ui/            -- Componentes genéricos
│   ├── services/
│   │   ├── pdf/           -- Detecção, export, manipulação
│   │   ├── ocr/           -- Serviço OCR
│   │   ├── storage/       -- Adapter de storage
│   │   └── document/      -- CRUD de documentos
│   ├── stores/            -- Zustand stores
│   ├── styles/            -- styled-components (theme, global)
│   ├── lib/               -- Prisma client, utils
│   └── types/             -- Tipos TypeScript
└── .jest/                 -- Setup dos testes
```

## Convenções

- **Idioma do código:** en para nomes, pt-BR para strings/UI
- **Formatação:** Prettier (singleQuote, semi, trailingComma all, tabWidth 2)
- **Imports:** absolutos com `@/` prefix
- **Componentes:** PascalCase para arquivos e nomes
- **Serviços:** camelCase para funções, organizados por domínio
- **Styled-components:** tema em `src/styles/theme.ts`, tipos em `styled.d.ts`
- **Erros:** throw Error com mensagem descritiva em pt-BR

## Decisões de Arquitetura

- **Híbrida (overlay + reescrita):** preview via overlay, PDF reescrito apenas no export. Evita corromper PDF original.
- **API Routes (não backend separado):** menos infra para 24h. Tudo em um repo.
- **Filesystem local com adapter:** abstração permite trocar para S3 depois.
- **PDF.js client-side + OCR server-side:** renderização rápida no browser, OCR não trava com PDFs grandes.
- **NextAuth (Google):** login opcional. Sem login = edita e exporta. Com login = salva e tem histórico.

## Regras de Negócio

- **Upload:** máximo 20MB por PDF
- **OCR:** processado por página com progresso
- **Histórico:** mantém últimas 3 versões por documento
- **Undo/Redo:** limite de 50 passos
- **Auth:** salvar/carregar/histórico requerem login. Editar e exportar não.

## Limites (Boundaries)

**Sempre:**

- Reutilizar código existente (pesquisar antes de criar)
- Rodar testes após mudanças
- Tratar erros explicitamente (nunca catch vazio)
- Validar inputs em boundaries
- Commits atômicos com Conventional Commits em pt-BR

**Perguntar antes:**

- Adicionar dependência externa nova
- Mudar arquitetura ou padrão estabelecido
- Modificar schema Prisma
- Criar abstrações novas

**Nunca:**

- Hardcodar secrets ou credenciais
- Commitar sem testes passando
- Ignorar erros silenciosamente
- Modificar código fora do escopo
- Pular hooks com `--no-verify`
- Utilizar "any" na tipagem.
- Evitar usar type casts "as" tanto quanto possível, a não ser que seja realmente necessário.

## Segurança

- Secrets via variáveis de ambiente (`NEXTAUTH_SECRET`, `DATABASE_URL`)
- PDFs em `uploads/` — gitignored, nunca no repositório
- Auth verificada em rotas que salvam/carregam documentos
- Upload validado: tipo PDF, tamanho máximo 20MB

## Definição de Pronto

- [ ] Testes passando (cobertura >= 80%)
- [ ] Sem warnings de lint/type-check
- [ ] Checklist SPECS verificado
- [ ] Lint: `npm run lint`
- [ ] Type-check: `npx tsc --noEmit`
- [ ] Testes: `npm test`
