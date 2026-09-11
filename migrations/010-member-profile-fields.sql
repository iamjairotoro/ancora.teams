-- ============================================================
-- Fase 10 — campos de perfil de persona (dirección, género, estado civil)
--
-- Puramente aditivo: 4 columnas nuevas en members, todas nullable, sin
-- backfill necesario. No afecta ninguna consulta ni componente existente.
--
-- Corré esto en "Ancora - TEST" primero, después en la base real.
-- ============================================================

alter table members add column if not exists direccion text;
alter table members add column if not exists genero text;
alter table members add column if not exists estado_civil text;
alter table members add column if not exists fecha_aniversario date;

-- ── Verificación ── deben aparecer las 4 columnas nuevas, todas nullable.
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'members'
  and column_name in ('direccion', 'genero', 'estado_civil', 'fecha_aniversario');
