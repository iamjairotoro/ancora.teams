-- ============================================================
-- 050a — Punto 50 (cerrar RLS): cerrar el acceso público a `admin_emails`
--
-- ESTADO ACTUAL (consultado por Claudia en «Ancora - Teams»): RLS activada y política(s) para {public} con
-- condición true: «public read admin_emails», «public write admin_emails». Con la llave pública cualquiera puede leer y escribir.
--
-- POR QUÉ ES SEGURO CERRARLA YA: `admin_emails` es la lista de administradores LEGADA. Desde la migración 023, `is_org_admin()` y todas las funciones de rol leen `organization_members`, no esta tabla; en el código solo queda como comentario («reemplaza a la vieja admin_emails»). Escribirla ya no da ningún permiso.
--   Verificado con git grep en `dev` y en `origin/main` (código .ts/.tsx) y en los .sql del repo: ninguna pantalla, ruta, función,
--   disparador ni política la lee o la escribe. Las migraciones que la mencionan son de una sola vez (ya corrieron).
--
-- QUÉ HACE
--  1. Borra la(s) política(s) abierta(s).
--  2. Revoca TODOS los permisos de tabla a anon y authenticated (la API pública responde «permission denied», no «0 filas»: un lector olvidado
--     falla a la vista). Mismo patrón que 029 y 033.
--  3. RLS queda ACTIVADA y SIN FORCE: el dueño (postgres, el editor SQL) y service_role siguen entrando; no se tocan.
--
-- REVERSIBLE: ver REVERTIR al final (vuelve a abrir la tabla a todo el mundo).
-- Corré esto en «Ancora - Teams». Idempotente.
-- ============================================================


-- ───────────────────────────────────────
-- PASO 0 — antes (solo lectura): qué hay ahora
-- ───────────────────────────────────────
-- select policyname, cmd, roles from pg_policies where schemaname = 'public' and tablename = 'admin_emails';
-- select count(*) as filas from public.admin_emails;


-- ───────────────────────────────────────
-- PASO 1 — borrar la(s) política(s) abierta(s)
-- ───────────────────────────────────────
drop policy if exists "public read admin_emails" on public.admin_emails;
drop policy if exists "public write admin_emails" on public.admin_emails;


-- ───────────────────────────────────────
-- PASO 2 — quitar los permisos de tabla a la llave pública y a las sesiones
-- ───────────────────────────────────────
revoke all on table public.admin_emails from anon, authenticated;


-- ───────────────────────────────────────
-- PASO 3 — RLS activada, SIN FORCE
-- ───────────────────────────────────────
alter table public.admin_emails enable row level security;
alter table public.admin_emails no force row level security;


-- ───────────────────────────────────────
-- PASO 4 — VERIFICACIÓN (correr cada bloque POR SEPARADO; los de lectura/escritura terminan en rollback)
-- ───────────────────────────────────────

-- 4a · ya no hay políticas (debe devolver 0 filas)
--
-- select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'admin_emails';

-- 4b · RLS activada y NO forzada
--
-- select relrowsecurity, relforcerowsecurity, relowner::regrole from pg_class where oid = 'public.admin_emails'::regclass;
--   → true | false | postgres

-- 4c · permisos de tabla: NADA para anon ni authenticated (solo service_role y el dueño)
--
-- select grantee, privilege_type from information_schema.role_table_grants
--  where table_schema = 'public' and table_name = 'admin_emails' and grantee in ('anon','authenticated','service_role')
--  order by 1, 2;
--   → solo filas de service_role

-- 4d · con la llave pública, LEER falla. DEBE FALLAR: ERROR 42501 «permission denied for table admin_emails»
--
-- begin;
--   set local role anon;
--   select count(*) from public.admin_emails;
-- rollback;

-- 4e · con la llave pública, ESCRIBIR falla. DEBE FALLAR igual (42501):
--
-- begin;
--   set local role anon;
--   delete from public.admin_emails where false;
-- rollback;

-- 4f · una sesión de administrador tampoco la lee directamente. DEBE FALLAR (reemplazá el correo por el de un admin real):
--
-- begin;
--   select set_config('request.jwt.claims', '{"role":"authenticated","email":"CORREO_DE_UN_ADMIN@gmail.com"}', true);
--   set local role authenticated;
--   select count(*) from public.admin_emails;
-- rollback;

-- 4g · lo que SÍ debe seguir funcionando: la app (administración, Home y portal) sin cambios. Probar: abrir /admin, la biblioteca de canciones,
--      y el portal por enlace y por sesión; ninguna debe mostrar errores nuevos.


-- ───────────────────────────────────────
-- REVERTIR (solo si algo se rompió): vuelve al estado anterior, abierto a todo el mundo
-- ───────────────────────────────────────
-- grant all on table public.admin_emails to anon, authenticated;
-- create policy "public read admin_emails" on public.admin_emails
--   for select using (true);
-- create policy "public write admin_emails" on public.admin_emails
--   for all using (true);
