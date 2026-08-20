-- Tabla chica para saber, en cualquier momento, qué chat está viendo cada
-- persona ahora mismo — así el servidor puede saltarse su notificación push
-- si ya está mirando esa conversación en vivo (evita el "doble aviso").
--
-- Cómo correrlo: Supabase → tu proyecto → SQL Editor → pegar y ejecutar todo.

create table if not exists chat_presence (
  member_id uuid primary key references members(id) on delete cascade,
  chat_id text,
  updated_at timestamptz default now()
);

alter table chat_presence enable row level security;

drop policy if exists "public read chat_presence" on chat_presence;
create policy "public read chat_presence" on chat_presence for select using (true);

drop policy if exists "public write chat_presence" on chat_presence;
create policy "public write chat_presence" on chat_presence for all using (true);
