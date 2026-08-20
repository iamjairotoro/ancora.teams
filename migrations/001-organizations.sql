-- ============================================================
-- Fase 1 — expansión multi-equipo: capa de organizations
-- Puramente aditiva: nada existente se borra ni se modifica en su
-- comportamiento actual. NO toca RLS — eso es una fase aparte, al final.
--
-- Corré esto PRIMERO en "Ancora - TEST" (Project Settings → SQL Editor).
-- Recién cuando lo confirmes ahí, se corre igual en producción.
--
-- Está dividido en pasos separados por comentarios "PASO N", con una
-- consulta de verificación después de cada uno — corré paso a paso y
-- confirmá el resultado antes de seguir al siguiente, no pegues todo el
-- archivo de una vez la primera vez que lo pruebes.
--
-- A partir de esta migración, el esquema vive acá (migrations/NNN-*.sql),
-- no en supabase-schema-vN.sql sueltos — esos quedan como archivo histórico,
-- no se tocan ni se les agrega nada nuevo.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — Tabla organizations + organización #1
-- ────────────────────────────────────────────────────────────
-- Mínima a propósito: nombre, slug y created_at. La marca (logo, colores,
-- dominio propio, etc.) se desacopla en una fase posterior — no hace falta
-- anticiparla acá. Sí quedó pensado para el futuro:
--   - slug: para poder rutear por organización más adelante (ej. URLs o
--     subdominios), aunque hoy no se use todavía en ningún lado del código.
-- Si en el futuro cada organización necesita su propia zona horaria (varias
-- iglesias en países distintos), sería el momento de agregar una columna
-- `timezone` — no la agrego ahora porque no hace falta con una sola.

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  created_at timestamptz default now()
);

-- Organización #1 — id fijo y conocido a propósito (no gen_random_uuid()),
-- para que sea el mismo valor exacto en la base de prueba y en producción.
-- No es un secreto, así que un UUID "legible" (todo ceros salvo el último
-- dígito) es preferible a uno random: se reconoce a simple vista en
-- cualquier query o log como "el singleton conocido".
insert into organizations (id, nombre, slug)
values ('00000000-0000-0000-0000-000000000001', 'Áncora', 'ancora')
on conflict (id) do nothing;

-- ── Verificación PASO 1 ──
-- Debe devolver exactamente 1 fila, con el id de arriba.
select * from organizations;


-- ────────────────────────────────────────────────────────────
-- PASO 2 — organization_id en members (nullable primero)
-- ────────────────────────────────────────────────────────────

alter table members add column if not exists organization_id uuid references organizations(id);

-- Default a la organización #1: sin esto, cualquier INSERT del código actual
-- (que todavía no conoce organization_id) rompe contra el NOT NULL del
-- PASO 4. Con el default, un insert que no menciona la columna la rellena
-- solo — verificado en la base de prueba.
alter table members alter column organization_id set default '00000000-0000-0000-0000-000000000001';

-- ── Verificación PASO 2 ──
-- Debe devolver el total de members (todos con organization_id en null todavía).
select count(*) as total, count(organization_id) as con_org from members;


-- ────────────────────────────────────────────────────────────
-- PASO 3 — backfill de members
-- ────────────────────────────────────────────────────────────

update members set organization_id = '00000000-0000-0000-0000-000000000001'
where organization_id is null;

-- ── Verificación PASO 3 ──
-- Debe devolver 0.
select count(*) from members where organization_id is null;


-- ────────────────────────────────────────────────────────────
-- PASO 4 — members.organization_id → NOT NULL + índice
-- ────────────────────────────────────────────────────────────
-- Si el PASO 3 no dejó 0 nulls, este ALTER falla solo — es la propia
-- verificación de que el backfill quedó completo.

alter table members alter column organization_id set not null;
create index if not exists idx_members_organization_id on members(organization_id);

-- ── Verificación PASO 4 ──
-- is_nullable debe decir 'NO'.
select column_name, is_nullable from information_schema.columns
where table_name = 'members' and column_name = 'organization_id';


-- ────────────────────────────────────────────────────────────
-- PASO 5 — organization_id en services (nullable primero)
-- ────────────────────────────────────────────────────────────

alter table services add column if not exists organization_id uuid references organizations(id);

-- Default a la organización #1 — mismo motivo que en members (PASO 2).
alter table services alter column organization_id set default '00000000-0000-0000-0000-000000000001';

-- ── Verificación PASO 5 ──
select count(*) as total, count(organization_id) as con_org from services;


-- ────────────────────────────────────────────────────────────
-- PASO 6 — backfill de services
-- ────────────────────────────────────────────────────────────

