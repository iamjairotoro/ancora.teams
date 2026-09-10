-- ============================================================
-- Fase 7 — Equipo → Posición como tabla propia (brief de Claudia)
--
-- Contexto: hasta ahora una "posición" era simplemente otra fila de `teams`
-- con parent_team_id apuntando al equipo raíz (ej. un equipo "Banda" con
-- hijos "AG1", "AG2", "VX1"...). Esta fase le da a la posición su propia
-- tabla (`team_positions`), con code y default_slots, tal como pide el
-- brief — sin tocar `banda_assignments` ni renombrar ninguna posición
-- existente (eso rompería las confirmaciones de voluntarios ya hechas,
-- ver la nota en el plan).
--
-- IMPORTANTE — no se borra nada todavía: las filas viejas de `teams` que
-- representan posiciones (parent_team_id not null) se quedan donde están,
-- intactas, como red de seguridad. Solo se copian a `team_positions`.
-- parent_team_id tampoco se elimina de `teams` en esta fase.
--
-- Corré esto PRIMERO en "Ancora - TEST", paso a paso, confirmando cada
-- verificación antes de seguir al siguiente PASO.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — verificar que no haya anidación más allá de 2 niveles
-- ────────────────────────────────────────────────────────────
-- El código actual nunca impuso un límite de profundidad (teams podía
-- colgar de teams indefinidamente). El modelo nuevo asume exactamente
-- 2 niveles (equipo → posición) — esto lo confirma con los datos reales
-- antes de asumirlo.

select t.id, t.nombre as posicion, t.parent_team_id, p.nombre as padre, p.parent_team_id as abuelo
from teams t
join teams p on p.id = t.parent_team_id
where p.parent_team_id is not null;

-- ── Debe devolver 0 filas. Si devuelve alguna, PARAR acá y decidir cómo
-- resolver esa rama de 3 niveles antes de seguir — no continuar a ciegas. ──


-- ────────────────────────────────────────────────────────────
-- PASO 2 — teams: nombre→name, agregar description/archived_at
-- ────────────────────────────────────────────────────────────

alter table teams rename column nombre to name;
alter table teams add column if not exists description text;
alter table teams add column if not exists archived_at timestamptz;

-- ── Verificación PASO 2 ──
-- Debe listar name, description, archived_at entre las columnas de teams.
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'teams'
order by ordinal_position;


-- ────────────────────────────────────────────────────────────
-- PASO 3 — chequeo informativo de nombres duplicados (SIN crear el
-- índice todavía)
-- ────────────────────────────────────────────────────────────
-- Mientras las filas-posición viejas (parent_team_id not null) sigan
-- viviendo en `teams`, es NORMAL que este chequeo encuentre "duplicados"
-- (ej. una posición y un equipo raíz distintos que casualmente se llaman
-- igual, como "Montaje") — esas filas viejas se eliminan recién en la
-- Fase 8, una vez migradas a team_positions y ya sin nada que las
-- referencie. El índice único de nombre-de-equipo-activo se crea al
-- final de 008-team-members-leaders.sql, cuando `teams` ya solo tiene
-- equipos raíz. Esta consulta es solo para que veas qué está colisionando
-- hoy — no bloquea nada, no hace falta resolverla ahora.

select organization_id, lower(name), count(*)
from teams
where archived_at is null
group by 1, 2
having count(*) > 1;


-- ────────────────────────────────────────────────────────────
-- PASO 4 — tabla team_positions
-- ────────────────────────────────────────────────────────────

create table if not exists team_positions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  team_id         uuid not null references teams(id) on delete cascade,
  name            text not null,
  code            text not null,
  default_slots   int  not null default 1 check (default_slots >= 1),
  sort_order      int  not null default 0,
  archived_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_team_positions_team on team_positions(team_id);
create index if not exists idx_team_positions_org on team_positions(organization_id);

-- ── Verificación PASO 4 ──
-- Debe existir la tabla, 0 filas todavía.
select count(*) from team_positions;


-- ────────────────────────────────────────────────────────────
-- PASO 5 — backfill: cada posición vieja (fila hija de teams) → 1 fila
-- en team_positions. code = el nombre tal cual (ya son códigos cortos
-- como "AG1", "VX1", "MONTAJE 1") — no se inventan nombres nuevos acá.
-- ────────────────────────────────────────────────────────────

-- Chequeo de colisión de code ANTES de insertar (mismo team_id, mismo
-- code en minúsculas) — debe devolver 0 filas.
select parent_team_id, lower(name), count(*)
from teams
where parent_team_id is not null
group by 1, 2
having count(*) > 1;

-- Si el chequeo de arriba dio 0, correr el insert:
insert into team_positions (organization_id, team_id, name, code, default_slots, sort_order, created_at)
select organization_id, parent_team_id, name, name, 1, sort_order, created_at
from teams
where parent_team_id is not null;

