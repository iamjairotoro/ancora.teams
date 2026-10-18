-- ============================================================
-- 050d — Punto 50 (cerrar RLS): `members` — quién puede leer y escribir a las personas
--
-- ⛔ REDACTADA, SIN APLICAR. Se aplica el MISMO DÍA que el paso 0b (llevar `dev` a `main`), nunca antes: el portal de producción (`main`)
--    todavía lee y escribe `members` con la llave pública desde el navegador (portal/[token], by-member, member/[id], portal) y dejaría
--    de funcionar. Tampoco antes del paso 0a: varias rutas del servidor leen `members` con la llave pública (chat-notify, rsvp-notify, send-invites,
--    send-ensayo-invites, reassignment-notify, availability, member-by-id, reminder); pasan a la llave de servicio en 0a.
--
-- POR QUÉ ES EL PRIMER CIERRE (hallazgo de la revisión de octubre 2026). Todas las funciones de rol (is_org_admin, is_org_owner, is_team_admin,
-- is_team_leader, is_any_team_leader, has_library_access, can_manage_library_files) deciden «quién es quién» cruzando members.email con el
-- correo de la sesión de Google, y la política de Storage «miembros leen adjuntos de canciones» (021) lee members.organization_id. Con
-- `members` abierta a la llave pública:
--   · cualquier cuenta de Google puede INSERTAR su propio correo (organization_id vale …0001 por defecto) y queda como «miembro» de la
--     organización: lee todos los adjuntos de canciones y entra al portal por sesión (chat general incluido);
--   · cualquiera puede insertar un correo REPETIDO: el login lo trata como «ambiguo» y bloquea a esa persona (también a un administrador);
--   · cualquiera puede borrar a una persona (organization_members borra en cascada con ella; solo lo frenan team_admins y team_members).
--   Cambiar el correo de una fila existente ya lo frena el disparador de la 027 (no se toca).
--
-- LAS TRES REGLAS (decididas por Claudia)
--   (a) Altas, bajas y cambios: SOLO administradores y owners de la organización de esa persona (is_org_admin).
--   (b) Cada persona lee SU PROPIA fila por el correo de la sesión (lo necesitan el login, el portal por sesión y el control de acceso).
--   (c) Administradores Y líderes de la organización leen las demás filas (Home, pantallas de líderes). Los líderes NO escriben.
--   Anon (sin sesión): nada. service_role y el dueño (postgres) no se tocan: el servidor y el editor SQL siguen igual.
--
-- VERIFICADO EN EL CÓDIGO (dev):
--   · Alta y baja de personas: components/TeamPanel.tsx (insert, delete), components/TeamsAdminPanel.tsx (insert) y la edición en
--     app/admin/page.tsx (update). Esos paneles viven en PersonasPanel, que SOLO monta /admin, y /admin exige is_org_admin para entrar:
--     un líder no llega a ellos. La regla (a) no rompe nada ahí. NINGUNA pantalla de líder inserta, borra ni edita personas desde el
--     navegador (/home solo hace members.select('*')), así que no hace falta una ruta del servidor para los líderes.
--   · LO ÚNICO que un NO administrador escribe en `members` desde el navegador, sobre SU PROPIA fila, es lib/useDarkMode.ts (update de `theme`,
--     en /home y /admin) y components/canciones/CancionesPanel.tsx (update de `chart_prefs`). Con la regla (a), un líder que no sea
--     administrador dejaría de GUARDAR su tema y sus preferencias de partitura (falla en silencio: ambos hacen `.then(() => {})`).
--     NO se abre un update «de mi propia fila» en la política: dejaría cambiar organization_id, nombre, etc. (y el disparador de la 027
--     solo cuida el correo). Se resuelve con una ruta de servidor que mande SOLO esos dos campos (como /api/portal/preferencias en el portal);
--     va en el plan del paso 0a/0b. Hasta entonces, esa pérdida es el único efecto visible conocido de esta migración.
--   · Lecturas con el navegador y la sesión de Google (findMemberByEmail en el login y en AuthGate; /admin; /home; los embeds
--     `member:members(...)` de las asignaciones): la regla (b) cubre la propia fila; la (a) y la (c) cubren al resto según el rol.
--
-- ANTES DE APLICAR (lectura, en «Ancora - Teams»; ver migrations/diagnostico-050-b.sql):
--   · bloque 16: correos repetidos = 0 (si no, esas personas no podrán entrar al portal por sesión);
--   · bloque 17: administradores sin protección contra borrado = 0 o conocido;
--   · bloque 15: proveedores de Auth (solo «google»).
--
-- REVERSIBLE: ver REVERTIR al final (vuelve a abrir `members` a todo el mundo).
-- Corré esto en «Ancora - Teams». Idempotente.
-- ============================================================


-- ───────────────────────────────────────
-- PASO 0 — antes (solo lectura): qué hay ahora
-- ───────────────────────────────────────
-- select policyname, cmd, roles from pg_policies where schemaname = 'public' and tablename = 'members';
-- select count(*) as personas from public.members;


-- ───────────────────────────────────────
-- PASO 1 — borrar las dos políticas abiertas
-- ───────────────────────────────────────
drop policy if exists "public read members"  on public.members;
drop policy if exists "public write members" on public.members;


