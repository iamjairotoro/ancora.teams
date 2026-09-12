-- ============================================================
-- Fase 16 — preferencia de tema (claro/oscuro) por persona
--
-- Primera pasada del rediseño visual: se guarda en members.theme en vez de
-- solo localStorage, para que la misma persona vea lo mismo en el teléfono
-- y en el computador. Puramente aditiva, nullable (null = automático, sigue
-- la preferencia del sistema operativo). members ya tiene RLS abierta para
-- self-service (mismo patrón que ya usan avatar_url / instalado_pwa_at /
-- push-subscribe), así que no hace falta ninguna policy nueva.
--
-- Corré esto en "Ancora - TEST" primero, después en la base real.
-- ============================================================

alter table members add column if not exists theme text check (theme in ('light','dark'));

-- ── Verificación ── debe aparecer la columna nueva, nullable, con el check.
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'members' and column_name = 'theme';

select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'members'::regclass and conname like '%theme%';
