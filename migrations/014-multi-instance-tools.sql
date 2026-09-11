-- ============================================================
-- Fase 14 — varias instancias de la MISMA herramienta por equipo
--
-- Hasta ahora team_tools tenía unique(team_id, tool_type): un equipo no
-- podía tener, por ejemplo, dos Checklists distintos a la vez. Ahora sí
-- — cada fila de team_tools es una instancia independiente (se puede
-- agregar "Checklist" tres veces y son tres checklists separados).
--
-- Para que cada instancia tenga sus propios datos (no comparta el
-- checklist/cronograma/notas con otra instancia del mismo tipo), las
-- tablas de datos por servicio pasan a identificarse por team_tool_id
-- en vez de team_id.
--
-- 100% aditivo, con backfill — no se pierde nada de lo ya creado.
--
-- Corré esto en "Ancora - TEST" primero, paso a paso, y después en la
-- base real.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — team_tools: permitir repetidos + nombre opcional
-- ────────────────────────────────────────────────────────────

alter table team_tools drop constraint if exists team_tools_team_id_tool_type_key;
alter table team_tools add column if not exists label text;

-- ── Verificación PASO 1 ──
select conname from pg_constraint where conrelid = 'team_tools'::regclass;


-- ────────────────────────────────────────────────────────────
-- PASO 2 — team_tool_id en las 3 tablas de datos por servicio
-- ────────────────────────────────────────────────────────────

alter table service_checklists add column if not exists team_tool_id uuid references team_tools(id) on delete cascade;
alter table service_schedule_items add column if not exists team_tool_id uuid references team_tools(id) on delete cascade;
alter table service_notes add column if not exists team_tool_id uuid references team_tools(id) on delete cascade;

-- ── Verificación PASO 2 ──
select table_name, column_name from information_schema.columns
where table_name in ('service_checklists','service_schedule_items','service_notes') and column_name = 'team_tool_id';


-- ────────────────────────────────────────────────────────────
-- PASO 3 — backfill: como hasta ahora había como mucho una instancia
-- por (equipo, tipo de herramienta), el cruce es directo y sin ambigüedad.
-- ────────────────────────────────────────────────────────────

update service_checklists sc set team_tool_id = tt.id
from team_tools tt
where tt.team_id = sc.team_id and tt.tool_type = 'checklist' and sc.team_tool_id is null;

update service_schedule_items ssi set team_tool_id = tt.id
from team_tools tt
where tt.team_id = ssi.team_id and tt.tool_type = 'schedule' and ssi.team_tool_id is null;

update service_notes sn set team_tool_id = tt.id
from team_tools tt
where tt.team_id = sn.team_id and tt.tool_type = 'notes' and sn.team_tool_id is null;

-- ── Verificación PASO 3 — deben ser 0 (todo lo que ya existía encontró su instancia) ──
select count(*) from service_checklists where team_tool_id is null;
select count(*) from service_schedule_items where team_tool_id is null;
select count(*) from service_notes where team_tool_id is null;


-- ────────────────────────────────────────────────────────────
-- PASO 4 — la unicidad pasa a ser por instancia, no por equipo
-- ────────────────────────────────────────────────────────────

alter table service_checklists drop constraint if exists service_checklists_service_id_team_id_key;
alter table service_checklists add constraint service_checklists_service_id_team_tool_id_key unique (service_id, team_tool_id);

alter table service_notes drop constraint if exists service_notes_service_id_team_id_key;
alter table service_notes add constraint service_notes_service_id_team_tool_id_key unique (service_id, team_tool_id);

-- ── Verificación PASO 4 ──
select conname from pg_constraint where conrelid = 'service_checklists'::regclass;
select conname from pg_constraint where conrelid = 'service_notes'::regclass;


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────
select 'team_tools' as tabla, count(*) from team_tools
union all
select 'service_checklists con team_tool_id', count(*) from service_checklists where team_tool_id is not null
union all
select 'service_schedule_items con team_tool_id', count(*) from service_schedule_items where team_tool_id is not null
union all
select 'service_notes con team_tool_id', count(*) from service_notes where team_tool_id is not null;
