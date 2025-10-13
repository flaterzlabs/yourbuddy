# Backend simplificado com Node.js + PostgreSQL

## 1. Escopo minimo necessario

- **Autenticacao**  
  - Registro (`email`, `senha`, `role`, `username`).  
  - Login usando e-mail ou username.  
  - Atualizacao de senha via token de recuperacao.  
  - Sessao baseada em JWT (header `Authorization: Bearer <token>`).

- **Perfis e avatares**  
  - Tabela `profiles` (mesma estrutura do Supabase).  
  - Tabela `thrive_sprites` (1-1 com estudante).

- **Conexoes**  
  - Geracao de `student_code` / `caregiver_code`.  
  - Fluxos `create_connection_by_code` e `create_student_connection_by_caregiver_code`.  
  - Consulta de conexoes e perfis vinculados.

- **Pedidos de ajuda (`help_requests`)**  
  - CRUD basico.  
  - Atualizacao de status (`open`, `answered`, `closed`).  
  - Registro de qual cuidador respondeu (`resolved_by`).

- **Realtime / notificacoes**  
  - Broadcast para cuidadores quando um estudante abre pedido.  
  - Notificacao para alunos quando o status muda.  
  - Implementado via WebSocket (Socket.IO) com salas pre-definidas.

## 2. Estrutura sugerida

```
server/
  package.json
  tsconfig.json
  src/
    app.ts
    index.ts
    config/env.ts
    db/pool.ts
    middleware/auth.ts
    modules/
      auth/
        controller.ts
        service.ts
        routes.ts
      profiles/
        controller.ts
        service.ts
        routes.ts
      connections/
        controller.ts
        service.ts
        routes.ts
      help-requests/
        controller.ts
        service.ts
        routes.ts
        socket.ts
      thrive-sprites/
        controller.ts
        service.ts
        routes.ts
  sql/
    001_initial.sql
```

### Dependencias

```
"dependencies": {
  "express": "^4.21.0",
  "cors": "^2.8.5",
  "pg": "^8.11.5",
  "dotenv": "^16.4.5",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "socket.io": "^4.7.5",
  "zod": "^3.23.8"
},
"devDependencies": {
  "@types/express": "^4.17.21",
  "@types/jsonwebtoken": "^9.0.6",
  "@types/cors": "^2.8.17",
  "@types/node": "^22.10.2",
  "ts-node": "^10.9.2",
  "typescript": "^5.8.3"
}
```

## 3. Modelagem do banco

```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('student','caregiver','educator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  username text not null unique,
  caregiver_code text unique,
  student_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table connections (
  id uuid primary key default uuid_generate_v4(),
  caregiver_id uuid not null references users(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (caregiver_id, student_id)
);

create table help_requests (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references users(id) on delete cascade,
  message text,
  urgency text check (urgency in ('ok','attention','urgent')),
  status text not null default 'open' check (status in ('open','answered','closed')),
  resolved_by uuid references users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table thrive_sprites (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references users(id) on delete cascade,
  image_url text not null,
  options jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id)
);

create table password_resets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz
);
```

### Gatilhos utilitarios

```sql
create function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
before update on users
for each row execute procedure touch_updated_at();

create trigger profiles_updated_at
before update on profiles
for each row execute procedure touch_updated_at();
-- repetir para as demais tabelas
```

## 4. Rotas principais

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `POST` | `/auth/signup` | Cria usuario + profile (gera codigos quando necessario) |
| `POST` | `/auth/login` | Aceita `{ identifier, password }` e devolve JWT + profile |
| `POST` | `/auth/logout` | Opcional (frontend apenas descarta token) |
| `POST` | `/auth/password/reset-request` | Gera token e envia e-mail (ou retorna token em dev) |
| `POST` | `/auth/password/reset` | Valida token e atualiza senha |
| `GET` | `/auth/me` | Retorna `{ user, profile, thriveSprite }` |
| `GET` | `/profiles/me` | Retorna profile com sprite |
| `PATCH` | `/profiles/me` | Atualiza username/avatar |
| `POST` | `/connections/by-student-code` | Fluxo do `create_connection_by_code` |
| `POST` | `/connections/by-caregiver-code` | Fluxo inverso para estudantes |
| `GET` | `/connections` | Lista conexoes ativas com dados dos perfis |
| `GET` | `/help-requests` | Filtra por role (estudante: proprios pedidos, cuidador: alunos conectados) |
| `POST` | `/help-requests` | Cria pedido e emite evento `help_request:new` |
| `PATCH` | `/help-requests/:id` | Atualiza status + emite `help_request:updated` |
| `GET` | `/thrive-sprites/me` | Busca sprite do estudante |
| `PUT` | `/thrive-sprites/me` | Upsert |

## 5. Integracao com Socket.IO

- Ao autenticar, o frontend conecta a `wss://.../realtime` com o token JWT.  
- O servidor valida o token e adiciona o socket às salas:
  - Sempre: `user:{userId}`
  - Se role = `caregiver`: `caregiver:{userId}`
  - Se role = `student`: `student:{userId}`, `broadcast:help_requests`
- Eventos emitidos:
  - `help_request:new` para `caregiver:{caregiverId}` e `broadcast:help_requests`
  - `help_request:updated` para `student:{studentId}`
  - `connection:created` para `caregiver:{caregiverId}` e `student:{studentId}`

O frontend pode criar um adaptador leve que exponha um objeto com interface parecida com `supabase.channel()`, mas usando `socket.io-client`.

## 6. Adaptacoes no frontend

- **Cliente HTTP**  
  - Criar `src/integrations/api/client.ts` usando `fetch` ou biblioteca similar.  
  - Centralizar `Authorization` com token JWT guardado no armazenamento local.

- **Hook `useAuth`**  
  - Trocar chamadas Supabase por endpoints REST.  
  - Manter no estado `{ token, user, profile, thriveSprite }`.  
  - Revalidar com `/auth/me` sempre que a pagina carrega.

- **Queries de dados**  
  - Substituir `.from(...).select/insert/update` por `apiClient`.  
  - Usar React Query para cache e revalidate.

- **Realtime**  
  - Criar `useRealtimeEvents` que registra listeners Socket.IO conforme role.  
  - Atualizar dashboards para consumir eventos `help_request:new` e `help_request:updated`.

## 7. Passo-a-passo de migracao

- **Configurar banco**  
  - Subir PostgreSQL local (Docker Compose ou similar).  
  - Rodar `sql/001_initial.sql`.  
  - Criar seeds basicos se necessario.

- **Backend**  
  - `cd server && npm install`.  
  - Criar `.env` com `DATABASE_URL`, `JWT_SECRET`, `PORT`.  
  - `npm run dev` (usando `ts-node-dev` ou `tsx`).

- **Frontend**  
  - Definir `VITE_API_BASE_URL`.  
  - Implementar cliente HTTP e substituir integrações.  
  - Testar fluxos principais: cadastro, login, dashboards, pedidos de ajuda.

- **Desligar Supabase**  
  - Remover `@supabase/supabase-js` e arquivos de integracao antigos.  
  - Ajustar `.env` e README.

## 8. Proximos passos opcionais

- Adicionar testes de integracao (supertest) cobrindo rotas criticas.  
- Configurar Husky/lint-staged para formatacao padrao.  
- Implementar fila de e-mail (password reset) com nodemailer.  
- Monitorar websockets (heartbeat, reconexao, backoff).
