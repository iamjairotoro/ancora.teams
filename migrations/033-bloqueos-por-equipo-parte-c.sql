-- ============================================================
-- 033 — Bloqueos de fecha por equipo, PARTE C: cerrar el acceso público a date_blocks
--        (punto 51, versión B; adelanta la parte de date_blocks del punto 50)
--
-- ✅ APLICADA y VERIFICADA en «Ancora - Teams» (octubre 2026): 0 políticas en date_blocks, RLS activada
--    sin FORCE, permisos de tabla solo para postgres y service_role, y la llave pública recibe
--    «permission denied»; Home, Disponibilidad, aviso al asignar, portal y respaldo comprobados.
--    Orden que se siguió: 031 (A) → desplegar → 032 (B) → 033 (C, esta).
--
-- POR QUÉ. Las reglas de privacidad del 51 (un líder ve a una persona como no disponible SOLO
-- si el bloqueo aplica a SU equipo; nunca puede deducir en qué otros equipos bloqueó; el motivo
-- lo ven la persona, la administración y los líderes de los equipos a los que aplica) viven en
-- funciones de la base. Mientras `date_blocks` siga legible con la llave pública, cualquiera
-- puede leer TODAS las filas (con equipo y motivo) saltándose esas funciones.
--
-- ESTADO ACTUAL (consultado en «Ancora - Teams»): dos políticas, ambas para {public} con
-- condición true: «public read date_blocks» (SELECT) y «public write date_blocks» (ALL); RLS
-- activada, NO forzada; dueño postgres; anon y authenticated con TODOS los permisos de tabla.
--
-- QUÉ HACE
--  1. Borra esas dos políticas.
--  2. Revoca TODOS los permisos de tabla a anon y authenticated (así la API pública responde
--     «permission denied for table date_blocks», no «0 filas»: un lector olvidado falla a la vista).
--  3. RLS queda ACTIVADA y SIN FORCE: el dueño (postgres) la sigue saltando, que es lo que hacen
--     las funciones security definer (set_date_blocks, team_blocks_in_range, blocked_others_summary).
--     service_role conserva sus permisos (NO se toca): lo usa /api/portal/bloqueos.
--
-- QUIÉN SIGUE LEYENDO/ESCRIBIENDO date_blocks DESPUÉS (verificado con grep del repo y consultas a la base):
--   · app/api/portal/bloqueos/route.ts        → llave de servicio (select/delete) y set_date_blocks().
--   · team_blocks_in_range / blocked_others_summary → Home, administración (aviso al asignar,
--                                                AvailabilityPanel), con la sesión del usuario.
--   · scripts/backup.js                       → llave de servicio (commit previo a esta migración).
--   · scripts/seed-test-db.js (escribe date_blocks con la anon key) FALLARÁ: no se ejecuta salvo
--     pedido expreso, y el punto 50 lo reemplaza.
--   Ninguna otra función, política o vista de la base menciona date_blocks.
--
-- REVERSIBLE: ver REVERTIR al final (vuelve a abrir la tabla a todo el mundo).
-- Corré esto en "Ancora - Teams". Idempotente.
-- ============================================================


-- ───────────────────────────────────────
-- PASO 1 — borrar las dos políticas abiertas
-- ───────────────────────────────────────
drop policy if exists "public read date_blocks"  on public.date_blocks;
drop policy if exists "public write date_blocks" on public.date_blocks;


-- ───────────────────────────────────────
-- PASO 2 — quitar los permisos de tabla a la llave pública y a las sesiones
-- ───────────────────────────────────────
revoke all on table public.date_blocks from anon, authenticated;


-- ───────────────────────────────────────
-- PASO 3 — RLS activada, SIN FORCE (el dueño la sigue saltando; service_role no se toca)
-- ───────────────────────────────────────
alter table public.date_blocks enable row level security;
alter table public.date_blocks no force row level security;


-- ───────────────────────────────────────
-- PASO 4 — VERIFICACIÓN (correr cada bloque POR SEPARADO; los de lectura/escritura terminan en rollback)
-- ───────────────────────────────────────

-- 4a · ya no hay políticas (debe devolver 0 filas)
--
-- select policyname, cmd from pg_policies where tablename = 'date_blocks';

