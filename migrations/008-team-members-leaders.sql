-- ============================================================
-- Fase 8 — team_members pasa a ser siempre de equipo raíz + líderes
--
-- Depende de que 007-teams-position-schema.sql ya haya corrido (necesita
-- que team_positions exista y esté poblada).
--
-- Dos cambios de fondo:
-- 1. Hoy team_members.team_id puede apuntar a un equipo raíz (membresía
--    "General") O a una posición (membresía en esa posición puntual) —
--    ambos casos mezclados en la misma columna. De acá en más,
--    team_members.team_id SIEMPRE apunta a un equipo raíz; la posición
--    vive aparte, en team_member_positions.
-- 2. team_admins con team_id no nulo (hoy usado como "líder de este
--    equipo o de esta posición puntual") se reemplaza por
--    team_members.is_leader — SOLO a nivel de equipo completo. El usuario
--    confirmó explícitamente aceptar perder el matiz de "líder de una
--    posición específica" (se pierde el detalle de cuál posición cuando
--    alguien era líder solo de una posición, no del equipo entero).
--
-- team_admins con team_id NULL (admin de organización, el gate de login)
-- NO se toca en ningún PASO de este archivo.
--
-- Corré esto en "Ancora - TEST" primero, PASO a PASO, revisando cada
-- reporte de solo-lectura (PASO 2 y PASO 5) antes de correr el PASO
-- destructivo que sigue.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — nuevas columnas en team_members
-- ────────────────────────────────────────────────────────────

alter table team_members add column if not exists is_leader boolean not null default false;
alter table team_members add column if not exists availability text not null default 'unrestricted';

-- ── Verificación PASO 1 ──
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'team_members' and column_name in ('is_leader', 'availability');


-- ────────────────────────────────────────────────────────────
-- PASO 2 — REPORTE (solo lectura, no escribe nada)
-- team_members que hoy apuntan a una posición: confirmar que TODOS
-- resuelven a una fila de team_positions ya creada en la Fase 7.
-- ────────────────────────────────────────────────────────────

select
  tm.id as team_members_id,
  m.nombre as persona,
  t.name as posicion,
  t.parent_team_id as equipo_raiz_id,
  tp.id as team_position_id_encontrado
from team_members tm
join teams t on t.id = tm.team_id
join members m on m.id = tm.member_id
left join team_positions tp on tp.team_id = t.parent_team_id and lower(tp.name) = lower(t.name)
where t.parent_team_id is not null
order by t.parent_team_id, t.name;

-- ── Revisar: la columna team_position_id_encontrado NO debe tener
-- ningún NULL. Si aparece un NULL, PARAR y resolverlo (revisar por qué
-- esa posición no se copió en la Fase 7) antes de seguir al PASO 3. ──


-- ────────────────────────────────────────────────────────────
-- PASO 3 — migrar team_members de posición → equipo raíz + team_member_positions
-- ────────────────────────────────────────────────────────────
-- Para cada team_members que hoy apunta a una posición: asegura la fila
-- de team_members del equipo RAÍZ (la crea si no existe, o reusa la que
-- ya haya — ej. si la persona ya era miembro general del equipo), enlaza
-- la posición vía team_member_positions, y borra la fila vieja (la que
-- apuntaba a la posición) — ya quedó representada por el link nuevo.

do $$
declare
  r record;
  v_root_tm_id uuid;
  v_position_id uuid;
  v_migrados int := 0;
begin
  for r in
    select tm.id as old_tm_id, tm.member_id, tm.organization_id,
           t.parent_team_id as root_team_id, t.name as position_name
    from team_members tm
    join teams t on t.id = tm.team_id
    where t.parent_team_id is not null
  loop
    insert into team_members (member_id, team_id, organization_id)
    values (r.member_id, r.root_team_id, r.organization_id)
    on conflict (team_id, member_id) do nothing;

    select id into v_root_tm_id
    from team_members
    where team_id = r.root_team_id and member_id = r.member_id;

    select id into v_position_id
    from team_positions
    where team_id = r.root_team_id and lower(name) = lower(r.position_name);

    if v_position_id is not null then
      insert into team_member_positions (team_member_id, team_position_id)
      values (v_root_tm_id, v_position_id)
      on conflict do nothing;
    end if;

    delete from team_members where id = r.old_tm_id;
    v_migrados := v_migrados + 1;
  end loop;

  raise notice 'team_members migradas de posición a equipo raíz: %', v_migrados;
end $$;

-- ── Verificación PASO 3 ──
-- 1. Ya no debe quedar ningún team_members apuntando a una posición.
select count(*) from team_members tm join teams t on t.id = tm.team_id where t.parent_team_id is not null;
-- 2. Total de links creados en team_member_positions.
select count(*) from team_member_positions;


-- ────────────────────────────────────────────────────────────
-- PASO 4 — REPORTE (solo lectura, no escribe nada)
-- Vista previa de la pérdida de matiz "líder de posición específica":
-- casos donde más de una fila de team_admins (equipo o posición) colapsa
-- sobre el mismo (persona, equipo raíz).
-- ────────────────────────────────────────────────────────────

select
  m.nombre as persona,
  coalesce(t.parent_team_id, t.id) as equipo_raiz_id,
  array_agg(t.name order by t.name) as via_filas_team_admins,
  count(*) as cuantas_colapsan
