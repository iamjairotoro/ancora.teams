-- ============================================================
-- 031 — Bloqueos de fecha por equipo, PARTE A (punto 51, versión B)
--
-- CASO. Una persona sirve en 3 equipos, bloquea 2 y queda disponible en el tercero.
--
-- ORDEN (acordado): 031 (esta, A) → desplegar la API/pantalla nuevas → 032 (B: borrar el
-- índice único viejo) → 033 (C: cerrar la lectura/escritura pública de date_blocks).
-- Esta parte es ADITIVA: no borra ni cambia nada de lo que usa el código desplegado hoy.
--
-- QUÉ HACE
--  1. date_blocks.team_id (nullable). NULL = «todos los equipos» de la persona: es el
--     significado de hoy, por eso NO hay relleno. Con valor = solo ese equipo.
--  2. Índice único (member_id, blocked_date, coalesce(team_id, uuid cero)): permite una fila
--     por equipo en la misma fecha. EL ÍNDICE VIEJO (member_id, blocked_date) SE MANTIENE:
--     la API desplegada hoy hace `upsert … onConflict member_id,blocked_date` y lo necesita.
--     MIENTRAS EXISTA, una persona no puede tener dos filas en la misma fecha: bloquear
--     «todos» (una fila NULL) funciona; bloquear solo algunos equipos falla hasta correr 032.
--  3. set_date_blocks(...): reemplaza de forma atómica los bloqueos de UNA persona en UNA
--     fecha. Solo la llama el servidor con la llave de servicio (revocada a public, anon y
--     authenticated). Si el conjunto de equipos cubre todos los equipos activos de la persona
--     (o es NULL) guarda UNA fila NULL; un conjunto vacío borra; un equipo que no es suyo
--     falla.
--  4. team_blocks_in_range(desde, hasta): lo que un administrador o un LÍDER puede ver, ya
--     expandido a (persona, equipo, fecha, motivo). Un administrador ve todos los equipos de
--     su organización; un líder SOLO las filas de los equipos que lidera, así que nunca puede
--     deducir en qué otros equipos bloqueó la persona. El motivo lo ven quienes administran y
--     los líderes de los equipos a los que el bloqueo aplica (la persona lo ve por la API).
--     Una fila NULL se expande a todos los equipos ACTIVOS de la persona, también a los que
--     se sume después.
--  5. blocked_others_summary(...) REESCRITA con el mismo nombre y firma (el Home desplegado
--     sigue funcionando): cuenta, por cada equipo que el que llama NO lidera, a las personas
--     bloqueadas PARA ESE equipo, excluyendo a quien también es de un equipo que él lidera
--     (ya la ve con nombre). El correo sale del JWT, NO del parámetro p_email (que el
--     navegador podía falsear); p_email y p_own_team_id se conservan solo por compatibilidad
--     y se ignoran.
--  Todas son security definer, set search_path = public, pg_temp, y comparan el correo de
--  auth.jwt()->>'email' sin distinguir mayúsculas.
--
-- NO TOCA políticas ni RLS (eso es la 033, aparte).
-- Corré esto en "Ancora - Teams". Idempotente. Para quitarlo, ver REVERTIR al final.
-- ============================================================


-- ───────────────────────────────────────
-- PASO 1 — columna
-- ───────────────────────────────────────
alter table public.date_blocks
  add column if not exists team_id uuid references public.teams(id) on delete cascade;


-- ───────────────────────────────────────
-- PASO 2 — índice único nuevo (el viejo se mantiene hasta la 032)
-- ───────────────────────────────────────
create unique index if not exists date_blocks_member_date_team_uniq
  on public.date_blocks (member_id, blocked_date, coalesce(team_id, '00000000-0000-0000-0000-000000000000'::uuid));


