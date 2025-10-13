create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('student','caregiver','educator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  username text not null unique,
  caregiver_code text unique,
  student_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists connections (
  id uuid primary key default uuid_generate_v4(),
  caregiver_id uuid not null references users(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (caregiver_id, student_id)
);

create table if not exists help_requests (
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

create table if not exists thrive_sprites (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references users(id) on delete cascade,
  image_url text not null,
  options jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id)
);

create table if not exists password_resets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz
);

create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
before update on users
for each row execute function touch_updated_at();

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
before update on profiles
for each row execute function touch_updated_at();

drop trigger if exists trg_connections_updated_at on connections;
create trigger trg_connections_updated_at
before update on connections
for each row execute function touch_updated_at();

drop trigger if exists trg_help_requests_updated_at on help_requests;
create trigger trg_help_requests_updated_at
before update on help_requests
for each row execute function touch_updated_at();

drop trigger if exists trg_thrive_sprites_updated_at on thrive_sprites;
create trigger trg_thrive_sprites_updated_at
before update on thrive_sprites
for each row execute function touch_updated_at();
