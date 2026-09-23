-- ============================================================
-- Fase 18 — Canciones: normaliza códigos de sección + preferencias
-- de chart por persona
--
-- Bloque 3 de docs/PENDIENTES-code.md (puntos 5-8).
--
-- PASO 1: algunas song_sections quedaron con el código largo en vez del
-- corto (p.ej. "PRE CORO" en vez de "PC") de cuando el flujo de creación
-- todavía no pasaba todo por parseChart(). Se normalizan a los códigos que
-- genera lib/parseChart.ts: IN, V1, V2 (o V a secas si no venía numerada),
-- PC, C, P, INT, TAG, OUT. Es idempotente: un código ya corto no matchea
-- ningún patrón de abajo y queda igual.
--
-- PASO 2: default_arrangement (en songs) y arrangement (en
-- service_song_arrangements) son jsonb con {sectionId,label,repeat} — el
-- pill de arriba muestra `label` tal cual (CancionesPanel.tsx, no se toca
-- SongChart.tsx). Antes guardaba el nombre completo; ahora guarda el
-- código corto. Se reconstruye `label` desde song_sections.code (ya
-- normalizado en el paso 1) para lo que ya estaba guardado.
--
-- PASO 3: members.chart_prefs — preferencias de lectura del chart (vista,
-- tamaño de texto, notación, dos columnas, modo escenario). Por persona,
-- no por canción — igual patrón que members.theme (migración 016): RLS de
-- members ya abierta, no hace falta policy nueva.
--
-- Corré esto en "Ancora - TEST" primero, paso a paso, y después en la
-- base real.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — normaliza song_sections.code
-- ────────────────────────────────────────────────────────────

update song_sections set code = 'PC'
  where code ~* 'pre.?coro' or code ~* 'pre.?chorus';

update song_sections set code = 'C'
  where code ~* '^(coro|chorus)$';

update song_sections set code = 'P'
  where code ~* '^(puente|bridge)$';

update song_sections set code = 'IN'
  where code ~* '^intro$';

update song_sections set code = 'INT'
  where code ~* 'instrumental' or code ~* 'interlud';

update song_sections set code = 'TAG'
  where code ~* '^tag$';

update song_sections set code = 'OUT'
  where code ~* '^(outro|final)$';

update song_sections set code =
  'V' || coalesce(
    (regexp_match(code, '(\d)'))[1],
    (regexp_match(name, '(\d)'))[1],
    ''
  )
  where code ~* '(estrofa|verso|verse)';

-- ── Verificación PASO 1 ── no debería quedar ningún código de más de 3
-- caracteres salvo INT/TAG/OUT.
select code, count(*) from song_sections
where code !~ '^(IN|V\d*|PC|C|P|INT|TAG|OUT)$'
group by code;


-- ────────────────────────────────────────────────────────────
-- PASO 2 — reconstruye el label del arreglo desde el code ya normalizado
-- ────────────────────────────────────────────────────────────

update songs s set default_arrangement = (
  select jsonb_agg(jsonb_set(elem, '{label}', to_jsonb(ss.code)) order by ord)
  from jsonb_array_elements(s.default_arrangement) with ordinality as t(elem, ord)
  join song_sections ss on ss.id = (elem->>'sectionId')::uuid
)
where default_arrangement is not null and jsonb_typeof(default_arrangement) = 'array';

update service_song_arrangements a set arrangement = (
  select jsonb_agg(jsonb_set(elem, '{label}', to_jsonb(ss.code)) order by ord)
  from jsonb_array_elements(a.arrangement) with ordinality as t(elem, ord)
  join song_sections ss on ss.id = (elem->>'sectionId')::uuid
)
where arrangement is not null and jsonb_typeof(arrangement) = 'array';

-- ── Verificación PASO 2 ── cada label debería calzar con un code real.
select s.id, s.nombre, s.default_arrangement from songs s
where default_arrangement is not null limit 20;


-- ────────────────────────────────────────────────────────────
-- PASO 3 — preferencias de chart por persona
-- ────────────────────────────────────────────────────────────

alter table members add column if not exists chart_prefs jsonb;

-- ── Verificación PASO 3 ──
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'members' and column_name = 'chart_prefs';
