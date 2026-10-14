-- ============================================================
-- 037a — La posición de una asignación se guarda por ID (punto 52, commit 1)
--
-- PROBLEMA: banda_assignments.posicion es el NOMBRE de la posición (texto libre, sin FK). Renombrar una posición, o repetir su nombre en otro
-- equipo, rompe el emparejamiento (la app lo deduce por nombre en ~15 lugares: ver punto 35). Además los triggers de «reasignación» comparan ese texto.
--
-- QUÉ HACE (aditivo; NO borra ninguna fila ni ninguna columna):
--   1 · banda_assignments.team_position_id → team_positions(id), con ON DELETE RESTRICT (explícito, justificado abajo) y su índice.
--   2 · posicion deja de ser obligatoria (las filas nuevas solo llevan el id) y la unicidad nueva es (service_id, team_position_id, slot_index).
--       La restricción VIEJA (service_id, posicion, slot_index) se deja hasta la limpieza final: con posicion NULL no estorba.
--   3 · invitations.confirmed_position_ids uuid[]: la «foto» de las posiciones confirmadas, ahora por id (confirmed_posiciones, de texto, queda
--       sin uso hasta la limpieza final).
--   4 · Relleno (sin inventar nada): solo las asignaciones cuyo texto coincide EXACTAMENTE con el nombre de UNA posición vigente (posición y equipo
--       no archivados). Lo demás —códigos viejos (VX1, AG1…), nombres repetidos entre equipos, archivadas— queda con team_position_id NULL y
--       desaparece con la limpieza de los datos de prueba (punto 35: NO hay mapeo).
--   5 · Los dos triggers que leían posicion se reescriben sobre ids (mismos nombres: los triggers no se tocan):
--         trg_snapshot_confirmed_posiciones  (antes de actualizar invitations) — guarda las posiciones confirmadas.
--         trg_flag_reassignment_if_changed   (después de insertar/actualizar/borrar banda_assignments) — marca needs_reassignment_confirm.
--       Y se corrige el punto 36: reconfirmar SIN reenvío (status ya era «confirmado», cambia responded_at) ahora también toma la foto y baja la bandera.
--
-- ON DELETE RESTRICT (y no CASCADE ni SET NULL):
--   · CASCADE borraría en silencio las asignaciones de servicios pasados si alguien borrara una posición (la app solo las ARCHIVA; son historial).
--   · SET NULL dejaría la asignación huérfana: justo lo que este cambio quiere evitar (no sabría qué posición era).
--   · RESTRICT hace fallar el borrado en duro de una posición que tiene asignaciones, con un error claro, en vez de decidir por ti.
--   · RESTRICT y NO ACTION se comportan igual mientras la restricción no sea diferible (aquí no lo es): se prefiere RESTRICT porque dice lo que hace.
--   Consecuencia, comprobada: borrar en duro un EQUIPO o una ORGANIZACIÓN completos (cascada hacia sus posiciones) puede fallar si todavía hay
--   asignaciones, según el orden interno en que Postgres recorra las cascadas. Hoy esa operación no existe en la aplicación (solo archiva);
--   si algún día se necesita, se borran antes los servicios o las asignaciones.
--
-- LOS CUATRO TRIGGERS DE AVISO (notify_chat_message, notify_rsvp_change, notify_setlist_change, notify_nomina_removal) ESTÁN APAGADOS A MANO en
-- esta base (apuntaban a la app vieja). Esta migración NO los toca (no los crea, borra ni redefine) y termina con una verificación comentada de
-- que siguen apagados. El único trigger que apaga y vuelve a prender es el de bandera, alrededor del relleno del paso 4.
--
-- ORDEN: corre esta migración ANTES de desplegar el código del commit 1 (el código ya escribe y lee team_position_id).
-- Corre en una transacción: si algo falla, no queda nada a medias. Córrela primero en «Ancora - TEST».
-- ============================================================

begin;

-- ───────────────────────────────────────
-- PASO 1 — team_position_id
-- ───────────────────────────────────────
alter table public.banda_assignments
  add column if not exists team_position_id uuid references public.team_positions(id) on delete restrict;

-- El índice de la restricción única empieza por service_id: no sirve para buscar por posición (historial por posición, la comprobación de la
-- llave foránea al borrar una posición).
create index if not exists idx_banda_assignments_team_position on public.banda_assignments(team_position_id);

-- ───────────────────────────────────────
-- PASO 2 — posicion opcional y unicidad por id
-- ───────────────────────────────────────
alter table public.banda_assignments alter column posicion drop not null;

