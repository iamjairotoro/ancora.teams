-- ============================================================
-- ANCORA SETLIST — Supabase Schema
-- Pega esto en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- Miembros del equipo
create table members (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null default '',
  email text not null unique,
  telefono text,
  instrumentos text[] not null default '{}',
  created_at timestamptz default now()
);

-- Base de datos de canciones
create table songs (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  artista text not null default '',
  tono_original text,
  link_spotify text,
  link_letras text,
  notas text,
  created_at timestamptz default now()
);

-- Servicios (cada domingo)
create table services (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  titulo text not null default 'Servicio Ancora',
  created_at timestamptz default now()
);

-- Setlist de cada servicio
create table setlist_items (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete cascade,
  orden int not null,
  song_id uuid references songs(id) on delete set null,
  tono text,
  lead_id uuid references members(id) on delete set null,
  link text,
  unique(service_id, orden)
);

-- Asignación de banda para cada servicio
create table banda_assignments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete cascade,
  posicion text not null,
  member_id uuid references members(id) on delete set null,
  unique(service_id, posicion)
);

-- Invitaciones / confirmaciones
create table invitations (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pendiente' check (status in ('pendiente','confirmado','declinado')),
  comentario text,
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz default now(),
  unique(service_id, member_id)
);

-- Habilitar acceso público (sin auth) — apropiado para app interna
alter table members enable row level security;
alter table songs enable row level security;
alter table services enable row level security;
alter table setlist_items enable row level security;
alter table banda_assignments enable row level security;
alter table invitations enable row level security;

create policy "public read members" on members for select using (true);
create policy "public write members" on members for all using (true);
create policy "public read songs" on songs for select using (true);
create policy "public write songs" on songs for all using (true);
create policy "public read services" on services for select using (true);
create policy "public write services" on services for all using (true);
create policy "public read setlist" on setlist_items for select using (true);
create policy "public write setlist" on setlist_items for all using (true);
create policy "public read banda" on banda_assignments for select using (true);
create policy "public write banda" on banda_assignments for all using (true);
create policy "public read invitations" on invitations for select using (true);
create policy "public write invitations" on invitations for all using (true);
