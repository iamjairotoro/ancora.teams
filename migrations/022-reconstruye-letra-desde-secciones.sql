-- ============================================================
-- Fase 20 (cont.) — reconstruye songs.letra desde song_sections
--
-- Las canciones cargadas antes de la fase 20 tienen su contenido en
-- song_sections/song_section_variants (el modo acordes, ahora inactivo)
-- y songs.letra —la columna nueva que lee LyricSheet.tsx— vacía. Sin
-- esto, LyricSheet las muestra como "Todavía no se cargó la letra".
--
-- Reconstruye el texto en el MISMO formato que espera lib/parseLyrics.ts:
-- por cada sección, su nombre en MAYÚSCULA terminado en dos puntos,
-- después sus líneas de letra, y una línea vacía entre una sección y la
-- siguiente. Los acordes de cada segmento se descartan — solo se usa
-- `segment.text`. Las líneas kind='bars' (puro cifrado, sin letra) se
-- saltan enteras: no hay letra que sacarles.
--
-- NO TOCA song_sections/song_section_variants — de ahí se LEE, nada se
-- borra ni se modifica. Sigue disponible intacto si se retoma el modo
-- acordes.
--
-- Idempotente: solo procesa canciones con `letra` vacía o null — una
-- letra que la persona ya haya escrito a mano después de la fase 20
-- nunca se pisa, sin importar cuántas veces se corra esto.
--
-- Orden sugerido: PASO 0 (solo lectura, ver cuántas quedarían afectadas)
-- → PASO 1 (la reconstrucción) → PASO 2 (revisar a ojo + conteo final).
-- Corré los tres en "Ancora - TEST" primero, y revisá con el PASO 2 que
-- el texto reconstruido se vea bien en un par de canciones conocidas
-- antes de correr PASO 1 en la base real.
--
-- NO APLICADA: el PASO 0 dio 0 el 2026-09-30. 1 canción con secciones y
-- letra ya cargada, nada que reconstruir.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 0 — SOLO LECTURA: cuántas canciones quedarían afectadas.
-- No actualiza nada. Replica exactamente la misma regla que el PASO 1
-- (misma variante elegida por sección, mismo descarte de líneas 'bars',
-- mismo criterio de "quedó algo de letra para esa canción") para que el
-- número sea real y no una aproximación.
-- ────────────────────────────────────────────────────────────

with elegibles as (
  select s.id
  from songs s
  where coalesce(s.letra, '') = ''
    and exists (select 1 from song_sections ss where ss.song_id = s.id)
),
variante_por_seccion as (
  -- la variante default de la sección; si ninguna está marcada, la
  -- primera por id (mismo criterio de respaldo que ya usa la app y que
  -- usa el PASO 1 más abajo).
  select distinct on (ss.id)
    ss.id as section_id, ss.song_id, v.lines
  from song_sections ss
  join song_section_variants v on v.section_id = ss.id
  where ss.song_id in (select id from elegibles)
  order by ss.id, v.is_default desc, v.id
),
texto_por_seccion as (
  select
    vps.section_id, vps.song_id,
    string_agg(
      (select string_agg(coalesce(seg->>'text', ''), '')
       from jsonb_array_elements(coalesce(linea->'segments', '[]'::jsonb)) seg),
      E'\n'
    ) as cuerpo
  from variante_por_seccion vps, jsonb_array_elements(vps.lines) as linea
  where linea->>'kind' = 'lyric'
  group by vps.section_id, vps.song_id
)
select count(distinct song_id) as canciones_afectadas
from texto_por_seccion
where coalesce(cuerpo, '') <> '';


-- ────────────────────────────────────────────────────────────
-- PASO 1 — reconstrucción
-- ────────────────────────────────────────────────────────────

do $$
declare
  song_row record;
  section_row record;
  variant_lines jsonb;
  line_item jsonb;
  seg_item jsonb;
  section_body text;
  song_body text;
  line_text text;
begin
  for song_row in
    select id from songs
    where coalesce(letra, '') = ''
      and exists (select 1 from song_sections ss where ss.song_id = songs.id)
  loop
    song_body := '';

    for section_row in
      select ss.id, coalesce(ss.name, '') as name
      from song_sections ss
      where ss.song_id = song_row.id
      order by ss.sort_order
    loop
      -- la variante default de la sección; si ninguna está marcada, la
      -- primera por id (mismo criterio de respaldo que ya usa la app).
      select v.lines into variant_lines
      from song_section_variants v
      where v.section_id = section_row.id
      order by v.is_default desc, v.id
      limit 1;

      if variant_lines is null then
        continue; -- sección sin ninguna variante: no hay letra que sacar
      end if;

      section_body := '';
      -- select * (no un nombre de columna puntual) a propósito: no hace
      -- falta saber cómo nombra Postgres la columna de salida de
      -- jsonb_array_elements — el target escalar del FOR toma la única
      -- columna que haya, sea cual sea su nombre.
      for line_item in select * from jsonb_array_elements(variant_lines)
      loop
        if line_item->>'kind' = 'lyric' then
          line_text := '';
          for seg_item in select * from jsonb_array_elements(coalesce(line_item->'segments', '[]'::jsonb))
          loop
            line_text := line_text || coalesce(seg_item->>'text', '');
          end loop;
          section_body := section_body || case when section_body = '' then '' else E'\n' end || line_text;
        end if;
        -- kind = 'bars': puro cifrado sin letra, se descarta.
      end loop;

      if section_body <> '' then
        song_body := song_body
          || case when song_body = '' then '' else E'\n\n' end
          || upper(section_row.name) || ':' || E'\n' || section_body;
      end if;
    end loop;

    if song_body <> '' then
      update songs set letra = song_body where id = song_row.id;
    end if;
  end loop;
end $$;


-- ────────────────────────────────────────────────────────────
-- PASO 2 — verificación: mirar el texto reconstruido a ojo antes de
-- confiar en él. Ajustá el nombre si hace falta para revisar otras.
-- ────────────────────────────────────────────────────────────

select nombre, letra from songs
where nombre ilike '%behold%' or nombre ilike '%king jesus%'
order by nombre;

-- cuántas quedaron reconstruidas vs. cuántas seguían sin song_sections
-- (esas necesitan cargarse a mano, no había de dónde sacarlas)
select
  count(*) filter (where letra is not null and letra <> '') as con_letra,
  count(*) filter (where (letra is null or letra = '') and archived_at is null) as sin_letra_activas
from songs;
