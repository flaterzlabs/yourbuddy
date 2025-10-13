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
- PostgreSQL 14+ rodando localmente (Docker funciona bem) / PostgreSQL 14+ running locally (Docker works fine)
- CLI `psql` disponível para aplicar as migrations / `psql` CLI available to run migrations

## Como rodar localmente / Run locally

### Backend API (Node.js + PostgreSQL)

1. Copie `server/.env.example` para `server/.env` e ajuste `DATABASE_URL`, `JWT_SECRET` e `PORT` se precisar / Copy `server/.env.example` to `server/.env` and adjust `DATABASE_URL`, `JWT_SECRET` and `PORT` if needed.
2. Garanta que o PostgreSQL esteja em execução (exemplo com Docker abaixo) / Ensure PostgreSQL is running (Docker example below).

```bash
docker run --name yourbuddy-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

3. Rode a migration inicial no banco apontado por `DATABASE_URL` / Run the initial migration on the database pointed by `DATABASE_URL`.

```bash
psql "$DATABASE_URL" -f server/sql/001_initial.sql
```

4. Instale as dependências do backend / Install backend dependencies.

```bash
npm install --prefix server
```

5. Inicie a API (porta padrão `4000`) / Start the API (default port `4000`).

```bash
npm run dev --prefix server
```

### Frontend web (Vite + React)

1. Instale as dependências do frontend / Install frontend dependencies.

```bash
npm install
```

2. Copie `.env.example` para `.env.local` (ou `.env`) e ajuste `VITE_API_BASE_URL=http://localhost:4000` conforme o ambiente / Copy `.env.example` to `.env.local` (or `.env`) and update `VITE_API_BASE_URL=http://localhost:4000` for your environment.
3. Inicie o app e acesse `http://localhost:5173` (Vite mostra a URL) / Start the app and open `http://localhost:5173` (Vite prints the URL).

```bash
npm run dev
```

Execute o backend e o frontend em terminais separados para acompanhar os logs / Keep backend and frontend running in separate terminals to watch the logs.

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

## Testes

Foram adicionados testes unitários de frontend com Vitest e Testing Library.

- Ambiente: `jsdom`
- Configuração: `vite.config.ts` (chave `test`) e `src/test/setup.ts`
- Exemplos:
  - `src/lib/utils.test.ts` — utilitário de classes
  - `src/pages/Welcome.test.tsx` — fluxo do botão “Get started”

Instalação (dependências de dev):

```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Comandos:

```bash
npm test             # roda os testes uma vez
npm run test:watch   # modo watch
npm run test:coverage # cobertura
```

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

### Frontend (`.env`, `.env.local`)

- `VITE_API_BASE_URL`: URL base da API Node (padrão `http://localhost:4000`). Ajuste conforme o ambiente (ex.: URL de produção).

O arquivo `.env.local` incluído no repositório aponta para a API local; personalize se necessário. Em produção, defina as variáveis no provedor de hosting (ex.: Vercel, Netlify).

### Backend (`server/.env`)

- `NODE_ENV`: ambiente (`development`, `production` etc.)
- `PORT`: porta onde a API escuta (padrão `4000`)
- `CORS_ORIGINS`: lista de origens permitidas separadas por vírgula
- `DATABASE_URL`: string de conexão PostgreSQL (ex.: `postgres://user:pass@localhost:5432/yourbuddy`)
- `JWT_SECRET`: chave secreta usada para assinar tokens JWT
- `JWT_EXPIRES_IN`: tempo de expiração dos tokens (ex.: `24h`)

Use `server/.env.example` como referência e mantenha os valores sensíveis fora do controle de versão em ambientes de produção ou CI/CD.

## Deploy

O repositório inclui um workflow GitHub Actions para GitHub Pages em `.github/workflows/deploy-pages.yml`:

- Build com Node 20 e cache de `npm`
- Detecta `BASE_PATH` automaticamente conforme o nome do repositório
- Publica o conteúdo de `dist/`

Para publicar:

1. Confirme que o projeto builda localmente: `npm run build`
2. Faça push na branch `main`
3. Verifique a aba "Actions" e a página do GitHub Pages do repositório


lembrar de tentar adicionar um x na escolha de avatar. 
