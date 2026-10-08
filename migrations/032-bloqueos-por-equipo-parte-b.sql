-- ============================================================
-- 032 — Bloqueos de fecha por equipo, PARTE B (punto 51, versión B)
--
-- CUÁNDO. Después de correr la 031 Y de DESPLEGAR la API/pantalla nuevas
-- (commit 2 del 51). Orden acordado: 031 (A) → desplegar → 032 (B, esta) → 033 (C).
--
-- QUÉ HACE
--  1. Borra el índice único VIEJO date_blocks_member_date_uniq (member_id, blocked_date).
--     Mientras existía, una persona no podía tener dos filas en la misma fecha: bloquear
--     solo ALGUNOS equipos fallaba (500 en /api/portal/bloqueos). Ya no hace falta: el
--     índice nuevo (member_id, blocked_date, coalesce(team_id, uuid cero)) de la 031 impide
--     duplicados por equipo, y ninguna versión desplegada hace
--     `upsert … onConflict member_id,blocked_date` (la API nueva escribe con
--     set_date_blocks y /api/date-blocks se borró en el punto 49).
--  2. team_blocks_in_range (create or replace): la rama de «personas sin equipo» miraba
--     CUALQUIER fila de team_members; ahora mira equipos ACTIVOS. Así una persona cuyos
--     únicos equipos están archivados (o que ya no tiene ninguno) no desaparece de la lista
--     de la administración: aparece con team_id NULL. Todo lo demás de la función queda igual.
--
-- NO TOCA políticas ni RLS (eso es la 033). Idempotente: drop index if exists y
-- create or replace. Para deshacerlo, ver REVERTIR al final (con comprobación previa).
-- ============================================================


-- ───────────────────────────────────────
-- PASO 1 — borrar el índice único viejo
-- ───────────────────────────────────────
drop index if exists public.date_blocks_member_date_uniq;


-- ───────────────────────────────────────
-- PASO 2 — team_blocks_in_range: «personas sin equipo» = sin equipo ACTIVO
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
  -- Personas SIN NINGÚN EQUIPO ACTIVO: solo las ve quien administra su organización (team_id NULL).
  select db.member_id, null::uuid, db.blocked_date, db.reason
    from date_blocks db
    join members m on m.id = db.member_id
    cross join me
   where db.blocked_date between p_from and p_to
     and not exists (
       select 1 from team_members tm
         join teams t on t.id = tm.team_id and t.archived_at is null
        where tm.member_id = db.member_id
     )
     and is_org_admin(me.email, m.organization_id)
$$;

revoke all on function public.team_blocks_in_range(date, date) from public, anon;
grant execute on function public.team_blocks_in_range(date, date) to authenticated;


-- ───────────────────────────────────────
-- PASO 3 — VERIFICACIÓN (correr cada bloque por separado)
-- ───────────────────────────────────────

-- 6a · el índice viejo ya no existe y el nuevo sí
--
-- select indexname from pg_indexes where tablename = 'date_blocks' order by 1;
--   → date_blocks_member_date_team_uniq y date_blocks_pkey (NO date_blocks_member_date_uniq)

-- 6b · ahora se admiten varias filas por persona y fecha (una por equipo); no debe haber duplicados
--      por (persona, fecha, equipo) — el índice nuevo lo garantiza. Cuántas fechas tienen varias filas:
--
-- select count(*) as fechas_con_varias_filas from (
--   select member_id, blocked_date from public.date_blocks
--    group by 1, 2 having count(*) > 1) x;

-- 6c · la función sigue con sus permisos (anon no; authenticated sí) y sin sesión no devuelve nada
--
-- select has_function_privilege('anon', 'public.team_blocks_in_range(date,date)', 'execute') as anon,
--        has_function_privilege('authenticated', 'public.team_blocks_in_range(date,date)', 'execute') as authenticated;
-- select * from public.team_blocks_in_range(current_date, current_date + 365);   -- 0 filas (en el editor no hay JWT)

-- 6d · desde la app: con una persona que bloquee SOLO algunos de sus equipos (calendario del portal)
--      debe guardarse sin error (antes de esta migración daba 500).


-- ───────────────────────────────────────
-- REVERTIR
-- ───────────────────────────────────────
-- (1) Comprobación PREVIA para recrear el índice viejo: NO puede haber dos filas por persona y fecha.
--     Debe devolver 0 filas; si devuelve filas, hay bloqueos parciales (uno por equipo) y recrear
--     el índice FALLARÍA. En ese caso, o se deja el índice sin recrear, o se consolida primero
--     (se pierde la distinción por equipo: queda una sola fila por persona y fecha):
--
-- select member_id, blocked_date, count(*) as filas
--   from public.date_blocks group by 1, 2 having count(*) > 1;
--
-- -- consolidar (SOLO si se decide revertir con bloqueos parciales existentes):
-- delete from public.date_blocks a using public.date_blocks b
--  where a.member_id = b.member_id and a.blocked_date = b.blocked_date and a.id > b.id;
--
-- (2) Recrear el índice viejo:
--
-- create unique index if not exists date_blocks_member_date_uniq on public.date_blocks (member_id, blocked_date);
--
-- (3) Volver a la versión de la 031 de team_blocks_in_range (rama «sin equipo» = sin ninguna fila de team_members):
--
-- create or replace function public.team_blocks_in_range(p_from date, p_to date)
-- returns table(member_id uuid, team_id uuid, blocked_date date, reason text)
-- language sql stable security definer set search_path = public, pg_temp
-- as $$
--   with me as (select lower(auth.jwt() ->> 'email') as email)
--   select db.member_id, tm.team_id, db.blocked_date, db.reason
--     from date_blocks db
--     join team_members tm on tm.member_id = db.member_id
--     join teams t on t.id = tm.team_id and t.archived_at is null
--     cross join me
--    where db.blocked_date between p_from and p_to
--      and (db.team_id is null or db.team_id = tm.team_id)
--      and (is_org_admin(me.email, tm.organization_id) or is_team_leader(me.email, tm.team_id, tm.organization_id))
--   union all
--   select db.member_id, null::uuid, db.blocked_date, db.reason
--     from date_blocks db
--     join members m on m.id = db.member_id
--     cross join me
--    where db.blocked_date between p_from and p_to
--      and not exists (select 1 from team_members tm where tm.member_id = db.member_id)
--      and is_org_admin(me.email, m.organization_id)
-- $$;