alter table public.banda_assignments drop constraint if exists banda_assignments_service_pos_slot_key;
alter table public.banda_assignments
  add constraint banda_assignments_service_pos_slot_key unique (service_id, team_position_id, slot_index);   -- las filas con NULL no chocan entre sí

-- ───────────────────────────────────────
-- PASO 3 — la foto de lo confirmado, por id
-- ───────────────────────────────────────
alter table public.invitations add column if not exists confirmed_position_ids uuid[];

-- ───────────────────────────────────────
-- PASO 4 — relleno (solo coincidencia exacta con UNA posición vigente)
-- ───────────────────────────────────────
-- Mientras se rellena, el trigger de bandera se apaga: un UPDATE de banda_assignments lo dispararía y recalcularía banderas que no cambiaron.
alter table public.banda_assignments disable trigger trg_flag_reassignment_if_changed;

with vigentes as (
  select tp.id, tp.name
  from public.team_positions tp
  join public.teams t on t.id = tp.team_id
  where tp.archived_at is null and t.archived_at is null
),
unicas as (
  select name, (array_agg(id))[1] as id
  from vigentes
  group by name
  having count(*) = 1                       -- un nombre repetido entre equipos es ambiguo: no se rellena
)
update public.banda_assignments b
   set team_position_id = u.id
  from unicas u
 where b.team_position_id is null
   and b.posicion = u.name;

-- Las invitaciones ya confirmadas toman su foto en ids (para que la primera edición no encienda la bandera de golpe).
-- Su status no cambia, así que los triggers de invitations no hacen nada con este UPDATE.
update public.invitations i
   set confirmed_position_ids = (
         select array_agg(b.team_position_id order by b.team_position_id)
         from public.banda_assignments b
         where b.service_id = i.service_id and b.member_id = i.member_id and b.team_position_id is not null
       )
 where i.status = 'confirmado';

alter table public.banda_assignments enable trigger trg_flag_reassignment_if_changed;

-- ───────────────────────────────────────
-- PASO 5 — los dos triggers sobre ids
-- ───────────────────────────────────────

-- Trigger A: al confirmar, foto de las posiciones de la persona en el servicio y la bandera se baja.
-- Punto 36: también vale cuando la invitación YA estaba confirmada y la persona vuelve a confirmar (cambia responded_at):
-- antes solo tomaba la foto si cambiaba status, y la bandera quedaba puesta para siempre.
create or replace function public.snapshot_confirmed_posiciones()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if TG_OP = 'UPDATE' then
    if new.status = 'confirmado'
       and (old.status is distinct from new.status or new.responded_at is distinct from old.responded_at) then
      select array_agg(b.team_position_id order by b.team_position_id) into new.confirmed_position_ids
      from public.banda_assignments b
      where b.service_id = new.service_id and b.member_id = new.member_id and b.team_position_id is not null;
      new.needs_reassignment_confirm := false;
    end if;
  end if;
  return new;
end;
$$;

-- Trigger B: cuando cambia una asignación, la persona afectada (la de antes y/o la de ahora) conserva o no las posiciones que había confirmado.
-- Solo MARCA la bandera; el admin decide cuándo reinvitar. Ramas explícitas por TG_OP: nunca se toca OLD/NEW fuera de la rama donde existe.
create or replace function public.flag_reassignment_if_changed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected_service_id uuid;
  member_ids uuid[];
  affected_member_id uuid;
  current_ids uuid[];
  inv record;
begin
  if TG_OP = 'DELETE' then
    affected_service_id := old.service_id;
    member_ids := array[old.member_id];
  elsif TG_OP = 'INSERT' then
    affected_service_id := new.service_id;
    member_ids := array[new.member_id];
  else -- UPDATE
    affected_service_id := new.service_id;
    member_ids := array[old.member_id, new.member_id];
  end if;

  -- Si el servicio completo se está borrando (cascada), no hay nada que marcar.
  if not exists (select 1 from public.services where id = affected_service_id) then
    if TG_OP = 'DELETE' then return old; else return new; end if;
  end if;

  foreach affected_member_id in array member_ids
  loop
    if affected_member_id is null then continue; end if;

    select array_agg(b.team_position_id order by b.team_position_id) into current_ids
    from public.banda_assignments b
    where b.service_id = affected_service_id and b.member_id = affected_member_id and b.team_position_id is not null;

    select * into inv from public.invitations
    where service_id = affected_service_id and member_id = affected_member_id;

    if inv.id is not null and inv.status = 'confirmado' then
      update public.invitations
         set needs_reassignment_confirm = (current_ids is distinct from inv.confirmed_position_ids)
       where id = inv.id
         and needs_reassignment_confirm is distinct from (current_ids is distinct from inv.confirmed_position_ids);
    end if;
  end loop;

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

