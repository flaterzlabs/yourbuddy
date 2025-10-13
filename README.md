# YourBuddy

Aplicação web voltada para estudantes, responsáveis e educadores, com dashboards, seleção de avatar e integração a um backend Node.js.

## Pré-requisitos

- Node.js 18+ e npm
- PostgreSQL 14+ em execução (Docker funciona bem)
- CLI `psql` para aplicar as migrations

## Backend

1. Copie `server/.env.example` para `server/.env` e configure `DATABASE_URL`, `JWT_SECRET` e, se necessário, `PORT`.
2. Instale as dependências: `npm install --prefix server`.
3. Aplique a migration inicial: `psql "$DATABASE_URL" -f server/sql/001_initial.sql`.
4. Inicie a API: `npm run dev --prefix server` (porta padrão `4000`).
5. Acesse a documentação Swagger em `http://localhost:4000/docs` e o JSON em `http://localhost:4000/docs.json`.

## Frontend

1. Copie `.env.example` para `.env.local` (ou `.env`) e ajuste `VITE_API_BASE_URL` para apontar ao backend.
2. Instale as dependências: `npm install`.
3. Rode em modo desenvolvimento: `npm run dev` (Vite imprime a URL, normalmente `http://localhost:5173`).

## Scripts úteis

- `npm run dev`: servidor de desenvolvimento do frontend.
- `npm run build`: build de produção (`dist/`).
- `npm run preview`: serve a build localmente.
- `npm test`: executa os testes de frontend.