-- ───────────────────────────────────────
-- PASO 3 — set_date_blocks: reemplazo atómico (solo service_role)
-- ───────────────────────────────────────
create or replace function public.set_date_blocks(
  p_member_id  uuid,
  p_date       date,
  p_team_ids   uuid[],      -- NULL = todos; '{}' = ninguno (borra); lista = esos equipos
  p_reason     text,
  p_start_date date default null,
  p_end_date   date default null,
  p_service_id uuid default null
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_mine uuid[];
  v_ids  uuid[];
begin
  if p_member_id is null or p_date is null then
    raise exception 'persona y fecha son obligatorias';
  end if;

  -- Equipos ACTIVOS de la persona.
  select coalesce(array_agg(distinct tm.team_id), '{}') into v_mine
    from team_members tm
    join teams t on t.id = tm.team_id and t.archived_at is null
   where tm.member_id = p_member_id;

  if p_team_ids is not null then
    select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(p_team_ids) x;
    -- Solo equipos de la propia persona.
    if exists (
      select 1 from unnest(v_ids) x
       where not exists (select 1 from team_members tm where tm.member_id = p_member_id and tm.team_id = x)
    ) then
      raise exception 'un equipo no pertenece a la persona';
    end if;
  end if;

  delete from date_blocks where member_id = p_member_id and blocked_date = p_date;

  if p_team_ids is not null and cardinality(v_ids) = 0 then
    return; -- conjunto vacío: sin bloqueo
  end if;

  if p_team_ids is null or (cardinality(v_mine) > 0 and v_mine <@ v_ids) then
    -- «todos»: UNA fila NULL (cubre también a los equipos a los que se sume después)
    insert into date_blocks (member_id, blocked_date, reason, start_date, end_date, service_id, team_id)
    values (p_member_id, p_date, nullif(btrim(p_reason), ''), coalesce(p_start_date, p_date), coalesce(p_end_date, p_date), p_service_id, null);
  else
    insert into date_blocks (member_id, blocked_date, reason, start_date, end_date, service_id, team_id)
    select p_member_id, p_date, nullif(btrim(p_reason), ''), coalesce(p_start_date, p_date), coalesce(p_end_date, p_date), p_service_id, x
      from unnest(v_ids) x;
  end if;
end;
$$;

revoke all on function public.set_date_blocks(uuid, date, uuid[], text, date, date, uuid) from public, anon, authenticated;
grant execute on function public.set_date_blocks(uuid, date, uuid[], text, date, date, uuid) to service_role;


-- ───────────────────────────────────────
-- PASO 4 — team_blocks_in_range: lo que el administrador / el líder puede ver
-- ───────────────────────────────────────
create or replace function public.team_blocks_in_range(p_from date, p_to date)
returns table(member_id uuid, team_id uuid, blocked_date date, reason text)
language sql stable security definer set search_path = public, pg_temp
as $$
  with me as (select lower(auth.jwt() ->> 'email') as email)
  -- Cada fila se expande a los equipos ACTIVOS de la persona a los que aplica (NULL = todos),
  -- y solo se devuelve si quien llama administra la organización o lidera ESE equipo.
  select db.member_id, tm.team_id, db.blocked_date, db.reason
    from date_blocks db
    join team_members tm on tm.member_id = db.member_id
    join teams t on t.id = tm.team_id and t.archived_at is null
    cross join me
   where db.blocked_date between p_from and p_to
     and (db.team_id is null or db.team_id = tm.team_id)
     and (is_org_admin(me.email, tm.organization_id) or is_team_leader(me.email, tm.team_id, tm.organization_id))
  union all
  -- Personas sin ningún equipo: solo las ve quien administra su organización (team_id NULL).
  select db.member_id, null::uuid, db.blocked_date, db.reason
    from date_blocks db
    join members m on m.id = db.member_id
    cross join me
   where db.blocked_date between p_from and p_to
     and not exists (select 1 from team_members tm where tm.member_id = db.member_id)
     and is_org_admin(me.email, m.organization_id)
$$;

revoke all on function public.team_blocks_in_range(date, date) from public, anon;
grant execute on function public.team_blocks_in_range(date, date) to authenticated;


-- ───────────────────────────────────────
-- PASO 5 — blocked_others_summary reescrita (misma firma)
-- ───────────────────────────────────────
create or replace function public.blocked_others_summary(
  p_email text, p_organization_id uuid, p_date date, p_own_team_id uuid
)
returns table(team_name text, cnt bigint)
language sql stable security definer set search_path = public, pg_temp
as $$
  with me as (select lower(auth.jwt() ->> 'email') as email),
  -- Equipos que el que llama lidera (de verdad, por el JWT; NO por el parámetro).
  led as (
    select tm.team_id
      from team_members tm
      join members m on m.id = tm.member_id
      cross join me
     where lower(m.email) = me.email
       and tm.organization_id = p_organization_id
       and tm.is_leader = true
  )
  select t.name, count(distinct db.member_id)
    from date_blocks db
    join team_members tm on tm.member_id = db.member_id and tm.organization_id = p_organization_id
    join teams t on t.id = tm.team_id and t.archived_at is null
    cross join me
   where db.blocked_date = p_date
     and (db.team_id is null or db.team_id = tm.team_id)
     and tm.team_id not in (select team_id from led)
     -- quien también es de un equipo que él lidera ya la ve con nombre: no se cuenta aparte
     and not exists (
       select 1 from team_members own
        where own.member_id = db.member_id and own.team_id in (select team_id from led)
     )
     and (is_org_admin(me.email, p_organization_id) or is_any_team_leader(me.email, p_organization_id))
   group by t.name
   order by t.name
$$;

revoke all on function public.blocked_others_summary(text, uuid, date, uuid) from public, anon;
grant execute on function public.blocked_others_summary(text, uuid, date, uuid) to authenticated;


-- ───────────────────────────────────────
-- PASO 6 — VERIFICACIÓN (correr cada bloque por separado)
-- ───────────────────────────────────────

-- 6a · la columna y los dos índices (el viejo debe seguir)
--
-- select column_name, is_nullable from information_schema.columns
--  where table_schema='public' and table_name='date_blocks' and column_name='team_id';
-- select indexname from pg_indexes where tablename='date_blocks' order by 1;
--   → date_blocks_member_date_team_uniq y date_blocks_member_date_uniq

-- 6b · ninguna fila existente cambió de significado (team_id debe ser NULL en todas)
--
-- select count(*) filter (where team_id is not null) as con_equipo, count(*) as total from public.date_blocks;

-- 6c · permisos de las funciones (set_date_blocks: solo service_role)
--
-- select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon,
--        has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
--        has_function_privilege('service_role', p.oid, 'execute') as service_role
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.proname in ('set_date_blocks','team_blocks_in_range','blocked_others_summary')
--  order by 1;
--   → set_date_blocks: false/false/true · las otras dos: false/true/(true)

-- 6d · sin sesión no devuelve nada (en el editor no hay JWT): 0 filas
--
-- select * from public.team_blocks_in_range(current_date, current_date + 365);


-- ───────────────────────────────────────
-- REVERTIR (en este orden). Ojo: borrar team_id pierde los bloqueos parciales; antes se deja
-- UNA fila por persona y fecha (la 032 ya habría borrado el índice viejo, que exige eso).
-- ───────────────────────────────────────
-- drop function if exists public.set_date_blocks(uuid, date, uuid[], text, date, date, uuid);
-- drop function if exists public.team_blocks_in_range(date, date);
-- -- Función original de la 023 (PASO 10):
-- create or replace function blocked_others_summary(
--   p_email text, p_organization_id uuid, p_date date, p_own_team_id uuid
-- )
-- returns table(team_name text, cnt bigint)
-- language sql security definer set search_path = public
-- as $$
--   select t.name, count(*)
--   from date_blocks db
--   join team_members tm on tm.member_id = db.member_id and tm.organization_id = p_organization_id
--   join teams t on t.id = tm.team_id
--   where db.blocked_date = p_date
--     and tm.team_id is distinct from p_own_team_id
--     and (
--       is_org_admin(p_email, p_organization_id)
--       or is_any_team_leader(p_email, p_organization_id)
--     )
--   group by t.name
--   order by t.name;
-- $$;
-- grant execute on function blocked_others_summary(text, uuid, date, uuid) to public;
-- delete from public.date_blocks a using public.date_blocks b
--  where a.member_id = b.member_id and a.blocked_date = b.blocked_date and a.id > b.id;  -- una fila por persona y fecha
-- drop index if exists public.date_blocks_member_date_team_uniq;
-- alter table public.date_blocks drop column if exists team_id;
