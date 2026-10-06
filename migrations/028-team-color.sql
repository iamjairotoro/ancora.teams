-- ============================================================
-- 028 — Color de equipo (punto 43 de docs/PENDIENTES-code.md)
--
-- QUÉ HACE. Agrega teams.color: el NOMBRE del color del equipo, nunca el
-- código hex (el hex vive solo en app/ancora-tokens-v5.css, y la app
-- pinta con data-team="{color}"). Las 7 claves son las de lib/teamColors.ts:
-- cobalto, rosa, violeta, turquesa, cielo, naranja, fucsia.
--
-- RELLENO. A los equipos SIN color (color is null) se les asigna uno en el
-- orden de TEAM_COLOR_ORDER (el mismo orden de lib/teamColors.ts), por
-- antigüedad (created_at, luego id) y dentro de cada organización. Los
-- equipos archivados TAMBIÉN reciben color, pero al final del orden: así no
-- gastan los primeros colores. Los equipos que ya tengan color NO se tocan, y
-- si quedan equipos sin color en una nueva corrida (por ejemplo, creados por
-- una versión vieja de la app entre esta migración y el despliegue), el
-- relleno continúa después de los colores ya usados en esa organización.
-- Con más de 7 equipos, el orden da la vuelta (cobalto otra vez).
--
-- NO TOCA políticas ni RLS: escribir teams.color pasa por la política
-- existente "org admins write teams" (migración 002), igual que renombrar.
--
-- SI CAMBIA LA PALETA (se agrega, quita o renombra un color), hay que
-- modificar TAMBIÉN el check teams_color_check: PASO 1 de abajo.
--
-- ORDEN DE DESPLIEGUE. Corré esto ANTES de desplegar el código que lee
-- teams.color: los select de equipos nombran columnas y fallarían si la
-- columna no existe.
--
-- Corré esto en "Ancora - Teams". Idempotente: add column if not exists,
-- el check se recrea, y el relleno solo mira filas con color null.
-- Para quitarlo, ver la sección REVERTIR al final.
-- ============================================================


-- ───────────────────────────────────────
-- PASO 1 — columna y check
-- ───────────────────────────────────────
alter table public.teams add column if not exists color text;

alter table public.teams drop constraint if exists teams_color_check;
alter table public.teams add constraint teams_color_check
  check (color in ('cobalto','rosa','violeta','turquesa','cielo','naranja','fucsia'));


-- ───────────────────────────────────────
-- PASO 2 — relleno de los equipos sin color
-- ───────────────────────────────────────
with usados as (
  select organization_id, count(*) as n
    from public.teams
   where color is not null
   group by organization_id
),
ordenados as (
  select t.id,
         row_number() over (
           partition by t.organization_id
           order by (t.archived_at is not null), t.created_at, t.id
         ) + coalesce(u.n, 0) as pos
    from public.teams t
    left join usados u on u.organization_id = t.organization_id
   where t.color is null
)
update public.teams t
   set color = (array['cobalto','rosa','violeta','turquesa','cielo','naranja','fucsia'])
               [((o.pos - 1) % 7)::int + 1]
  from ordenados o
 where t.id = o.id;


-- ───────────────────────────────────────
-- PASO 3 — VERIFICACIÓN (correr cada bloque por separado)
-- ───────────────────────────────────────

-- 3a · la columna y el check existen
--
-- select column_name, data_type, is_nullable
--   from information_schema.columns
--  where table_schema = 'public' and table_name = 'teams' and column_name = 'color';
-- select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--  where conrelid = 'public.teams'::regclass and conname = 'teams_color_check';

-- 3b · ningún equipo quedó sin color (sin_color debe dar 0)
--
-- select count(*) filter (where color is null) as sin_color, count(*) as total
--   from public.teams;

-- 3c · cómo quedó el reparto: activos primero por antigüedad, archivados al final
--
-- select organization_id, name, color, archived_at is not null as archivado, created_at
--   from public.teams
--  order by organization_id, (archived_at is not null), created_at, id;

-- 3d · el check rechaza un valor que no es de la paleta: DEBE FALLAR con
--      23514 (check_violation) y el rollback deja todo como estaba
--
-- begin;
--   update public.teams set color = 'rojo'
--    where id = (select id from public.teams order by created_at limit 1);
-- rollback;

-- 3e · idempotencia: volver a correr el PASO 2 no cambia nada
--      (update 0 filas, porque ya no hay equipos con color null)


-- ───────────────────────────────────────
-- REVERTIR — quitar la columna (borra los colores asignados; el resto de
-- teams no se toca)
-- ───────────────────────────────────────
-- alter table public.teams drop constraint if exists teams_color_check;
-- alter table public.teams drop column if exists color;