-- ── Verificación PASO 5 ──
-- El conteo de team_positions debe ser EXACTO igual al de posiciones
-- viejas (filas de teams con parent_team_id not null).
select
  (select count(*) from teams where parent_team_id is not null) as posiciones_viejas,
  (select count(*) from team_positions) as team_positions_nuevas;


-- ────────────────────────────────────────────────────────────
-- PASO 6 — índice único de code activo por equipo
-- ────────────────────────────────────────────────────────────

create unique index if not exists team_positions_code_active
  on team_positions (team_id, lower(code)) where archived_at is null;
create unique index if not exists team_positions_name_active
  on team_positions (team_id, lower(name)) where archived_at is null;

-- ── Verificación PASO 6 ──
select indexname from pg_indexes where tablename = 'team_positions';


-- ────────────────────────────────────────────────────────────
-- PASO 7 — tabla team_member_positions + trigger de integridad
-- ────────────────────────────────────────────────────────────
-- Ninguna FK sola puede garantizar "esta posición pertenece al mismo
-- equipo que esta membresía" — hace falta un trigger (lo pide el brief
-- explícitamente).

create table if not exists team_member_positions (
  team_member_id    uuid not null references team_members(id) on delete cascade,
  team_position_id  uuid not null references team_positions(id) on delete cascade,
  primary key (team_member_id, team_position_id)
);

create or replace function check_team_member_position_same_team()
returns trigger
language plpgsql
as $$
declare
  v_member_team_id uuid;
  v_position_team_id uuid;
begin
  select team_id into v_member_team_id from team_members where id = new.team_member_id;
  select team_id into v_position_team_id from team_positions where id = new.team_position_id;
  if v_member_team_id is distinct from v_position_team_id then
    raise exception 'team_member_positions: la posición % no pertenece al mismo equipo que la membresía % (equipo %  vs %)',
      new.team_position_id, new.team_member_id, v_position_team_id, v_member_team_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_team_member_position_same_team on team_member_positions;
create trigger trg_check_team_member_position_same_team
  before insert or update on team_member_positions
  for each row execute function check_team_member_position_same_team();

-- ── Verificación PASO 7 ──
select count(*) from team_member_positions;
select tgname from pg_trigger where tgrelid = 'team_member_positions'::regclass;


-- ────────────────────────────────────────────────────────────
-- PASO 8 — RLS de team_positions y team_member_positions
-- ────────────────────────────────────────────────────────────
-- team_positions sigue el mismo patrón que teams (admin de organización
-- + lectura pública, porque son solo nombres/códigos de posición, no
-- quién ocupa cada una). team_member_positions sigue el patrón de
-- team_members (solo admin de organización — ahí sí vive el dato de
-- quién es quién).

alter table team_positions enable row level security;
alter table team_member_positions enable row level security;

create policy "org admins read team_positions" on team_positions
  for select using (is_org_admin(auth.jwt()->>'email', organization_id));

create policy "org admins write team_positions" on team_positions
  for all
  using (is_org_admin(auth.jwt()->>'email', organization_id))
  with check (is_org_admin(auth.jwt()->>'email', organization_id));

create policy "public read team_positions" on team_positions
  for select using (true);

-- team_member_positions no tiene organization_id propio (hereda vía
-- team_member_id) — se resuelve con un subselect a team_members.
create policy "org admins read team_member_positions" on team_member_positions
  for select using (
    exists (
      select 1 from team_members tm
      where tm.id = team_member_positions.team_member_id
        and is_org_admin(auth.jwt()->>'email', tm.organization_id)
    )
  );

create policy "org admins write team_member_positions" on team_member_positions
  for all
  using (
    exists (
      select 1 from team_members tm
      where tm.id = team_member_positions.team_member_id
        and is_org_admin(auth.jwt()->>'email', tm.organization_id)
    )
  )
  with check (
    exists (
      select 1 from team_members tm
      where tm.id = team_member_positions.team_member_id
        and is_org_admin(auth.jwt()->>'email', tm.organization_id)
    )
  );

-- ── Verificación PASO 8 ──
-- team_positions: 3 policies (2 admin + 1 pública). team_member_positions: 2 policies.
select tablename, policyname, cmd from pg_policies
where tablename in ('team_positions', 'team_member_positions')
order by tablename, cmd;


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL DE ESTA FASE
-- ────────────────────────────────────────────────────────────
-- Nada existente se tocó: teams sigue con las mismas filas (root +
-- posiciones viejas, ahora con name/description/archived_at nuevos),
-- team_admins/team_members intactos, banda_assignments intacto.
-- team_positions es 100% aditivo. La app en producción sigue funcionando
-- exactamente igual hasta que se despliegue el código de la Fase 8.

select 'teams' as tabla, count(*) from teams
union all
select 'team_positions', count(*) from team_positions
union all
select 'team_member_positions', count(*) from team_member_positions;