from team_admins ta
join teams t on t.id = ta.team_id
join members m on m.id = ta.member_id
where ta.team_id is not null
group by 1, 2
having count(*) > 1
order by 1;

-- ── Esto es informativo, no bloquea nada. Cada fila de acá es una
-- persona que hoy es líder de más de una posición/equipo bajo la misma
-- raíz — después del PASO 6 quedará como líder de ESE equipo completo
-- una sola vez (is_leader=true), sin distinguir de cuál posición. ──


-- ────────────────────────────────────────────────────────────
-- PASO 5 — migrar team_admins (team_id not null) → team_members.is_leader
-- ────────────────────────────────────────────────────────────

do $$
declare
  r record;
  v_root_team_id uuid;
  v_migrados int := 0;
begin
  for r in
    select ta.member_id, ta.organization_id, ta.team_id, t.parent_team_id, t.id as team_row_id
    from team_admins ta
    join teams t on t.id = ta.team_id
    where ta.team_id is not null
  loop
    v_root_team_id := coalesce(r.parent_team_id, r.team_row_id);

    insert into team_members (member_id, team_id, organization_id, is_leader)
    values (r.member_id, v_root_team_id, r.organization_id, true)
    on conflict (team_id, member_id) do update set is_leader = true;

    v_migrados := v_migrados + 1;
  end loop;

  raise notice 'team_admins (team_id not null) migrados a is_leader: %', v_migrados;
end $$;

-- ── Verificación PASO 5 ──
select count(*) from team_members where is_leader = true;


-- ────────────────────────────────────────────────────────────
-- PASO 6 — DESTRUCTIVO, separado a propósito. Correr SOLO después de
-- confirmar que el conteo del PASO 5 tiene sentido (compararlo contra
-- el reporte del PASO 4). Borra las filas de team_admins ya migradas.
-- Las filas con team_id IS NULL (admins de organización, el login) NO
-- se tocan — esta condición es la misma en todo el archivo.
-- ────────────────────────────────────────────────────────────

delete from team_admins where team_id is not null;

-- ── Verificación PASO 6 ──
-- Debe devolver 0 — solo deberían quedar admins de organización (team_id null).
select count(*) from team_admins where team_id is not null;
-- Los admins de organización deben seguir intactos (comparar con el
-- conteo de antes de correr este archivo).
select count(*) from team_admins where team_id is null;


-- ────────────────────────────────────────────────────────────
-- PASO 7 — limpiar las filas-posición viejas de `teams`
-- ────────────────────────────────────────────────────────────
-- Ya están copiadas en team_positions (Fase 7) y, después de los PASO 3
-- y 6 de este archivo, nada las referencia más desde team_members ni
-- team_admins — se pueden borrar sin efecto en cascada. Esto es lo que
-- permite, recién ahora, que `teams` tenga nombres únicos por
-- organización sin colisionar con una posición vieja del mismo nombre
-- (el error "teams_org_name_active... duplicated" que viste al correr
-- 007 era exactamente por esto).

-- ── Verificación previa — confirmar que ya no hay referencias activas: ──
select count(*) from team_members tm join teams t on t.id = tm.team_id where t.parent_team_id is not null;
select count(*) from team_admins ta join teams t on t.id = ta.team_id where t.parent_team_id is not null;
-- Ambas deben devolver 0 antes de seguir.

delete from teams where parent_team_id is not null;

-- ── Verificación PASO 7 ──
-- Debe ser 0 — en `teams` ya no debería quedar ninguna fila con parent_team_id.
select count(*) from teams where parent_team_id is not null;


-- ────────────────────────────────────────────────────────────
-- PASO 8 — ahora sí, índice único de nombre-de-equipo activo por
-- organización (quedó pendiente de 007 por la colisión de nombres)
-- ────────────────────────────────────────────────────────────

select organization_id, lower(name), count(*)
from teams
where archived_at is null
group by 1, 2
having count(*) > 1;

-- ── Debe devolver 0 filas ahora. Si todavía aparece algo, quedan dos
-- EQUIPOS RAÍZ de verdad con el mismo nombre — hay que renombrar uno
-- antes de crear el índice. ──

create unique index if not exists teams_org_name_active
  on teams (organization_id, lower(name)) where archived_at is null;

-- ── Verificación PASO 8 ──
select indexname from pg_indexes where tablename = 'teams' and indexname = 'teams_org_name_active';


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL DE ESTA FASE
-- ────────────────────────────────────────────────────────────
-- A partir de acá: team_members.team_id siempre es un equipo raíz,
-- las posiciones de cada membresía viven en team_member_positions,
-- y el único lugar de "líder" es team_members.is_leader (por equipo
-- completo). team_admins solo tiene admins de organización.

select 'team_members (raíz)' as tabla, count(*) from team_members
union all
select 'team_member_positions', count(*) from team_member_positions
union all
select 'team_members líderes', count(*) from team_members where is_leader
union all
select 'team_admins (org admins)', count(*) from team_admins
union all
select 'teams (solo raíz, tras limpieza)', count(*) from teams;

-- La columna parent_team_id sigue existiendo en `teams` (no se elimina en
-- esta fase, por si hace falta consultarla), pero ya no queda ninguna fila
-- con un valor no nulo — todas las filas-posición viejas se borraron en
-- el PASO 7 de este archivo, una vez copiadas a team_positions y sin
-- referencias activas.
