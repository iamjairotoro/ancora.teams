-- ============================================================
-- Fase 5 — orden manual de equipos/posiciones (sort_order)
-- Puramente aditiva. Hoy `teams` se ordena alfabéticamente por `nombre`;
-- esto agrega una columna de orden manual (por grupo de hermanos, es
-- decir mismo parent_team_id) para poder reordenar con flechas subir/bajar
-- desde la UI, sin depender del alfabeto.
--
-- Corré esto en "Ancora - Teams" (único proyecto), paso a paso, con
-- verificación en cada uno — mismo estilo que 002/003/004.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — columna sort_order (nullable primero)
-- ────────────────────────────────────────────────────────────

alter table teams add column if not exists sort_order integer;

-- ── Verificación PASO 1 ──
select count(*) as total, count(sort_order) as con_orden from teams;


-- ────────────────────────────────────────────────────────────
-- PASO 2 — backfill: el orden alfabético actual pasa a ser el sort_order
-- inicial, calculado por separado dentro de cada grupo de hermanos
-- (mismo parent_team_id) para que cada nivel del árbol arranque 0,1,2...
-- ────────────────────────────────────────────────────────────

with ranked as (
  select id, row_number() over (partition by parent_team_id order by nombre) as rn
  from teams
)
update teams set sort_order = ranked.rn
from ranked where teams.id = ranked.id;

-- ── Verificación PASO 2 ── debe devolver 0
select count(*) from teams where sort_order is null;


-- ────────────────────────────────────────────────────────────
-- PASO 3 — NOT NULL + default (para equipos nuevos que no lo manden
-- explícito) + índice para el ORDER BY por grupo de hermanos
-- ────────────────────────────────────────────────────────────

alter table teams alter column sort_order set not null;
alter table teams alter column sort_order set default 0;
create index if not exists idx_teams_parent_sort on teams(parent_team_id, sort_order);

-- ── Verificación PASO 3 ──
select column_name, is_nullable, column_default from information_schema.columns
where table_name = 'teams' and column_name = 'sort_order';
