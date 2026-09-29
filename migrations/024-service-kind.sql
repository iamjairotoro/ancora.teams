-- ============================================================
-- Fase 24 — tipos de servicio (punto 16 de docs/PENDIENTES-code.md)
--
-- Hoy services.tipo solo distingue 'servicio'/'ensayo', y un ensayo es una
-- fila 100% independiente (su propio setlist, su propia nómina). Esta
-- fase agrega kind ('service'/'rehearsal'/'other') y parent_service_id:
-- de acá en más, un ensayo NUEVO (creado desde el modal de "Nuevo
-- servicio" en Servicio, ya no desde un tab "Ensayo" aparte, que
-- desaparece del menú) hereda canciones y nómina del servicio al que
-- pertenece — así no hay que convocar dos veces a la misma gente.
--
-- ALCANCE DE ESTA FASE — decidido explícitamente por el dueño de la app:
-- la convocatoria y el chat del músico (portal, app/portal/[token]/**,
-- app/api/portal-by-member, app/api/member-portal, app/api/send-ensayo-
-- invites) NO se tocan. Siguen funcionando exactamente igual, con la
-- invitación propia del ensayo de siempre. Ver docs/PENDIENTES-code.md
-- (nota al final del punto 16) y el README para el detalle de lo que
-- queda pendiente y por qué se dejó así a propósito: tocar esa cadena
-- sin poder probarla contra producción es el lugar donde algo se rompe
-- cuando más duele (el domingo, en vivo).
--
-- Por eso tipo NO se retira: un trigger lo mantiene sincronizado con
-- kind en ambas direcciones, para que ese código (que sigue leyendo
-- tipo, sin cambios) seguya viendo exactamente lo mismo que hoy.
--
-- Corré esto en "Ancora - TEST" primero, PASO a PASO, y recién cuando lo
-- confirmes ahí se corre igual en "Ancora - Teams" (prod).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — columnas nuevas
-- ────────────────────────────────────────────────────────────

alter table services add column if not exists kind text not null default 'service'
  check (kind in ('service','rehearsal','other'));
-- on delete set null — si se borra el servicio padre, el ensayo NO se
-- borra en cascada (perdería su propia convocatoria/invitations sin que
-- nadie lo pidiera); queda como un ensayo "sin padre", el mismo estado
-- válido que ya contempla el PASO 4 de más abajo.
alter table services add column if not exists parent_service_id uuid references services(id) on delete set null;

-- ── Verificación PASO 1 ──
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'services' and column_name in ('kind','parent_service_id');


-- ────────────────────────────────────────────────────────────
-- PASO 2 — trigger: tipo ⇄ kind siempre consistentes
-- ────────────────────────────────────────────────────────────
-- Cualquiera de los dos lados que llegue en el INSERT/UPDATE gana sobre
-- el otro cuando indican "ensayo": si kind='rehearsal' O tipo='ensayo',
-- los dos quedan así. Para el resto (service/other), tipo siempre queda
-- en 'servicio' — 'other' no tiene equivalente en tipo, así que se
-- comporta como un servicio normal para todo el código viejo que sigue
-- mirando tipo (portal incluido). Solo toca NEW, nunca OLD — no aplica
-- el cuidado de triggers combinados con DELETE (ver nota de siempre).

create or replace function sync_service_kind_tipo()
returns trigger
language plpgsql
as $$
begin
  if new.kind = 'rehearsal' or new.tipo = 'ensayo' then
    new.kind := 'rehearsal';
    new.tipo := 'ensayo';
  else
    new.tipo := 'servicio';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_service_kind_tipo on services;
create trigger trg_sync_service_kind_tipo
  before insert or update on services
  for each row execute function sync_service_kind_tipo();

-- ── Verificación PASO 2 ──
select tgname from pg_trigger where tgrelid = 'services'::regclass;


-- ────────────────────────────────────────────────────────────
-- PASO 3 — backfill: kind desde el tipo de hoy
-- ────────────────────────────────────────────────────────────
-- El trigger del PASO 2 solo corre en INSERT/UPDATE — esto corrige las
-- filas que YA existían antes de crearlo.

update services set kind = 'rehearsal' where tipo = 'ensayo' and kind <> 'rehearsal';

-- ── Verificación PASO 3 ──
-- Debe dar 0 — todo 'ensayo' debe quedar como 'rehearsal' y viceversa.
select count(*) from services where (tipo='ensayo') is distinct from (kind='rehearsal');


-- ────────────────────────────────────────────────────────────
-- PASO 4 — enlazar los ensayos existentes al servicio más cercano
-- ────────────────────────────────────────────────────────────
-- "Más cercano" = menor diferencia de fecha contra cualquier servicio
-- kind='service' (antes o después, no importa cuál). Si dos quedan a la
-- misma distancia, gana el anterior (fecha menor) — desempate arbitrario
-- pero determinístico. Si no hay NINGÚN kind='service' en la base,
-- parent_service_id queda null (no falla).

with candidatos as (
  select
    r.id as rehearsal_id,
    s.id as service_id,
    abs(r.fecha - s.fecha) as dist,
    row_number() over (partition by r.id order by abs(r.fecha - s.fecha) asc, s.fecha asc) as rn
  from services r
  join services s on s.kind = 'service'
  where r.kind = 'rehearsal'
)
update services
set parent_service_id = candidatos.service_id
from candidatos
where services.id = candidatos.rehearsal_id
  and candidatos.rn = 1
  and services.parent_service_id is null;

-- ── Verificación PASO 4 ──
-- Cuántos ensayos quedaron con padre vs. sin padre (sin servicio 'service'
-- cercano que enlazar — no debería ser el caso normal, pero no es un error).
select
  count(*) filter (where parent_service_id is not null) as ensayos_con_padre,
  count(*) filter (where parent_service_id is null) as ensayos_sin_padre
from services where kind = 'rehearsal';


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────
select 'services' as tabla, count(*) from services
union all
select 'kind=service', count(*) from services where kind='service'
union all
select 'kind=rehearsal', count(*) from services where kind='rehearsal'
union all
select 'kind=other', count(*) from services where kind='other'
union all
select 'tipo/kind inconsistentes (debe ser 0)', count(*) from services where (tipo='ensayo') is distinct from (kind='rehearsal');

-- No se toca RLS: services ya es de lectura/escritura abierta
-- (using(true) desde el esquema base) — kind y parent_service_id quedan
-- con el mismo acceso que el resto de la fila.
