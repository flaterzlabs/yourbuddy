# YourBuddy / SeuBuddy

EN: A React web app to support students, caregivers, and educators, with authentication, avatar selection, and dedicated dashboards. Built with Vite + TypeScript, Tailwind, and shadcn/ui (Radix UI) for a consistent, accessible UI.

PT: Aplicação web em React para acompanhar estudantes, responsáveis e educadores, com autenticação, seleção de avatar e dashboards dedicados. Construída com Vite + TypeScript, Tailwind e shadcn/ui (Radix UI) para uma UI consistente e acessível.

## Tecnologias / Tech Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui (Radix UI)
- React Router
- TanStack React Query
- Supabase (auth & data)
- date-fns, Recharts, Sonner (toasts), next-themes
- ESLint + Prettier
- i18n: i18next + react-i18next

## Pré-requisitos / Prerequisites

- Node.js 18+ (CI uses Node 20)
- npm (or another compatible package manager)

## Como rodar localmente / Run locally

```bash
# 1) Instalar dependências / Install deps
npm install

# 2) (Opcional) Configurar variáveis de ambiente / Configure .env
# Edite o arquivo .env se necessário (veja seção "Variáveis de ambiente")

# 3) Rodar em modo desenvolvimento / Start dev
npm run dev

# 4) Acessar no navegador / Open in browser
# Vite mostra a URL (tipicamente http://localhost:5173)
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

## Internacionalização / Internationalization (i18n)

- Idiomas disponíveis / Available languages: Português (`pt`) e English (`en`).
- Alternar idioma / Switch language: use o botão `PT/EN` no topo da UI.
- Arquivos de tradução / Translation files:
  - `src/locales/pt/common.json`
  - `src/locales/en/common.json`
- Configuração / Setup: `src/i18n.ts` (i18next + react-i18next + language detector).

Adicionar novas chaves / Add new keys:

1. Adicione a chave em ambos os arquivos `common.json` (pt/en).
2. Use no código com `useTranslation` e `t('path.to.key')`.
3. Exemplo:

```tsx
import { useTranslation } from 'react-i18next';

const Example = () => {
  const { t } = useTranslation();
  return <span>{t('welcome.title')}</span>;
};
```

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
