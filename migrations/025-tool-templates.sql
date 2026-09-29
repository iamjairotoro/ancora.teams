-- ============================================================
-- Fase 25 — plantillas por herramienta (punto 25 de docs/PENDIENTES-code.md)
-- Parte 1 de 2: esquema, 100% aditivo. El backfill del Checklist va en
-- la 026 (que depende de que esta ya haya corrido).
--
-- Cubre Cronograma, Checklist y Orden del servicio (sin canciones). Una
-- plantilla guarda ESTRUCTURA, nunca personas ni canciones — no es
-- "Duplicar" (eso copia el domingo entero con banda y setlist).
--
-- Ajustes sobre la propuesta original (ver docs/mockup-plantillas.html):
-- - team_id (nullable): Cronograma y Checklist son herramientas POR
--   EQUIPO (team_tools) — una plantilla de una no sirve para otro
--   equipo. Orden del servicio no es por equipo (service_blocks no tiene
--   team_id), así que ahí team_id va null. El check constraint lo exige.
-- - El índice único de "predeterminada" incluye team_id — si no, dos
--   equipos no podrían tener cada uno su propia predeterminada del mismo
--   tipo de servicio.
-- - "Aplicada" no vive en la fila de datos (no se agrega
--   applied_template_id a service_schedule_items ni a service_blocks):
--   vive en service_applied_templates, aparte. Así el rótulo ("viene de
--   la plantilla X") sobrevive aunque se vacíe la herramienta — no hay
--   fila cuyo borrado se lleve el dato.
--
-- Corré esto en "Ancora - TEST" primero, PASO a PASO, y recién cuando lo
-- confirmes ahí se corre igual en "Ancora - Teams" (prod).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — tabla tool_templates
-- ────────────────────────────────────────────────────────────

create table if not exists tool_templates (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  team_id           uuid references teams(id) on delete cascade,
  tool              text not null check (tool in ('schedule','checklist','order')),
  name              text not null,
  content           jsonb not null default '[]'::jsonb,
  default_for_kind  text check (default_for_kind in ('service','rehearsal','other')),
  archived_at       timestamptz,
  created_by        uuid references members(id) on delete set null,
  created_at        timestamptz not null default now(),
  constraint tool_templates_team_scope check ((tool = 'order') = (team_id is null))
);
create index if not exists idx_tool_templates_org_tool on tool_templates(organization_id, tool);
create index if not exists idx_tool_templates_team on tool_templates(team_id);

-- Una predeterminada por (organización, herramienta, equipo, tipo de
-- servicio). coalesce a un uuid centinela porque team_id null (Orden del
-- servicio) también necesita competir por unicidad entre sí.
create unique index if not exists tool_templates_default_uq
  on tool_templates (organization_id, tool, coalesce(team_id,'00000000-0000-0000-0000-000000000000'), default_for_kind)
  where default_for_kind is not null;

-- ── Verificación PASO 1 ──
select count(*) from tool_templates;
select indexname from pg_indexes where tablename = 'tool_templates';


-- ────────────────────────────────────────────────────────────
-- PASO 2 — tabla service_applied_templates
-- ────────────────────────────────────────────────────────────
-- team_tool_id: obligatorio para schedule/checklist (una fila por
-- instancia de herramienta), null para 'order' (no es por equipo).
-- on delete set null en template_id — si se borra la plantilla, el
-- servicio no pierde su fila (el rótulo simplemente deja de resolver
-- nombre; "Actualizar" queda deshabilitado, no la fila entera).

create table if not exists service_applied_templates (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid not null references services(id) on delete cascade,
  tool          text not null check (tool in ('schedule','checklist','order')),
  team_tool_id  uuid references team_tools(id) on delete cascade,
  template_id   uuid references tool_templates(id) on delete set null,
  applied_at    timestamptz not null default now(),
  constraint service_applied_templates_team_tool_scope check ((tool = 'order') = (team_tool_id is null))
);
create index if not exists idx_service_applied_templates_service on service_applied_templates(service_id);

-- Unicidad: por (servicio, herramienta, instancia) cuando team_tool_id
-- no es null (schedule/checklist); por (servicio, herramienta) cuando sí
-- lo es (order — un solo Orden del servicio por servicio, sin equipo).
create unique index if not exists service_applied_templates_by_tool_uq
  on service_applied_templates (service_id, tool, team_tool_id)
  where team_tool_id is not null;
create unique index if not exists service_applied_templates_order_uq
  on service_applied_templates (service_id, tool)
  where team_tool_id is null;

-- ── Verificación PASO 2 ──
select count(*) from service_applied_templates;
select indexname from pg_indexes where tablename = 'service_applied_templates';


-- ────────────────────────────────────────────────────────────
-- PASO 3 — RLS: solo owner/admin (punto 25, regla 6 — ni siquiera
-- aplicar, y esto se refuerza también del lado de la interfaz, no solo
-- acá: ver componentes de cada herramienta)
-- ────────────────────────────────────────────────────────────

alter table tool_templates enable row level security;
alter table service_applied_templates enable row level security;

drop policy if exists "org admins all tool_templates" on tool_templates;
create policy "org admins all tool_templates" on tool_templates
  for all
  using (is_org_admin(auth.jwt()->>'email', organization_id))
  with check (is_org_admin(auth.jwt()->>'email', organization_id));

-- service_applied_templates no tiene organization_id propio — se
-- resuelve vía el servicio.
drop policy if exists "org admins all service_applied_templates" on service_applied_templates;
create policy "org admins all service_applied_templates" on service_applied_templates
  for all
  using (exists (
    select 1 from services s
    where s.id = service_applied_templates.service_id
      and is_org_admin(auth.jwt()->>'email', s.organization_id)
  ))
  with check (exists (
    select 1 from services s
    where s.id = service_applied_templates.service_id
      and is_org_admin(auth.jwt()->>'email', s.organization_id)
  ));

-- ── Verificación PASO 3 ──
select tablename, policyname, cmd from pg_policies
where tablename in ('tool_templates','service_applied_templates')
order by tablename;


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────
select 'tool_templates' as tabla, count(*) from tool_templates
union all
select 'service_applied_templates', count(*) from service_applied_templates;

-- checklist_templates/checklist_template_items NO se tocan en esta fase
-- (ver migrations/026-checklist-templates-backfill.sql) — service_blocks
-- y service_schedule_items tampoco ganan columnas nuevas: "aplicada"
-- vive solo en service_applied_templates.
