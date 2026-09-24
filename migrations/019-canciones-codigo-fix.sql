-- ============================================================
-- Fase 19 — Canciones: corrige códigos y nombres de sección concatenados
-- (p.ej. code "CCORO" / name "Coro CORO" en vez de code "C" / name "Coro").
--
-- DIAGNÓSTICO CONFIRMADO (con datos reales de song_sections): el dato ya
-- estaba así ANTES de correr la 018 — code="CCORO", name="Coro CORO".
-- La 018 usa regex anclado (`code ~* '^(coro|chorus)$'`), que exige que
-- TODO el string sea exactamente "coro"; "CCORO" no matchea por la C de
-- más al principio, así que la 018 pasó de largo sin tocar estas filas.
-- No fue la 018 la que concatenó nada.
--
-- El origen más probable es el mismo del punto 5 de PENDIENTES-code.md:
-- esta canción ("All Hail King Jesus") se guardó sin pasar por
-- `parseChart()`, y el flujo de creación de entonces generó code/name ya
-- pegados con el nombre y el código juntos.
--
-- Esta corrección no depende de conocer el mecanismo exacto: extrae el
-- prefijo de código válido de lo que haya quedado guardado (en
-- song_sections.code y en los `label` de los arreglos), descarta el resto
-- pegado atrás, y repone `name` en español desde el code ya corregido —
-- pero SOLO en las filas que tenían un code inválido (las mismas que
-- confirmamos rotas), nunca en nombres que ya estaban bien.
--
-- Corré primero el PASO 0 (solo lectura) en "Ancora - TEST" y confirmá que
-- el patrón de datos es el esperado antes de seguir con el PASO 1 en
-- adelante. Es idempotente: correrla dos veces no vuelve a tocar nada.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 0 — SOLO LECTURA. Correr esto primero y revisar el resultado
-- antes de aplicar nada. Muestra qué hay realmente guardado.
-- ────────────────────────────────────────────────────────────

-- 0a. códigos que no son ya un código corto válido
select id, song_id, code, name
from song_sections
where code !~ '^(IN|V\d*|PC|C|P|INT|TAG|OUT)$'
order by song_id, sort_order;

-- 0b. labels de arreglo (default_arrangement) que no son un código corto válido
select s.id, s.nombre, elem->>'sectionId' as section_id, elem->>'label' as label
from songs s, jsonb_array_elements(s.default_arrangement) elem
where s.default_arrangement is not null
  and (elem->>'label') !~ '^(IN|V\d*|PC|C|P|INT|TAG|OUT)$';

-- 0c. lo mismo en service_song_arrangements
select a.service_item_id, elem->>'sectionId' as section_id, elem->>'label' as label
from service_song_arrangements a, jsonb_array_elements(a.arrangement) elem
where a.arrangement is not null
  and (elem->>'label') !~ '^(IN|V\d*|PC|C|P|INT|TAG|OUT)$';


-- ────────────────────────────────────────────────────────────
-- PASO 1 — corrige song_sections.code Y name juntos, en la misma
-- sentencia, para que el name se derive del code VIEJO (el corrupto) y no
-- del que se acaba de pisar. El orden de las ramas importa: los prefijos
-- más largos van primero (INT antes que IN, PC/V\d antes que su forma
-- corta) para no cortar de más.
--
-- El name se repone SOLO en las filas con code inválido — nunca toca una
-- fila cuyo code ya era correcto, así que no pisa nombres personalizados
-- de secciones que nunca estuvieron rotas.
-- ────────────────────────────────────────────────────────────

update song_sections
set
  code = case
    when code ~ '^INT' then 'INT'
    when code ~ '^TAG' then 'TAG'
    when code ~ '^OUT' then 'OUT'
    when code ~ '^PC'  then 'PC'
    when code ~ '^IN'  then 'IN'
    when code ~ '^V\d+' then substring(code from '^V\d+')
    when code ~ '^V'   then 'V'
    when code ~ '^C'   then 'C'
    when code ~ '^P'   then 'P'
    else code
  end,
  name = case
    when code ~ '^INT' then 'Interludio'
    when code ~ '^TAG' then 'Tag'
    when code ~ '^OUT' then 'Final'
    when code ~ '^PC'  then 'Pre-coro'
    when code ~ '^IN'  then 'Intro'
    when code ~ '^V\d+' then 'Estrofa ' || substring(code from '\d+')
    when code ~ '^V'   then 'Estrofa'
    when code ~ '^C'   then 'Coro'
    when code ~ '^P'   then 'Puente'
    else name
  end