-- 4b · RLS activada y NO forzada; dueño postgres
--
-- select relrowsecurity, relforcerowsecurity, relowner::regrole from pg_class where oid = 'public.date_blocks'::regclass;
--   → true | false | postgres

-- 4c · permisos de tabla: solo service_role (y el dueño); NADA para anon ni authenticated
--
-- select grantee, privilege_type from information_schema.role_table_grants
--  where table_schema = 'public' and table_name = 'date_blocks' and grantee in ('anon','authenticated','service_role')
--  order by 1, 2;
--   → solo filas de service_role

-- 4d · con la llave pública, LEER falla. DEBE FALLAR: ERROR 42501 «permission denied for table date_blocks»
--      (si en cambio devolviera 0 filas, también está cerrado, pero lo esperado es el error)
--
-- begin;
--   set local role anon;
--   select count(*) from public.date_blocks;
-- rollback;

-- 4e · con la llave pública, ESCRIBIR falla. DEBE FALLAR: ERROR 42501 «permission denied for table date_blocks»
--
-- begin;
--   set local role anon;
--   insert into public.date_blocks (member_id, blocked_date)
--   values ((select id from public.members limit 1), current_date + 9000);
-- rollback;

-- 4f · una sesión (authenticated) tampoco lee la tabla directamente. DEBE FALLAR igual
--      (reemplazá el correo por el de un admin real):
--
-- begin;
--   select set_config('request.jwt.claims', '{"role":"authenticated","email":"CORREO_DE_UN_ADMIN@gmail.com"}', true);
--   set local role authenticated;
--   select count(*) from public.date_blocks;
-- rollback;

-- 4g · las funciones SIGUEN devolviendo datos con una sesión real (DEBEN FUNCIONAR, sin error;
--      el conteo puede ser 0 si no hay bloqueos en el rango). Reemplazá el correo por el de un admin real:
--
-- begin;
--   select set_config('request.jwt.claims', '{"role":"authenticated","email":"CORREO_DE_UN_ADMIN@gmail.com"}', true);
--   set local role authenticated;
--   select count(*) as filas_visibles_para_el_admin from public.team_blocks_in_range(current_date - 400, current_date + 800);
--   select * from public.blocked_others_summary('', '00000000-0000-0000-0000-000000000001', current_date, null);
-- rollback;
--   → compará filas_visibles_para_el_admin con el total real (como postgres, fuera de este bloque):
--     select count(*) from public.date_blocks;   (el admin ve una fila por equipo ACTIVO de cada persona)

-- 4h · set_date_blocks sigue funcionando con la llave de servicio (se descarta con rollback):
--
-- begin;
--   set local role service_role;
--   select public.set_date_blocks((select id from public.members limit 1), current_date + 9000, null, 'prueba 033');
--   select count(*) as filas_de_prueba from public.date_blocks where reason = 'prueba 033';   -- 1
-- rollback;

-- 4i · DESDE LA APP, con sesión real (lo prueba una persona, no el SQL):
--      · Portal con enlace de acceso: abrir «Mi disponibilidad», bloquear una fecha, cambiar equipos, quitar.
--      · Home como admin y como líder: marcas del mes, panel del día, conteo de otros equipos.
--      · Administración: pestaña Disponibilidad y, en Servicio, el aviso al asignar.
--      · Con la llave pública (navegador o curl) GET /rest/v1/date_blocks debe dar 401/403, nunca filas.
--      · node scripts/backup.js debe decir «llave de servicio: sí» y respaldar date_blocks con sus filas.


-- ───────────────────────────────────────
-- REVERTIR — vuelve a abrir date_blocks a todo el mundo (el estado de ANTES de esta migración).
-- Úsalo solo si algún lector olvidado quedó roto y hace falta tiempo para arreglarlo; mientras tanto
-- las reglas de privacidad del 51 NO se cumplen (cualquiera con la llave pública lee todas las filas).
-- ───────────────────────────────────────
-- create policy "public read date_blocks"  on public.date_blocks for select using (true);
-- create policy "public write date_blocks" on public.date_blocks for all    using (true);
-- grant all on table public.date_blocks to anon, authenticated;