-- Funciones de trigger: nadie las llama a mano.
revoke all on function public.snapshot_confirmed_posiciones() from public, anon, authenticated;
revoke all on function public.flag_reassignment_if_changed() from public, anon, authenticated;

commit;


-- ───────────────────────────────────────
-- VERIFICACIONES (descomenta y corre una por una; ninguna escribe)
-- ───────────────────────────────────────

-- a · la columna, su llave foránea con RESTRICT ('r') y los índices
-- select column_name, is_nullable from information_schema.columns
--  where table_name = 'banda_assignments' and column_name in ('team_position_id', 'posicion');          -- ambas YES
-- select conname, confdeltype from pg_constraint
--  where conrelid = 'public.banda_assignments'::regclass and contype in ('f', 'u');                       -- la de team_position_id: confdeltype = 'r'
-- select indexname from pg_indexes where tablename = 'banda_assignments';                                 -- idx_banda_assignments_team_position

-- b · cuántas asignaciones quedaron con id y cuántas sin id (las sin id son los códigos viejos / nombres ambiguos: se van con la limpieza)
-- select count(*) filter (where team_position_id is not null) as con_id,
--        count(*) filter (where team_position_id is null)     as sin_id
--   from public.banda_assignments;

-- c · todo lo que tiene id apunta a una posición que existe (debe dar 0 filas)
-- select b.id from public.banda_assignments b
--  left join public.team_positions tp on tp.id = b.team_position_id
--  where b.team_position_id is not null and tp.id is null;

-- d · los dos triggers de esta migración siguen ACTIVOS ('O')
-- select tgname, tgenabled from pg_trigger
--  where tgname in ('trg_snapshot_confirmed_posiciones', 'trg_flag_reassignment_if_changed') and not tgisinternal;

-- e · LOS CUATRO TRIGGERS DE AVISO SIGUEN APAGADOS: las 4 filas deben decir 'D' (disabled). Si alguna dice 'O', apágala con
--     alter table <tabla> disable trigger <nombre>;
-- select t.tgname, t.tgrelid::regclass as tabla, p.proname as funcion, t.tgenabled
--   from pg_trigger t join pg_proc p on p.oid = t.tgfoid
--  where p.proname in ('notify_chat_message', 'notify_rsvp_change', 'notify_setlist_change', 'notify_nomina_removal') and not t.tgisinternal
--  order by p.proname;

-- f · las dos funciones tienen search_path fijo y `anon` no puede ejecutarlas (0 filas en la segunda)
-- select proname, proconfig from pg_proc
--  where proname in ('snapshot_confirmed_posiciones', 'flag_reassignment_if_changed') and pronamespace = 'public'::regnamespace;
-- select p.proname from pg_proc p, pg_roles r
--  where p.proname in ('snapshot_confirmed_posiciones', 'flag_reassignment_if_changed') and p.pronamespace = 'public'::regnamespace
--    and r.rolname = 'anon' and has_function_privilege(r.oid, p.oid, 'execute');

-- g · renombrar una posición NO rompe la asignación (se deshace solo: termina en ROLLBACK)
-- begin;
--   update public.team_positions set name = name || ' (prueba)'
--    where id = (select team_position_id from public.banda_assignments where team_position_id is not null limit 1);
--   select b.id, b.posicion as texto_viejo, tp.name as nombre_actual
--     from public.banda_assignments b join public.team_positions tp on tp.id = b.team_position_id limit 3;
-- rollback;


-- ───────────────────────────────────────
-- REVERTIR (solo si hiciera falta; se pierde únicamente lo de esta migración)
-- ───────────────────────────────────────
-- PASO 1 — vuelve a correr el bloque «Trigger A» de supabase-schema-v20-reassignment-notify.sql y supabase-schema-v22-fix-reassignment-return.sql
--          (restauran las dos funciones sobre texto). Hazlo ANTES del paso 2 y despliega el código anterior.
-- PASO 2 — descomenta y corre:
-- alter table public.invitations drop column if exists confirmed_position_ids;
-- alter table public.banda_assignments drop constraint if exists banda_assignments_service_pos_slot_key;
-- alter table public.banda_assignments drop column if exists team_position_id;      -- también borra su índice
-- -- solo si NO hay filas con posicion NULL (las creadas con el código nuevo la dejan vacía):
-- -- alter table public.banda_assignments alter column posicion set not null;
