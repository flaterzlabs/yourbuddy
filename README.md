# YourBuddy

Aplicação web em React focada em acompanhar estudantes, responsáveis e educadores, com autenticação, seleção de avatar e dashboards dedicados. O projeto usa Vite + TypeScript, Tailwind  para uma UI consistente e acessível.

## Tecnologias

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui (Radix UI)
- React Router
- TanStack React Query
- Supabase (auth e dados)
- date-fns, Recharts, Sonner (toasts), next-themes
- ESLint + Prettier

## Pré-requisitos

- Node.js 18+ (CI usa Node 20)
- npm (ou outro gerenciador compatível)

## Como rodar localmente

```bash
# 1) Instalar dependências
npm install

# 2) (Opcional) Configurar variáveis de ambiente
# Edite o arquivo .env se necessário (veja seção "Variáveis de ambiente")

# 3) Rodar em modo desenvolvimento
npm run dev

# 4) Acessar no navegador (Vite mostra a URL, tipicamente http://localhost:5173)
```

### Build de produção

```bash
# Gerar build
npm run build

# Servir a build localmente para teste
npm run preview
```

## Scripts úteis

- `npm run dev`: inicia o servidor de desenvolvimento (Vite)
- `npm run build`: gera a build de produção em `dist/`
- `npm run preview`: serve a pasta `dist/` para verificação local
- `npm run lint`: roda o ESLint
- `npm run format`: formata o projeto com Prettier
- `npm run format:check`: verifica formatação sem alterar arquivos

## Variáveis de ambiente

Este projeto usa Vite; variáveis expostas ao cliente devem começar com `VITE_`.

Arquivo de exemplo: `.env` (já presente). Principais chaves:

- `VITE_SUPABASE_URL`: URL do projeto Supabase
- `VITE_SUPABASE_PROJECT_ID`: ID do projeto Supabase
- `VITE_SUPABASE_PUBLISHABLE_KEY`: chave pública (client-side)

Você pode editar `.env` diretamente para desenvolvimento. Para produção (CI/CD), configure os segredos no provedor (ex.: GitHub Actions).

## Deploy

O repositório inclui um workflow GitHub Actions para GitHub Pages em `.github/workflows/deploy-pages.yml`:

- Build com Node 20 e cache de `npm`
- Detecta `BASE_PATH` automaticamente conforme o nome do repositório
- Publica o conteúdo de `dist/`

Para publicar:

1. Confirme que o projeto builda localmente: `npm run build`
2. Faça push na branch `main`
3. Verifique a aba "Actions" e a página do GitHub Pages do repositório

