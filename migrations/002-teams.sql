-- ============================================================
-- Fase 2 — árbol de equipos (teams) + roles (team_admins)
-- Puramente aditiva: nada existente se borra ni se modifica en su
-- comportamiento actual. admin_emails queda en la base sin usarse (no se
-- borra en esta fase) — el código deja de consultarla, pero la tabla y sus
-- datos se quedan por si hace falta volver atrás.
--
-- Corré esto PRIMERO en "Ancora - TEST" (Project Settings → SQL Editor).
-- Recién cuando lo confirmes ahí, se corre igual en "Ancora - Teams" (prod).
--
-- Igual que 001-organizations.sql: pasos separados por "PASO N", con una
-- consulta de verificación después de cada uno — corré paso a paso.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — tabla teams (árbol recursivo vía parent_team_id)
-- ────────────────────────────────────────────────────────────
-- parent_team_id null = equipo raíz (ej. "Alabanza", "Logística").
-- No hay límite de profundidad — un equipo puede colgar de otro equipo
-- indefinidamente (ej. Producción → Montaje → lo que sea después).

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  parent_team_id uuid references teams(id),
  nombre text not null,
  created_at timestamptz default now()
);

create index if not exists idx_teams_parent on teams(parent_team_id);
create index if not exists idx_teams_org on teams(organization_id);

-- ── Verificación PASO 1 ──
-- Debe existir la tabla, 0 filas todavía.
select count(*) from teams;


-- ────────────────────────────────────────────────────────────
-- PASO 2 — tabla team_admins
-- ────────────────────────────────────────────────────────────
-- team_id null = admin global de toda la organización.
-- team_id con valor = admin de ese equipo — y, por herencia en el árbol,
-- de todos sus equipos hijos (ver is_team_admin más abajo). No hace falta
-- una fila por cada hijo.

create table if not exists team_admins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  team_id uuid references teams(id),
  organization_id uuid not null references organizations(id),
  created_at timestamptz default now(),
  unique (member_id, team_id, organization_id)
);

create index if not exists idx_team_admins_member on team_admins(member_id);

-- ── Verificación PASO 2 ──
select count(*) from team_admins;


-- ────────────────────────────────────────────────────────────
-- PASO 3 — función is_team_admin(email, team_id, organization_id)
-- ────────────────────────────────────────────────────────────
-- Única fuente de verdad para "¿es admin de este equipo, o de un
-- ancestro de este equipo, o admin global?" — la llama tanto la app
-- (vía supabase.rpc) como, en una fase futura, las políticas RLS. Así
-- las dos capas nunca quedan en desacuerdo sobre quién puede qué.
-- security definer: corre con privilegios elevados para poder leer
-- team_admins/members sin depender de las políticas RLS del que llama.

create or replace function is_team_admin(p_email text, p_team_id uuid, p_organization_id uuid)
returns boolean
language sql security definer set search_path = public
as $$
  with recursive team_chain as (
    select id, parent_team_id from teams where id = p_team_id
    union all
    select t.id, t.parent_team_id from teams t
    join team_chain tc on t.id = tc.parent_team_id
  )
  select exists (
    select 1 from team_admins ta
    join members m on m.id = ta.member_id
    where lower(m.email) = lower(p_email)
      and ta.organization_id = p_organization_id
      and (ta.team_id is null or ta.team_id in (select id from team_chain))
  );
$$;

-- ── Verificación PASO 3 ──
-- Debe devolver false (todavía no hay datos en team_admins).
select is_team_admin('nadie@ejemplo.com', null, '00000000-0000-0000-0000-000000000001');


-- ────────────────────────────────────────────────────────────
-- PASO 4 — función is_org_admin(email, organization_id)
-- ────────────────────────────────────────────────────────────
-- Caso particular de admin global (team_id is null) — separada de
-- is_team_admin porque hay acciones (ej. crear/borrar equipos raíz) que
-- solo debe poder hacer un admin de toda la organización, no un admin
-- de un equipo específico.

