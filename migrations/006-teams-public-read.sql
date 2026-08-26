-- ============================================================
-- Fase 6 — lectura pública de `teams`
-- Ya estaba anticipado en el comentario del PASO 6 de 002-teams.sql:
-- "cuando exista UI de miembros regulares viendo el árbol de equipos,
-- se agrega una policy de lectura más permisiva aparte."
--
-- Necesario para que el portal público (músicos sin login) pueda seguir
-- resolviendo nombres de posiciones/equipos. Postgres OR-ea las policies
-- de un mismo comando (SELECT), así que esto se suma a la policy de admin
-- ya existente sin reemplazarla — no toca team_members ni team_admins
-- (quién es líder/miembro de qué sigue protegido, solo se abre el nombre
-- y la estructura del árbol).
--
-- Corré esto en "Ancora - Teams".
-- ============================================================

create policy "public read teams" on teams for select using (true);

-- ── Verificación ── debe listar 2 policies de SELECT para teams
select policyname, cmd from pg_policies where tablename = 'teams' and cmd = 'SELECT';
