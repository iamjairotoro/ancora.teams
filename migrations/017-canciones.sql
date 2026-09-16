-- ============================================================
-- Fase 17 — Canciones: chart, transposición y arreglo por servicio
--
-- Trae el chart con acordes, notación en grados/romanos, y un override
-- de estructura por servicio (para que cambiar el arreglo un domingo
-- no afecte domingos ya pasados — el arreglo del servicio y el de la
-- canción son datos distintos).
--
-- No renombra ninguna columna de `songs`: la tabla ya tiene datos en
-- producción y nombres en español, consumidos hoy por SongsPanel,
-- AdminServiceView y EnsayoPanel. Solo se agregan las columnas que no
-- tienen equivalente. El resto se reusa (nombre→title, artista→artist,
-- tono_original→song_key, compas→meter, caratula_url→cover_url) desde
-- el componente nuevo (CancionesPanel), no desde la base.
--
-- `last_played_at` NO es una columna con trigger — se calcula al
-- consultar (service_blocks + services), para no repetir el riesgo de
-- trigger ya documentado en esta app.
--
-- Corré esto en "Ancora - TEST" primero, paso a paso, y después en la
-- base real.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — columnas nuevas en songs (aditivo, nullable)
-- ────────────────────────────────────────────────────────────

alter table songs
  add column if not exists original_title text,
  add column if not exists ccli text,
  add column if not exists copyright text,
  add column if not exists default_arrangement jsonb,
  add column if not exists archived_at timestamptz;

-- ── Verificación PASO 1 ──
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'songs'
  and column_name in ('original_title','ccli','copyright','default_arrangement','archived_at')
order by column_name;


-- ────────────────────────────────────────────────────────────
-- PASO 2 — chart: secciones y variantes por canción
-- ────────────────────────────────────────────────────────────

create table if not exists song_sections (
  id               uuid primary key default gen_random_uuid(),
  song_id          uuid not null references songs(id) on delete cascade,
  code             text not null,          -- "V1", "C", "P"
  name             text not null,          -- "Estrofa 1"
  performance_note text,
  sort_order       int  not null default 0
);
create index if not exists idx_song_sections_song on song_sections(song_id);

create table if not exists song_section_variants (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references song_sections(id) on delete cascade,
  label      text not null,                -- "Principal", "Alt. 1"
  lines      jsonb not null default '[]',  -- ChartLine[] del componente
  is_default boolean not null default false
);
create index if not exists idx_song_section_variants_section on song_section_variants(section_id);

-- ── Verificación PASO 2 ──
select count(*) from song_sections;
select count(*) from song_section_variants;


-- ────────────────────────────────────────────────────────────
-- PASO 3 — adjuntos por canción (partitura, pistas, etc.)
-- ────────────────────────────────────────────────────────────

create table if not exists song_attachments (
  id          uuid primary key default gen_random_uuid(),
  song_id     uuid not null references songs(id) on delete cascade,
  kind        text not null,
  url         text not null,
  filename    text,
  size        int,
  uploaded_by uuid references members(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_song_attachments_song on song_attachments(song_id);

-- ── Verificación PASO 3 ──
select count(*) from song_attachments;


-- ────────────────────────────────────────────────────────────
-- PASO 4 — override de estructura por servicio
--
-- Clave: service_item_id es el id de la fila de service_blocks (la
-- canción DENTRO de ese servicio puntual), no song_id. arrangement
-- null = usa el default_arrangement de la canción.
-- ────────────────────────────────────────────────────────────

create table if not exists service_song_arrangements (
  service_item_id uuid primary key references service_blocks(id) on delete cascade,
  arrangement     jsonb,
  updated_at      timestamptz not null default now()
);

-- ── Verificación PASO 4 ──
select count(*) from service_song_arrangements;


-- ────────────────────────────────────────────────────────────
-- PASO 5 — RLS: abierta, igual que songs ya es hoy. Canciones la edita
-- cualquier miembro autenticado (no es config de admin de organización
-- como checklist_templates, que sí usa is_org_admin).
--
-- song_favorites ya existe en producción (member_id, song_id) — no se
-- toca en esta migración.
-- ────────────────────────────────────────────────────────────

alter table song_sections enable row level security;
alter table song_section_variants enable row level security;
alter table song_attachments enable row level security;
alter table service_song_arrangements enable row level security;

create policy "abierta song_sections" on song_sections
  for all using (true) with check (true);

create policy "abierta song_section_variants" on song_section_variants
  for all using (true) with check (true);

create policy "abierta song_attachments" on song_attachments
  for all using (true) with check (true);

create policy "abierta service_song_arrangements" on service_song_arrangements
  for all using (true) with check (true);

-- ── Verificación PASO 5 ──
-- Debe listar 1 policy por tabla, las 4 tablas.
select tablename, policyname from pg_policies
where tablename in ('song_sections','song_section_variants','song_attachments','service_song_arrangements')
order by tablename;


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────
-- Nada existente cambia de comportamiento — las columnas nuevas de
-- songs quedan null en todas las filas, las tablas nuevas empiezan
-- vacías.

select 'songs con original_title' as tabla, count(*) from songs where original_title is not null
union all
select 'song_sections', count(*) from song_sections
union all
select 'song_section_variants', count(*) from song_section_variants
union all
select 'song_attachments', count(*) from song_attachments
union all
select 'service_song_arrangements', count(*) from service_song_arrangements;
