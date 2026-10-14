-- ============================================================
-- 037b — Una invitación por (servicio, persona, EQUIPO) (punto 52, commit 2)
--
-- Hasta ahora `invitations` era UNA fila por (servicio, persona): quien servía en dos equipos el mismo domingo tenía una sola convocatoria y una sola
-- respuesta. Desde ahora cada EQUIPO convoca por su cuenta: varias posiciones del mismo equipo = una tarjeta, una aceptación. Un correo y un push por equipo.
--
-- QUÉ HACE:
--   0 · GUARDA: comprueba EN VIVO que ninguna llave foránea apunte a invitations. Si hubiera alguna, la migración se detiene con la lista (el repo
--       no tiene ninguna, pero el repo es una reconstrucción de la base real: se comprueba la real).
--   1 · BORRA las invitaciones que NO son de ensayo (decisión de Claudia: los datos son de ejemplo y no se conservan como histórico). Solo `invitations`.
--       Quien tuviera un enlace de correo viejo verá «Invitación no encontrada». Los ensayos (services.tipo = 'ensayo') no se tocan.
--   2 · invitations.team_id → teams(id), con ON DELETE RESTRICT (igual que 037a: es historial; la app solo archiva equipos) y su índice.
--       Los ensayos siguen con team_id NULL.
--   3 · La unicidad pasa de (service_id, member_id) a (service_id, member_id, team_id) con NULLS NOT DISTINCT (Postgres 15 o más; la base es 17.6):
--       así los ensayos (team_id NULL) siguen sin poder duplicarse, y el upsert por esas tres columnas funciona también para ellos.
--   4 · GUARDA en la base (trigger nuevo, NO es uno de los cuatro de aviso): una invitación sin equipo solo puede ser de un ensayo, y una de ensayo
--       nunca lleva equipo. Así ningún código viejo puede crear filas sin equipo que nadie vería.
--   5 · Los triggers de reasignación pasan a trabajar POR EQUIPO (mismos nombres: los triggers no se tocan):
--         trg_snapshot_confirmed_posiciones — la foto (confirmed_position_ids) son solo las posiciones de la persona EN ESE EQUIPO.
--         trg_flag_reassignment_if_changed  — una asignación afecta al equipo de su posición (y, si la mueven, a los dos): la bandera de cada
--                                             invitación se calcula con las posiciones de su equipo.
--
-- LOS CUATRO TRIGGERS DE AVISO (notify_chat_message, notify_rsvp_change, notify_setlist_change, notify_nomina_removal) ESTÁN APAGADOS A MANO. Esta
-- migración NO los crea, borra ni redefine, y termina con una verificación comentada (e) de que siguen apagados ('D').
--
-- ORDEN: corre esta migración ANTES de desplegar el código del commit 2 (el código ya hace upsert por (service_id, member_id, team_id), y la 037a ya
-- debe estar aplicada). Con el código anterior contra esta base, convocar fallaría. Corre en una transacción: si algo falla, no queda nada a medias.
-- Córrela primero en «Ancora - TEST».
-- ============================================================

begin;

-- ───────────────────────────────────────
-- PASO 0 — GUARDA: ninguna llave foránea hacia invitations
-- ───────────────────────────────────────
do $$
declare
  r record;
  lista text := '';
begin
  for r in
    select conrelid::regclass::text as tabla, conname, confdeltype
    from pg_constraint
    where confrelid = 'public.invitations'::regclass and contype = 'f'
  loop
    lista := lista || format(E'\n  · %s (%s): ON DELETE %s', r.tabla, r.conname,
      case r.confdeltype when 'a' then 'NO ACTION' when 'r' then 'RESTRICT' when 'c' then 'CASCADE' when 'n' then 'SET NULL' else 'SET DEFAULT' end);
  end loop;
  if lista <> '' then
    raise exception E'Hay llaves foráneas hacia invitations; borrar filas las afectaría. Revisa qué pasa con cada una antes de seguir:%', lista;
  end if;
end $$;

-- ───────────────────────────────────────
-- PASO 1 — borrar las invitaciones que NO son de ensayo (decisión a)
-- ───────────────────────────────────────
-- Incluye cualquier fila sin servicio. Los disparadores de invitations son «antes de actualizar» y «después de actualizar»: un DELETE no dispara ninguno.
delete from public.invitations i
 where not exists (select 1 from public.services s where s.id = i.service_id and s.tipo = 'ensayo');

-- ───────────────────────────────────────
-- PASO 2 — team_id
-- ───────────────────────────────────────
alter table public.invitations
  add column if not exists team_id uuid references public.teams(id) on delete restrict;
create index if not exists idx_invitations_team on public.invitations(team_id);