where code !~ '^(IN|V\d*|PC|C|P|INT|TAG|OUT)$'
returning id, song_id, code, name;
-- ↑ esto ya muestra, por sí solo, exactamente qué filas se tocaron y en
-- qué quedaron code/name — revisar a ojo antes de seguir.

-- ── Verificación PASO 1 ── debe salir vacío.
select code, count(*) from song_sections
where code !~ '^(IN|V\d*|PC|C|P|INT|TAG|OUT)$'
group by code;


-- ────────────────────────────────────────────────────────────
-- PASO 2 — re-deriva el label del arreglo desde song_sections.code ya
-- corregido (mismo join que la 018 PASO 2, seguro de re-correr).
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


-- ────────────────────────────────────────────────────────────
-- PASO 3 — red de seguridad: si algún elemento del arreglo quedó con
-- label corrupto y su sectionId no matchea ningún song_sections.id (el
-- join del PASO 2 lo salta en silencio), se corrige el label directo con
-- la misma extracción de prefijo del PASO 1.
-- ────────────────────────────────────────────────────────────

update songs s set default_arrangement = (
  select jsonb_agg(
    case
      when (elem->>'label') ~ '^(IN|V\d*|PC|C|P|INT|TAG|OUT)$' then elem
      else jsonb_set(elem, '{label}', to_jsonb(
        case
          when elem->>'label' ~ '^INT' then 'INT'
          when elem->>'label' ~ '^TAG' then 'TAG'
          when elem->>'label' ~ '^OUT' then 'OUT'
          when elem->>'label' ~ '^PC'  then 'PC'
          when elem->>'label' ~ '^IN'  then 'IN'
          when elem->>'label' ~ '^V\d+' then substring(elem->>'label' from '^V\d+')
          when elem->>'label' ~ '^V'   then 'V'
          when elem->>'label' ~ '^C'   then 'C'
          when elem->>'label' ~ '^P'   then 'P'
          else elem->>'label'
        end
      ))
    end
    order by ord
  )
  from jsonb_array_elements(s.default_arrangement) with ordinality as t(elem, ord)
)
where default_arrangement is not null and jsonb_typeof(default_arrangement) = 'array';

update service_song_arrangements a set arrangement = (
  select jsonb_agg(
    case
      when (elem->>'label') ~ '^(IN|V\d*|PC|C|P|INT|TAG|OUT)$' then elem
      else jsonb_set(elem, '{label}', to_jsonb(
        case
          when elem->>'label' ~ '^INT' then 'INT'
          when elem->>'label' ~ '^TAG' then 'TAG'
          when elem->>'label' ~ '^OUT' then 'OUT'
          when elem->>'label' ~ '^PC'  then 'PC'
          when elem->>'label' ~ '^IN'  then 'IN'
          when elem->>'label' ~ '^V\d+' then substring(elem->>'label' from '^V\d+')
          when elem->>'label' ~ '^V'   then 'V'
          when elem->>'label' ~ '^C'   then 'C'
          when elem->>'label' ~ '^P'   then 'P'
          else elem->>'label'
        end
      ))
    end
    order by ord
  )
  from jsonb_array_elements(a.arrangement) with ordinality as t(elem, ord)
)
where arrangement is not null and jsonb_typeof(arrangement) = 'array';


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL — las tres deben salir vacías.
-- ────────────────────────────────────────────────────────────

select id, song_id, code from song_sections
where code !~ '^(IN|V\d*|PC|C|P|INT|TAG|OUT)$';

select s.id, elem->>'label' as label
from songs s, jsonb_array_elements(s.default_arrangement) elem
where s.default_arrangement is not null
  and (elem->>'label') !~ '^(IN|V\d*|PC|C|P|INT|TAG|OUT)$';

select a.service_item_id, elem->>'label' as label
from service_song_arrangements a, jsonb_array_elements(a.arrangement) elem
where a.arrangement is not null
  and (elem->>'label') !~ '^(IN|V\d*|PC|C|P|INT|TAG|OUT)$';
