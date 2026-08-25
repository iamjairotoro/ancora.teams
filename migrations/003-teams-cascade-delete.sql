-- ============================================================
-- Fase 3 — borrado en cascada del árbol de equipos
-- Cambia el ON DELETE de dos FKs existentes, de NO ACTION (bloquea el
-- borrado hoy) a CASCADE. Sin esto, borrar un equipo con hijos o con
-- team_admins asociados falla directo con un error de FK.
--
-- La UI (pestaña "Equipos") sigue mostrando la lista completa de equipos
-- afectados ANTES de pedir confirmación — este cambio solo hace que el
-- borrado en sí, una vez confirmado, sea atómico en una sola transacción
-- en vez de tener que orquestarlo paso a paso desde el cliente.
--
-- Corré esto en "Ancora - Teams" (SQL Editor), paso a paso, mismo estilo
-- que 001-organizations.sql y 002-teams.sql.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — confirmar el nombre real de la FK antes de tocarla
-- ────────────────────────────────────────────────────────────
-- Debe devolver 1 fila: "teams_parent_team_id_fkey" (nombre que Postgres
-- asigna por default a una FK sin nombre explícito). Si sale distinto,
-- usá ESE nombre en el PASO 2 en vez del de abajo.

select conname from pg_constraint
where conrelid = 'teams'::regclass and confrelid = 'teams'::regclass;


-- ────────────────────────────────────────────────────────────
-- PASO 2 — teams.parent_team_id: cascada de padre a hijos
-- ────────────────────────────────────────────────────────────

alter table teams drop constraint if exists teams_parent_team_id_fkey;
alter table teams add constraint teams_parent_team_id_fkey
  foreign key (parent_team_id) references teams(id) on delete cascade;

-- ── Verificación PASO 2 ── confdeltype debe ser 'c' (cascade)
select conname, confdeltype from pg_constraint where conname = 'teams_parent_team_id_fkey';


-- ────────────────────────────────────────────────────────────
-- PASO 3 — team_admins.team_id: se borra junto con el equipo
-- ────────────────────────────────────────────────────────────
-- Igual que arriba: confirmá el nombre real primero si querés estar
-- seguro, pero team_admins solo tiene una FK hacia teams (la otra FK,
-- member_id, apunta a members) así que el nombre default no debería
-- prestarse a confusión.

alter table team_admins drop constraint if exists team_admins_team_id_fkey;
alter table team_admins add constraint team_admins_team_id_fkey
  foreign key (team_id) references teams(id) on delete cascade;

-- ── Verificación PASO 3 ──
select conname, confdeltype from pg_constraint where conname = 'team_admins_team_id_fkey';


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL — ambas cascadas activas
-- ────────────────────────────────────────────────────────────
select conname, confdeltype from pg_constraint
where conname in ('teams_parent_team_id_fkey', 'team_admins_team_id_fkey');
-- Ambas filas deben tener confdeltype = 'c'.
