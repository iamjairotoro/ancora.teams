-- ============================================================
-- 050c — Punto 50 (cerrar RLS): cerrar el acceso público a `song_section_variants`
--
-- ESTADO ACTUAL (consultado por Claudia en «Ancora - Teams»): RLS activada y política(s) para {public} con
-- condición true: «abierta song_section_variants». Con la llave pública cualquiera puede leer y escribir.
--
-- POR QUÉ ES SEGURO CERRARLA YA: `song_section_variants` (variantes de sección de una canción) se creó en la 017 y la usó una sola vez la migración 022 para reconstruir la letra; ningún código la consulta (en `CancionesPanel.tsx` solo aparece en un comentario).
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
-- select policyname, cmd, roles from pg_policies where schemaname = 'public' and tablename = 'song_section_variants';
-- select count(*) as filas from public.song_section_variants;


-- ───────────────────────────────────────
-- PASO 1 — borrar la(s) política(s) abierta(s)
-- ───────────────────────────────────────
drop policy if exists "abierta song_section_variants" on public.song_section_variants;


-- ───────────────────────────────────────
-- PASO 2 — quitar los permisos de tabla a la llave pública y a las sesiones
-- ───────────────────────────────────────
revoke all on table public.song_section_variants from anon, authenticated;


-- ───────────────────────────────────────
-- PASO 3 — RLS activada, SIN FORCE
-- ───────────────────────────────────────
alter table public.song_section_variants enable row level security;
alter table public.song_section_variants no force row level security;


-- ───────────────────────────────────────
-- PASO 4 — VERIFICACIÓN (correr cada bloque POR SEPARADO; los de lectura/escritura terminan en rollback)
-- ───────────────────────────────────────

-- 4a · ya no hay políticas (debe devolver 0 filas)
--
-- select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'song_section_variants';

-- 4b · RLS activada y NO forzada
--
-- select relrowsecurity, relforcerowsecurity, relowner::regrole from pg_class where oid = 'public.song_section_variants'::regclass;
--   → true | false | postgres

-- 4c · permisos de tabla: NADA para anon ni authenticated (solo service_role y el dueño)
--
-- select grantee, privilege_type from information_schema.role_table_grants
--  where table_schema = 'public' and table_name = 'song_section_variants' and grantee in ('anon','authenticated','service_role')
--  order by 1, 2;
--   → solo filas de service_role

-- 4d · con la llave pública, LEER falla. DEBE FALLAR: ERROR 42501 «permission denied for table song_section_variants»
--
-- begin;
--   set local role anon;
--   select count(*) from public.song_section_variants;
-- rollback;

-- 4e · con la llave pública, ESCRIBIR falla. DEBE FALLAR igual (42501):
--
-- begin;
--   set local role anon;
--   delete from public.song_section_variants where false;
-- rollback;

-- 4f · una sesión de administrador tampoco la lee directamente. DEBE FALLAR (reemplazá el correo por el de un admin real):
--
-- begin;
--   select set_config('request.jwt.claims', '{"role":"authenticated","email":"CORREO_DE_UN_ADMIN@gmail.com"}', true);
--   set local role authenticated;
--   select count(*) from public.song_section_variants;
-- rollback;

-- 4g · lo que SÍ debe seguir funcionando: la app (administración, Home y portal) sin cambios. Probar: abrir /admin, la biblioteca de canciones,
--      y el portal por enlace y por sesión; ninguna debe mostrar errores nuevos.


-- ───────────────────────────────────────
-- REVERTIR (solo si algo se rompió): vuelve al estado anterior, abierto a todo el mundo
-- ───────────────────────────────────────
-- grant all on table public.song_section_variants to anon, authenticated;
-- create policy "abierta song_section_variants" on public.song_section_variants
--   for all using (true) with check (true);
