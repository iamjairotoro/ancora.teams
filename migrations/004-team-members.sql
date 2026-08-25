-- ============================================================
-- Fase 4 — pertenencia general a equipos (team_members)
-- Puramente aditiva. Separada de team_admins a propósito: team_admins es
-- sobre QUIÉN ADMINISTRA un equipo (con herencia hacia los hijos vía
-- is_team_admin); team_members es sobre QUIÉN PERTENECE a un equipo
-- (sin herencia — una fila = pertenece exactamente a ESE equipo, no a
-- sus descendientes). Un miembro puede tener ambas filas si además de
-- pertenecer al equipo también lo administra.
--
-- Corré esto en "Ancora - Teams" (SQL Editor), paso a paso.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — tabla team_members
-- ────────────────────────────────────────────────────────────
-- A diferencia de team_admins, acá team_id es obligatorio (no existe
-- "miembro global" de la organización) y el ON DELETE CASCADE va directo
-- en la definición — esta tabla es nueva, no arrastra el problema que
-- tuvieron teams/team_admins (que necesitaron la migración 003 aparte
-- porque ya existían antes de decidir la cascada).

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  team_id uuid not null references teams(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  created_at timestamptz default now(),
  unique (member_id, team_id)
);

create index if not exists idx_team_members_team on team_members(team_id);
create index if not exists idx_team_members_member on team_members(member_id);

-- ── Verificación PASO 1 ──
-- Debe existir la tabla, 0 filas todavía.
select count(*) from team_members;


-- ────────────────────────────────────────────────────────────
-- PASO 2 — RLS, mismo patrón que teams/team_admins (PASO 6 de 002-teams.sql)
-- ────────────────────────────────────────────────────────────

alter table team_members enable row level security;

create policy "org admins read team_members" on team_members
  for select using (is_org_admin(auth.jwt()->>'email', organization_id));

create policy "org admins write team_members" on team_members
  for all
  using (is_org_admin(auth.jwt()->>'email', organization_id))
  with check (is_org_admin(auth.jwt()->>'email', organization_id));

-- ── Verificación PASO 2 ──
-- Debe listar 2 filas (select + all/write), rowsecurity = true.
select tablename, policyname, cmd from pg_policies where tablename = 'team_members';
select tablename, rowsecurity from pg_tables where tablename = 'team_members';
