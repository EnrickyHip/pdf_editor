# Desafio 1: Editor de PDF

## Projeto

Editor de PDF no browser. O usuário faz upload de um PDF (que pode ser imagem escaneada ou PDF com texto nativo). O sistema detecta qual caso é, aplica OCR quando necessário, e permite editar o conteúdo diretamente -- reescrever textos existentes, inserir novos textos, grifar trechos. Salvar o resultado como PDF preservando a formatação ao máximo.

## Stack

- **Frontend:** React + TypeScript + biblioteca de UI (livre -- decisão do dev, mas obrigatório usar uma)
- **Backend:** NodeJS, framework Next.js com api interna + PostgreSQL
- **Bibliotecas-chave:** PDF.js (renderização), Tesseract.js (OCR), pdf-lib ou jsPDF (geração)

## Features

### Core

- Upload de PDF (arrastar ou selecionar)
- Detectar se o PDF tem texto extraível ou se é imagem escaneada
- Permitir login com NextAuth, usuário poderá atualizar PDFs sem login, mas o armazenamento e histórico somente se tiver login.
- Se imagem: aplicar OCR e extrair texto com posicionamento
- Renderizar PDF com texto editável sobreposto
- Editar texto existente inline (clicar no texto, alterar)
- Inserir novo bloco de texto em posição livre
- Grifar/destacar trechos de texto (highlight amarelo, cores opcionais)
- Salvar PDF editado mantendo formatação original
- Navegar entre páginas

### Backend

- Upload e armazenamento de PDFs originais
- Salvar estado de edição (textos alterados, grifos, posições)
- Carregar documento salvo para continuar editando
- Histórico de versões (pelo menos 3 últimas)
- API REST: upload, save, load, list, version history

### UX

- Indicador de progresso durante OCR (é lento)
- Zoom in/out no documento
- Undo/redo das edições

## Conceitos Obrigatórios

### Processo

- CLAUDE.md configurado no projeto antes de codar
- Plano escrito antes de implementar
- Conventional Commits em pt-BR
- Git workflow limpo (branch, commits atômicos)

### Arquitetura

- Código organizado por domínio (não por tipo)
- Lógica de negócio separada de UI (ex: serviço de OCR, serviço de PDF, não tudo no componente)
- Pelo menos 1 adapter (ex: storage adapter que abstrai onde o PDF é salvo)
- Backend com separação clara: rotas, controllers, serviços

### Frontend

- Responsivo (funcionar em tela grande e tablet)
- Componentes reutilizáveis (toolbar, page viewer, text overlay são componentes separados)
- Zero style inline -- CSS externo ou Tailwind
- Design consistente

### Testes

- Testes unitários para a lógica de detecção PDF-texto vs PDF-imagem
- Testes para o serviço de OCR (input conhecida → output esperado)
- Teste de regressão: editar texto e salvar não corrompe o PDF
