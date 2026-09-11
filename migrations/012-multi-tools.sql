-- ============================================================
-- Fase 12 — varias herramientas por equipo, simultáneas
--
-- teams.tool_type (fase 11) era una sola herramienta por equipo. Ahora
-- cualquier equipo puede tener varias a la vez (Setlist + Checklist +
-- Cronograma + Texto libre, todas visibles juntas en su pestaña de
-- Servicio) — se reemplaza por una tabla team_tools (una fila por
-- herramienta activada). Se agregan además las 2 herramientas nuevas:
-- Cronograma (horario editable) y Texto libre.
--
-- 100% aditivo — no se borra tool_type (queda sin uso, dato ya
-- migrado a team_tools) ni ninguna tabla existente.
--
-- Corré esto en "Ancora - TEST" primero, paso a paso, y después en la
-- base real.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — team_tools (qué herramientas tiene activas cada equipo)
-- ────────────────────────────────────────────────────────────

create table if not exists team_tools (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams(id) on delete cascade,
  tool_type  text not null check (tool_type in ('setlist','checklist','schedule','notes','file_upload')),
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  unique(team_id, tool_type)
);
create index if not exists idx_team_tools_team on team_tools(team_id);

-- ── Verificación PASO 1 ──
select count(*) from team_tools;


-- ────────────────────────────────────────────────────────────
-- PASO 2 — migrar teams.tool_type (fase 11) a team_tools
-- ────────────────────────────────────────────────────────────

insert into team_tools (team_id, tool_type)
select id, tool_type from teams where tool_type is not null
on conflict (team_id, tool_type) do nothing;

-- ── Verificación PASO 2 ──
-- Debe coincidir con la cantidad de equipos que ya tenían tool_type asignado.
select
  (select count(*) from teams where tool_type is not null) as teams_con_tool_type,
  (select count(*) from team_tools) as team_tools_migradas;


-- ────────────────────────────────────────────────────────────
-- PASO 3 — Cronograma: horario editable, genérico, por servicio+equipo
-- ────────────────────────────────────────────────────────────

create table if not exists service_schedule_items (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete cascade,
  team_id    uuid not null references teams(id) on delete cascade,
  hora       text,              -- texto libre tipo "10:00" — sin validar formato
  texto      text not null,
  sort_order int  not null default 0
);
create index if not exists idx_service_schedule_items_service_team on service_schedule_items(service_id, team_id);

-- ── Verificación PASO 3 ──
select count(*) from service_schedule_items;


-- ────────────────────────────────────────────────────────────
-- PASO 4 — Texto libre: una nota por servicio+equipo
-- ────────────────────────────────────────────────────────────

create table if not exists service_notes (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete cascade,
  team_id    uuid not null references teams(id) on delete cascade,
  texto      text not null default '',
  updated_at timestamptz not null default now(),
  unique(service_id, team_id)
);

-- ── Verificación PASO 4 ──
select count(*) from service_notes;


-- ────────────────────────────────────────────────────────────
-- PASO 5 — RLS (mismo patrón admin-de-organización que el resto)
-- ────────────────────────────────────────────────────────────

alter table team_tools enable row level security;
alter table service_schedule_items enable row level security;
alter table service_notes enable row level security;

create policy "org admins all team_tools" on team_tools
  for all
  using (exists (select 1 from teams t where t.id = team_tools.team_id and is_org_admin(auth.jwt()->>'email', t.organization_id)))
  with check (exists (select 1 from teams t where t.id = team_tools.team_id and is_org_admin(auth.jwt()->>'email', t.organization_id)));

create policy "org admins all service_schedule_items" on service_schedule_items
  for all
  using (exists (select 1 from teams t where t.id = service_schedule_items.team_id and is_org_admin(auth.jwt()->>'email', t.organization_id)))
  with check (exists (select 1 from teams t where t.id = service_schedule_items.team_id and is_org_admin(auth.jwt()->>'email', t.organization_id)));

create policy "org admins all service_notes" on service_notes
  for all
  using (exists (select 1 from teams t where t.id = service_notes.team_id and is_org_admin(auth.jwt()->>'email', t.organization_id)))
  with check (exists (select 1 from teams t where t.id = service_notes.team_id and is_org_admin(auth.jwt()->>'email', t.organization_id)));

-- ── Verificación PASO 5 ──
select tablename, policyname from pg_policies
where tablename in ('team_tools','service_schedule_items','service_notes')
order by tablename;


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────
select 'team_tools' as tabla, count(*) from team_tools
union all
select 'service_schedule_items', count(*) from service_schedule_items
union all
select 'service_notes', count(*) from service_notes;
