-- ============================================================
-- Fase 20 — Canciones: cambio de rumbo a "solo letra"
--
-- Se abandona el editor manual de acordes (no funcionó). La vista de
-- canción pasa a mostrar solo letra, con la estructura del PDF oficial de
-- Hillsong: título, título original, créditos, secciones en mayúscula,
-- pie legal (CCLI + copyright).
--
-- NO se toca song_sections / song_section_variants / default_arrangement /
-- service_song_arrangements — esos datos y chords.ts/parseChart.ts quedan
-- INACTIVOS, no borrados. Si se vuelve a los acordes, no hay que
-- reconstruir nada.
--
-- Corré esto en "Ancora - TEST" primero, paso a paso, y después en la
-- base real.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — columnas nuevas en songs (aditivo, nullable)
-- ────────────────────────────────────────────────────────────

-- autor: quién escribió la canción (Joel Houston) — distinto de `artista`,
-- que hoy es quién la toca/publica (Hillsong Worship). El PDF de Hillsong
-- los separa; el esquema no tenía dónde guardar el primero.
-- traductor: equipo o persona que tradujo la letra, cuando aplica.
-- letra: el textarea completo tal como se escribió — "NOMBRE:" seguido de
-- su letra, una línea vacía separa secciones. Se guarda crudo; el parser
-- (lib/parseLyrics.ts) lo interpreta al vuelo para mostrar, nunca se
-- normaliza en la base.
alter table songs
  add column if not exists autor text,
  add column if not exists traductor text,
  add column if not exists letra text;

-- ── Verificación PASO 1 ──
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'songs' and column_name in ('autor','traductor','letra')
order by column_name;