update services set organization_id = '00000000-0000-0000-0000-000000000001'
where organization_id is null;

-- ── Verificación PASO 6 ──
-- Debe devolver 0.
select count(*) from services where organization_id is null;


-- ────────────────────────────────────────────────────────────
-- PASO 7 — services.organization_id → NOT NULL + índice
-- ────────────────────────────────────────────────────────────

alter table services alter column organization_id set not null;
create index if not exists idx_services_organization_id on services(organization_id);

-- ── Verificación PASO 7 ──
select column_name, is_nullable from information_schema.columns
where table_name = 'services' and column_name = 'organization_id';


-- ────────────────────────────────────────────────────────────
-- PASO 8 — organization_id en songs (nullable primero)
-- ────────────────────────────────────────────────────────────

alter table songs add column if not exists organization_id uuid references organizations(id);

-- Default a la organización #1 — mismo motivo que en members (PASO 2).
alter table songs alter column organization_id set default '00000000-0000-0000-0000-000000000001';

-- ── Verificación PASO 8 ──
select count(*) as total, count(organization_id) as con_org from songs;


-- ────────────────────────────────────────────────────────────
-- PASO 9 — backfill de songs
-- ────────────────────────────────────────────────────────────

update songs set organization_id = '00000000-0000-0000-0000-000000000001'
where organization_id is null;

-- ── Verificación PASO 9 ──
-- Debe devolver 0.
select count(*) from songs where organization_id is null;


-- ────────────────────────────────────────────────────────────
-- PASO 10 — songs.organization_id → NOT NULL + índice
-- ────────────────────────────────────────────────────────────

alter table songs alter column organization_id set not null;
create index if not exists idx_songs_organization_id on songs(organization_id);

-- ── Verificación PASO 10 ──
select column_name, is_nullable from information_schema.columns
where table_name = 'songs' and column_name = 'organization_id';


-- ────────────────────────────────────────────────────────────
-- PASO 11 — organization_id en admin_emails (nullable primero)
-- ────────────────────────────────────────────────────────────
-- admin_emails no tiene ninguna FK a members/services/songs (es solo
-- email text primary key) — por eso es la única de las 4 que necesita
-- organization_id directo sin alternativa transitiva.

alter table admin_emails add column if not exists organization_id uuid references organizations(id);

-- Default a la organización #1 — mismo motivo que en members (PASO 2).
alter table admin_emails alter column organization_id set default '00000000-0000-0000-0000-000000000001';

-- ── Verificación PASO 11 ──
select count(*) as total, count(organization_id) as con_org from admin_emails;


-- ────────────────────────────────────────────────────────────
-- PASO 12 — backfill de admin_emails
-- ────────────────────────────────────────────────────────────

update admin_emails set organization_id = '00000000-0000-0000-0000-000000000001'
where organization_id is null;

-- ── Verificación PASO 12 ──
-- Debe devolver 0.
select count(*) from admin_emails where organization_id is null;


-- ────────────────────────────────────────────────────────────
-- PASO 13 — admin_emails.organization_id → NOT NULL + índice
-- ────────────────────────────────────────────────────────────

alter table admin_emails alter column organization_id set not null;
create index if not exists idx_admin_emails_organization_id on admin_emails(organization_id);

-- ── Verificación PASO 13 ──
select column_name, is_nullable from information_schema.columns
where table_name = 'admin_emails' and column_name = 'organization_id';


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL — las 4 tablas juntas, 0 nulls en las 4
-- ────────────────────────────────────────────────────────────

select 'members' as tabla, count(*) filter (where organization_id is null) as nulls from members
union all
select 'services', count(*) filter (where organization_id is null) from services
union all
select 'songs', count(*) filter (where organization_id is null) from songs
union all
select 'admin_emails', count(*) filter (where organization_id is null) from admin_emails;

-- Todo en 0 → Fase 1 completa. El resto de las tablas (setlist_items,
-- banda_assignments, invitations, service_blocks, availability, date_blocks,
-- push_subscriptions, song_favorites, messages, chat_presence) queda sin
-- tocar — heredan la organización transitivamente vía service_id o member_id,
-- ambos siempre NOT NULL o, donde son nullable en el esquema, verificados
-- sin ningún null real en el backup de producción.
--
-- Todavía NO hay RLS por organización — todas las políticas siguen siendo
-- "using (true)" como hasta ahora. Eso es la última fase de la expansión,
-- después de que el resto (invitaciones cross-org, UI de selección de
-- organización, etc.) esté probado.