-- ───────────────────────────────────────
-- PASO 3 — unicidad por (servicio, persona, equipo)
-- ───────────────────────────────────────
-- Se quita la unicidad vieja SIN depender de su nombre: toda restricción única de invitations que sea exactamente (member_id, service_id).
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.invitations'::regclass and con.contype = 'u'
      and (select array_agg(att.attname order by att.attname)
             from unnest(con.conkey) k
             join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k) = array['member_id', 'service_id']::name[]
  loop
    execute format('alter table public.invitations drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.invitations drop constraint if exists invitations_service_member_team_key;
alter table public.invitations
  add constraint invitations_service_member_team_key unique nulls not distinct (service_id, member_id, team_id);

-- ───────────────────────────────────────
-- PASO 4 — una invitación sin equipo solo puede ser de un ensayo
-- ───────────────────────────────────────
create or replace function public.check_invitation_team()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  es_ensayo boolean;
begin
  select (s.tipo = 'ensayo') into es_ensayo from public.services s where s.id = new.service_id;
  if es_ensayo is null then
    return new;                                   -- sin servicio: lo rechaza la llave foránea (o es NULL), no este trigger
  end if;
  if es_ensayo and new.team_id is not null then
    raise exception 'Una invitación de ensayo no lleva equipo (team_id debe ser NULL).' using errcode = '23514';
  end if;
  if not es_ensayo and new.team_id is null then
    raise exception 'Una invitación de servicio necesita el equipo que convoca (team_id).' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_invitation_team on public.invitations;
create trigger trg_check_invitation_team
  before insert or update of team_id, service_id on public.invitations
  for each row
  execute function public.check_invitation_team();

-- ───────────────────────────────────────
-- PASO 5 — los dos triggers de reasignación, por equipo
-- ───────────────────────────────────────

-- Trigger A: al confirmar (o RECONFIRMAR: cambia responded_at, punto 36), foto de las posiciones de la persona en el servicio DENTRO DE ESE EQUIPO.
-- Los ensayos (team_id NULL) no tienen posiciones: no guardan foto.
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
      if new.team_id is null then
        new.confirmed_position_ids := null;
      else
        select array_agg(b.team_position_id order by b.team_position_id) into new.confirmed_position_ids
        from public.banda_assignments b
        join public.team_positions tp on tp.id = b.team_position_id
        where b.service_id = new.service_id and b.member_id = new.member_id and tp.team_id = new.team_id;
      end if;
      new.needs_reassignment_confirm := false;
    end if;
  end if;
  return new;
end;
$$;

-- Trigger B: cuando cambia una asignación, para cada persona afectada (la de antes y/o la de ahora) y cada equipo afectado (el de la posición de antes
-- y/o el de la de ahora), la invitación CONFIRMADA de ese (servicio, persona, equipo) queda marcada si sus posiciones en ese equipo ya no son las que
-- confirmó. Solo MARCA; el admin decide cuándo reinvitar. Ramas explícitas por TG_OP: nunca se toca OLD/NEW fuera de la rama donde existe.
create or replace function public.flag_reassignment_if_changed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected_service_id uuid;
  member_ids uuid[];
  team_ids uuid[];
  m uuid;
  t uuid;
  current_ids uuid[];
  inv record;
begin
  if TG_OP = 'DELETE' then
    affected_service_id := old.service_id;
    member_ids := array[old.member_id];
    team_ids := array[(select tp.team_id from public.team_positions tp where tp.id = old.team_position_id)];
  elsif TG_OP = 'INSERT' then
    affected_service_id := new.service_id;
    member_ids := array[new.member_id];
    team_ids := array[(select tp.team_id from public.team_positions tp where tp.id = new.team_position_id)];
  else -- UPDATE
    affected_service_id := new.service_id;
    member_ids := array[old.member_id, new.member_id];
    team_ids := array[(select tp.team_id from public.team_positions tp where tp.id = old.team_position_id),
                      (select tp.team_id from public.team_positions tp where tp.id = new.team_position_id)];
  end if;

  -- Si el servicio completo se está borrando (cascada), no hay nada que marcar.
  if not exists (select 1 from public.services where id = affected_service_id) then
    if TG_OP = 'DELETE' then return old; else return new; end if;
  end if;

  foreach m in array member_ids
  loop
    if m is null then continue; end if;
    foreach t in array team_ids
    loop
      if t is null then continue; end if;      -- fila heredada (sin id de posición): no pertenece a ningún equipo

      select array_agg(b.team_position_id order by b.team_position_id) into current_ids
      from public.banda_assignments b
      join public.team_positions tp on tp.id = b.team_position_id
      where b.service_id = affected_service_id and b.member_id = m and tp.team_id = t;

      select * into inv from public.invitations
      where service_id = affected_service_id and member_id = m and team_id = t;

      if inv.id is not null and inv.status = 'confirmado' then
        update public.invitations
           set needs_reassignment_confirm = (current_ids is distinct from inv.confirmed_position_ids)
         where id = inv.id
           and needs_reassignment_confirm is distinct from (current_ids is distinct from inv.confirmed_position_ids);
      end if;
    end loop;
  end loop;

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

-- Funciones de trigger: nadie las llama a mano.
revoke all on function public.check_invitation_team() from public, anon, authenticated;
revoke all on function public.snapshot_confirmed_posiciones() from public, anon, authenticated;
revoke all on function public.flag_reassignment_if_changed() from public, anon, authenticated;

commit;


-- ───────────────────────────────────────
-- VERIFICACIONES (descomenta y corre una por una; ninguna escribe)
-- ───────────────────────────────────────

-- ⓘ ANTES de correr la migración — llaves foráneas que apuntan a invitations (el PASO 0 las comprueba, pero así las ves tú). Esperado: 0 filas.
-- select conrelid::regclass as tabla, conname, confdeltype as al_borrar   -- a = NO ACTION, r = RESTRICT, c = CASCADE, n = SET NULL
--   from pg_constraint where confrelid = 'public.invitations'::regclass and contype = 'f';

-- ⓘ CONTEO ANTES (corre esto ANTES de la migración y anota los dos números) y DESPUÉS (la misma consulta: debe quedar SOLO la fila de ensayos, con el
--   mismo número que tenía antes; la de servicios debe desaparecer).
-- select coalesce(s.tipo, '(sin servicio)') as tipo, count(*) as invitaciones
--   from public.invitations i left join public.services s on s.id = i.service_id group by 1 order by 1;

-- a · columna, índice y unicidad nueva (la vieja (service_id, member_id) ya no debe estar)
-- select column_name, is_nullable from information_schema.columns where table_name = 'invitations' and column_name = 'team_id';   -- YES
-- select indexname from pg_indexes where tablename = 'invitations';                     -- idx_invitations_team e invitations_service_member_team_key
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--  where conrelid = 'public.invitations'::regclass and contype in ('u', 'f');            -- unique NULLS NOT DISTINCT (service_id, member_id, team_id); team_id → teams ON DELETE RESTRICT

-- b · los ensayos que quedaron siguen sin equipo, y todo lo demás de servicios desapareció (debe dar 0 filas)
-- select i.id from public.invitations i join public.services s on s.id = i.service_id
--  where (s.tipo = 'ensayo' and i.team_id is not null) or (s.tipo <> 'ensayo');

-- c · la guarda de equipo funciona (se deshace sola: termina en ROLLBACK). Las dos deben fallar con «23514».
-- begin;
--   insert into public.invitations (service_id, member_id) select id, (select id from public.members limit 1) from public.services where tipo = 'servicio' limit 1;   -- ERROR: necesita el equipo
-- rollback;

-- d · los tres triggers de esta migración están ACTIVOS ('O')
-- select tgname, tgenabled from pg_trigger
--  where tgname in ('trg_check_invitation_team', 'trg_snapshot_confirmed_posiciones', 'trg_flag_reassignment_if_changed') and not tgisinternal;

-- e · LOS CUATRO TRIGGERS DE AVISO SIGUEN APAGADOS: las 4 filas deben decir 'D' (disabled). Si alguna dice 'O', apágala con
--     alter table <tabla> disable trigger <nombre>;
-- select t.tgname, t.tgrelid::regclass as tabla, p.proname as funcion, t.tgenabled
--   from pg_trigger t join pg_proc p on p.oid = t.tgfoid
--  where p.proname in ('notify_chat_message', 'notify_rsvp_change', 'notify_setlist_change', 'notify_nomina_removal') and not t.tgisinternal
--  order by p.proname;

-- f · las tres funciones tienen search_path fijo y `anon` no puede ejecutarlas (0 filas en la segunda)
-- select proname, proconfig from pg_proc
--  where proname in ('check_invitation_team', 'snapshot_confirmed_posiciones', 'flag_reassignment_if_changed') and pronamespace = 'public'::regnamespace;
-- select p.proname from pg_proc p, pg_roles r
--  where p.proname in ('check_invitation_team', 'snapshot_confirmed_posiciones', 'flag_reassignment_if_changed') and p.pronamespace = 'public'::regnamespace
--    and r.rolname = 'anon' and has_function_privilege(r.oid, p.oid, 'execute');


-- ───────────────────────────────────────
-- REVERTIR (solo si hiciera falta; las invitaciones BORRADAS no se recuperan)
-- ───────────────────────────────────────
-- PASO 1 — vuelve a correr la versión de la 037a de las funciones snapshot_confirmed_posiciones() y flag_reassignment_if_changed() (migrations/037a,
--          PASO 5) y despliega el código del commit 1.
-- PASO 2 — descomenta y corre (solo si NO hay dos invitaciones de la misma persona en el mismo servicio con distinto equipo):
-- drop trigger if exists trg_check_invitation_team on public.invitations;
-- drop function if exists public.check_invitation_team();
-- alter table public.invitations drop constraint if exists invitations_service_member_team_key;
-- alter table public.invitations add constraint invitations_service_id_member_id_key unique (service_id, member_id);
-- alter table public.invitations drop column if exists team_id;      -- también borra su índice