-- ───────────────────────────────────────
-- PASO 2 — las tres reglas (solo para sesiones: `authenticated`; anon no tiene ninguna)
-- ───────────────────────────────────────
-- (a) administradores y owners de la organización de esa persona: leen, insertan, cambian y borran
drop policy if exists "org admins write members" on public.members;
create policy "org admins write members" on public.members
  for all to authenticated
  using      (is_org_admin(auth.jwt()->>'email', organization_id))
  with check (is_org_admin(auth.jwt()->>'email', organization_id));

-- (b) cada persona lee SU fila (el correo de la sesión, sin distinguir mayúsculas)
drop policy if exists "personas leen su propia fila" on public.members;
create policy "personas leen su propia fila" on public.members
  for select to authenticated
  using (lower(email) = lower(auth.jwt()->>'email'));

-- (c) los líderes de la organización leen las demás filas (NO escriben)
drop policy if exists "lideres leen members" on public.members;
create policy "lideres leen members" on public.members
  for select to authenticated
  using (is_any_team_leader(auth.jwt()->>'email', organization_id));


-- ───────────────────────────────────────
-- PASO 3 — la llave pública (sin sesión) pierde todo permiso de tabla; las sesiones lo conservan (RLS decide)
-- ───────────────────────────────────────
revoke all on table public.members from anon;
alter table public.members enable row level security;
alter table public.members no force row level security;


-- ───────────────────────────────────────
-- PASO 4 — VERIFICACIÓN (correr cada bloque POR SEPARADO; todos terminan en rollback)
-- Reemplazá CORREO_ADMIN, CORREO_LIDER y CORREO_PERSONA por correos reales: un administrador, un líder que NO sea
-- administrador y una persona que no sea ni líder ni administrador.
-- ───────────────────────────────────────

-- 4a · quedan 3 políticas (debe devolver 3 filas)
--
-- select policyname, cmd, roles from pg_policies where schemaname = 'public' and tablename = 'members' order by policyname;

-- 4b · con la llave pública (sin sesión): LEER falla. DEBE FALLAR: ERROR 42501 «permission denied for table members»
--
-- begin;
--   set local role anon;
--   select count(*) from public.members;
-- rollback;

-- 4c · con la llave pública: INSERTAR falla. DEBE FALLAR (42501):
--
-- begin;
--   set local role anon;
--   insert into public.members (nombre, email) values ('Intrusa', 'intrusa@example.com');
-- rollback;

-- 4d · una sesión de Google CUALQUIERA (un correo que no está en members) no ve a nadie y no puede inscribirse.
--      Lectura: debe devolver 0. Inserción: DEBE FALLAR con «new row violates row-level security policy» (42501):
--
-- begin;
--   select set_config('request.jwt.claims', '{"role":"authenticated","email":"cuenta.cualquiera@gmail.com"}', true);
--   set local role authenticated;
--   select count(*) as filas_visibles from public.members;
-- rollback;
--
-- begin;
--   select set_config('request.jwt.claims', '{"role":"authenticated","email":"cuenta.cualquiera@gmail.com"}', true);
--   set local role authenticated;
--   insert into public.members (nombre, email) values ('Intrusa', 'cuenta.cualquiera@gmail.com');
-- rollback;

-- 4e · una persona común ve SOLO su fila (debe devolver 1):
--
-- begin;
--   select set_config('request.jwt.claims', '{"role":"authenticated","email":"CORREO_PERSONA"}', true);
--   set local role authenticated;
--   select count(*) as filas_visibles from public.members;
-- rollback;

-- 4f · un líder (que no es admin) ve a TODAS las personas de la organización y NO puede escribir:
--      lectura = el total real de members; el update y el delete NO deben cambiar ninguna fila (0 filas afectadas)
--
-- begin;
--   select set_config('request.jwt.claims', '{"role":"authenticated","email":"CORREO_LIDER"}', true);
--   set local role authenticated;
--   select count(*) as filas_visibles from public.members;
--   update public.members set telefono = telefono where true;
--   delete from public.members where false;
-- rollback;
--   → compará filas_visibles con select count(*) from public.members (como postgres, fuera del bloque)

-- 4g · un administrador ve y escribe todo (debe devolver el total; el update afecta todas las filas y se descarta con rollback):
--
-- begin;
--   select set_config('request.jwt.claims', '{"role":"authenticated","email":"CORREO_ADMIN"}', true);
--   set local role authenticated;
--   select count(*) as filas_visibles from public.members;
--   update public.members set telefono = telefono where true;
-- rollback;

-- 4h · el disparador de la 027 SIGUE vigente: un administrador puede cambiar un correo, un líder no (el líder ya no llega a la fila
--      por la política; este bloque solo comprueba que el disparador existe y está activo):
--
-- select tgname, tgenabled from pg_trigger where tgrelid = 'public.members'::regclass and not tgisinternal;

-- 4i · la app, sin cambios para quien administra o lidera: abrir /admin (Personas: alta, edición, baja), /home (Equipos) y el portal por
--      sesión de una persona común (Perfil: nombre, teléfono y fecha). Un líder que no es admin NO podrá guardar el tema ni las
--      preferencias de partitura hasta que exista la ruta del servidor (ver arriba).


-- ───────────────────────────────────────
-- REVERTIR (solo si algo se rompió): vuelve al estado anterior, abierto a todo el mundo
-- ───────────────────────────────────────
-- drop policy if exists "org admins write members"       on public.members;
-- drop policy if exists "personas leen su propia fila"   on public.members;
-- drop policy if exists "lideres leen members"           on public.members;
-- grant all on table public.members to anon, authenticated;
-- create policy "public read members"  on public.members for select using (true);
-- create policy "public write members" on public.members for all using (true);