create or replace function is_org_admin(p_email text, p_organization_id uuid)
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from team_admins ta
    join members m on m.id = ta.member_id
    where lower(m.email) = lower(p_email)
      and ta.organization_id = p_organization_id
      and ta.team_id is null
  );
$$;

-- ── Verificación PASO 4 ──
select is_org_admin('nadie@ejemplo.com', '00000000-0000-0000-0000-000000000001');


-- ────────────────────────────────────────────────────────────
-- PASO 5 — migrar admin_emails → team_admins (admins globales)
-- ────────────────────────────────────────────────────────────
-- admin_emails no tiene member_id (solo email text primary key), así que
-- se cruza por email contra members. Si algún admin_emails.email NO tiene
-- fila en members, se pierde en esta migración — la verificación de abajo
-- lo detecta explícitamente para que decidas qué hacer (crear el member
-- que falta, o ignorarlo si es una cuenta de prueba vieja) ANTES de seguir.

insert into team_admins (member_id, team_id, organization_id)
select m.id, null, coalesce(ae.organization_id, '00000000-0000-0000-0000-000000000001')
from admin_emails ae
join members m on lower(m.email) = lower(ae.email)
on conflict (member_id, team_id, organization_id) do nothing;

-- ── Verificación PASO 5, parte A ──
-- Cuántos admin_emails migraron correctamente a team_admins.
select count(*) from team_admins where team_id is null;

-- ── Verificación PASO 5, parte B — IMPORTANTE ──
-- Emails de admin_emails que NO tienen member correspondiente (por lo
-- tanto NO se migraron). Si esto devuelve filas, revisalas antes de dar
-- por completa la migración — o creás el member que falta, o confirmás
-- que esa cuenta ya no debería ser admin.
select ae.email
from admin_emails ae
left join members m on lower(m.email) = lower(ae.email)
where m.id is null;


-- ────────────────────────────────────────────────────────────
-- PASO 6 — RLS en teams y team_admins (no queda para la fase de RLS
-- general del backlog — estas dos tablas SÍ se protegen ahora, porque
-- deciden quién es admin. Si quedaran abiertas, cualquiera podría
-- insertarse como admin vía la API pública de Supabase sin pasar por la
-- app — exactamente el mismo hueco que esta fase busca cerrar.
-- ────────────────────────────────────────────────────────────

alter table teams enable row level security;
alter table team_admins enable row level security;

-- Lectura y escritura de ambas tablas: solo admins de la organización.
-- (No hay todavía UI de miembros regulares viendo el árbol de equipos —
-- cuando exista, se agrega una policy de lectura más permisiva aparte.)

create policy "org admins read teams" on teams
  for select using (is_org_admin(auth.jwt()->>'email', organization_id));

create policy "org admins write teams" on teams
  for all
  using (is_org_admin(auth.jwt()->>'email', organization_id))
  with check (is_org_admin(auth.jwt()->>'email', organization_id));

create policy "org admins read team_admins" on team_admins
  for select using (is_org_admin(auth.jwt()->>'email', organization_id));

create policy "org admins write team_admins" on team_admins
  for all
  using (is_org_admin(auth.jwt()->>'email', organization_id))
  with check (is_org_admin(auth.jwt()->>'email', organization_id));

-- ── Verificación PASO 6 ──
-- Debe listar 2 filas por tabla (select + all/write), rowsecurity = true.
select tablename, policyname, cmd from pg_policies where tablename in ('teams','team_admins');
select tablename, rowsecurity from pg_tables where tablename in ('teams','team_admins');


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────
-- Total de admins globales migrados vs. total de filas en admin_emails —
-- deberían coincidir si la parte B de arriba no devolvió filas.
select
  (select count(*) from admin_emails) as admin_emails_total,
  (select count(*) from team_admins where team_id is null) as team_admins_globales;

-- Todavía NO hay equipos creados (teams está vacía) — eso se hace desde
-- el admin de la app una vez que este esquema esté confirmado acá, no
-- por SQL manual. Todavía NO hay RLS nueva — sigue siendo la fase
-- siguiente (backlog), igual que con organizations en su momento.
