-- ============================================================
-- 037c — El conflicto ESTRICTO entre convocatorias (punto 52, commit 3)
--
-- REGLA: una persona no puede servir en dos equipos a la vez. Hay CONFLICTO entre dos convocatorias de la MISMA persona cuando son del MISMO DÍA
-- (services.fecha) y sus horarios se solapan (hora_inicio / hora_fin; nulos = 10:00 y 14:00; solape ESTRICTO: si una termina justo cuando empieza
-- la otra, no chocan; una cuyo fin <= inicio no choca con nada). Varias posiciones del MISMO equipo en un servicio son UNA convocatoria: nunca son
-- conflicto. Los ensayos (sin equipo) quedan fuera: siguen en pausa.
--
-- QUÉ HACE:
--   1 · invitations.declined_reason (solo 'conflict') y invitations.superseded_by → invitations(id) ON DELETE SET NULL, con su índice y dos reglas
--       (CHECK): un motivo solo existe en una invitación declinada, y superseded_by solo con motivo 'conflict'.
--   2 · Funciones internas: convocatorias_se_solapan, convocatorias_en_conflicto, tiene_posiciones_en_equipo, liberar_desplazadas, confirmar_convocatoria.
--   3 · Dos triggers nuevos de invitations (NO son de los cuatro de aviso):
--         trg_clear_declined_reason (antes de actualizar): si la invitación deja de estar «declinada», se borran su motivo y su superseded_by.
--         trg_release_superseded    (después de cambiar status): cuando una confirmación DEJA de serlo (se rechaza, se quita, se reinvita), las
--                                   convocatorias que ELLA había desplazado vuelven a pendiente. Una sola regla en la base: ningún camino la olvida.
--   4 · TRES funciones públicas, que SOLO ejecuta la llave de servicio (revoke a public, anon y authenticated; grant a service_role):
--         responder_convocatoria(persona, invitación, 'si'|'no', comentario)
--             «no»: declina (decisión de la persona: sin motivo).
--             «si»: si hay OTRA convocatoria CONFIRMADA que choca → no cambia nada y devuelve 'conflicto' (hay que usar «Aceptar aquí en su lugar»).
--                   Si no: confirma, y las PENDIENTES que chocan pasan a declinado con declined_reason = 'conflict' y superseded_by = esta.
--                   Nunca toca las ya confirmadas ni las que la persona declinó ella misma.
--         aceptar_aqui_en_su_lugar(persona, invitación)
--             Saca a la persona de las posiciones de la(s) convocatoria(s) confirmada(s) que chocan (las posiciones quedan VACANTES, la fila se conserva),
--             esas convocatorias pasan a declinado por conflicto (superseded_by = esta), y confirma esta. SIN aviso de baja de nómina (ancora.sin_aviso).
--         quitar_confirmacion(persona, invitación)
--             La confirmada vuelve a pendiente y SOLO vuelven a pendiente las que esa confirmación había desplazado (las demás no se tocan).
--       Las tres toman pg_advisory_xact_lock por PERSONA antes de leer nada: dos respuestas simultáneas de la misma persona se hacen EN FILA, así
--       nunca quedan dos confirmadas que choquen. La identidad la valida la RUTA del servidor (sesión o enlace); la función además comprueba que la
--       invitación sea de esa persona. El navegador nunca manda la persona.
--   5 · Las funciones de AVISO notify_rsvp_change y notify_nomina_removal se redefinen DESDE EL REPO (create or replace; los triggers no se tocan):
--         · rsvp: una declinación por conflicto NO avisa al líder «no podrá asistir».
--         · nómina: no avisa si la transacción marcó ancora.sin_aviso = 'on' (lo hace «Aceptar aquí en su lugar»).
--       Su URL y su secreto quedan como MARCADOR (.invalid, sin URL real): se conectan en la fase de notificaciones.
--
-- LOS CUATRO TRIGGERS DE AVISO (notify_chat_message, notify_rsvp_change, notify_setlist_change, notify_nomina_removal) ESTÁN APAGADOS A MANO. Esta
-- migración NO los crea, borra ni apaga/enciende: solo cambia el cuerpo de dos funciones. La verificación comentada (c) comprueba que siguen en 'D'.
--
-- CASO LÍMITE (decidido): si alguien «acepta aquí en su lugar» y luego quita esa confirmación, la convocatoria que dejó NO vuelve a pendiente (ya no tiene
-- sus posiciones): queda declinada por conflicto, sin enlace. Las demás desplazadas por esa confirmación sí vuelven.
--
-- ORDEN: la 037a y la 037b ya aplicadas. Correr ANTES de desplegar el código del commit 3 (la ruta de respuesta ya llama a responder_convocatoria).
-- Corre en una transacción. Córrela primero en «Ancora - TEST».
-- ============================================================

begin;

-- ───────────────────────────────────────
-- PASO 1 — columnas y reglas
-- ───────────────────────────────────────
alter table public.invitations add column if not exists declined_reason text;
alter table public.invitations add column if not exists superseded_by uuid references public.invitations(id) on delete set null;
create index if not exists idx_invitations_superseded_by on public.invitations(superseded_by);

alter table public.invitations drop constraint if exists invitations_declined_reason_ck;
alter table public.invitations
  add constraint invitations_declined_reason_ck check (declined_reason is null or (declined_reason = 'conflict' and status = 'declinado'));
alter table public.invitations drop constraint if exists invitations_superseded_by_ck;
alter table public.invitations
  add constraint invitations_superseded_by_ck check (superseded_by is null or declined_reason = 'conflict');

-- ───────────────────────────────────────
-- PASO 2 — funciones internas
-- ───────────────────────────────────────

-- ¿Se solapan dos horarios? Nulos: inicio 10:00 y fin 14:00. Solape ESTRICTO; un horario cuyo fin <= inicio no choca con nada.
create or replace function public.convocatorias_se_solapan(a_ini time, a_fin time, b_ini time, b_fin time)
returns boolean
language sql
immutable
as $$
  select coalesce(a_ini, time '10:00') < coalesce(a_fin, time '14:00')
     and coalesce(b_ini, time '10:00') < coalesce(b_fin, time '14:00')
     and coalesce(a_ini, time '10:00') < coalesce(b_fin, time '14:00')
     and coalesce(b_ini, time '10:00') < coalesce(a_fin, time '14:00');
$$;

-- Las OTRAS convocatorias enviadas de la misma persona que chocan con esta (mismo día, horarios que se solapan). Sin ensayos ni filas sin equipo.
create or replace function public.convocatorias_en_conflicto(p_inv_id uuid)
returns setof public.invitations
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.*
  from public.invitations me
  join public.services ms on ms.id = me.service_id
  join public.invitations r on r.member_id = me.member_id and r.id <> me.id and r.team_id is not null and r.sent_at is not null
  join public.services rs on rs.id = r.service_id
  where me.id = p_inv_id and me.team_id is not null
    and ms.tipo <> 'ensayo' and rs.tipo <> 'ensayo'
    and rs.fecha = ms.fecha
    and public.convocatorias_se_solapan(ms.hora_inicio, ms.hora_fin, rs.hora_inicio, rs.hora_fin);
$$;

-- ¿La persona sigue teniendo alguna posición de ESE equipo en ESE servicio?
create or replace function public.tiene_posiciones_en_equipo(p_service_id uuid, p_member_id uuid, p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.banda_assignments b
    join public.team_positions tp on tp.id = b.team_position_id
    where b.service_id = p_service_id and b.member_id = p_member_id and tp.team_id = p_team_id
  );
$$;

-- Devuelve a pendiente SOLO las convocatorias que desplazó p_inv_id. La que la persona ya no puede servir (porque salió de sus posiciones con
-- «Aceptar aquí en su lugar») sigue declinada por conflicto, sin enlace. Siempre se rompe el enlace superseded_by.
create or replace function public.liberar_desplazadas(p_inv_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n integer;
begin
  update public.invitations r
     set status = case when public.tiene_posiciones_en_equipo(r.service_id, r.member_id, r.team_id) then 'pendiente' else r.status end,
         declined_reason = case when public.tiene_posiciones_en_equipo(r.service_id, r.member_id, r.team_id) then null else r.declined_reason end,
         responded_at = case when public.tiene_posiciones_en_equipo(r.service_id, r.member_id, r.team_id) then null else r.responded_at end,
         superseded_by = null
   where r.superseded_by = p_inv_id;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Confirma una convocatoria y desplaza a las PENDIENTES que chocan. Interna: la llaman responder_convocatoria y aceptar_aqui_en_su_lugar,
-- que ya tienen el bloqueo por persona. Nunca toca las confirmadas ni las que la persona declinó ella misma.
create or replace function public.confirmar_convocatoria(p_inv_id uuid, p_comentario text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  desplazadas jsonb := '[]'::jsonb;
begin
  update public.invitations
     set status = 'confirmado', comentario = nullif(p_comentario, ''), responded_at = now(), declined_reason = null, superseded_by = null
   where id = p_inv_id;

  for r in select * from public.convocatorias_en_conflicto(p_inv_id) where status = 'pendiente' loop
    update public.invitations
       set status = 'declinado', declined_reason = 'conflict', superseded_by = p_inv_id
     where id = r.id;
    desplazadas := desplazadas || jsonb_build_array(jsonb_build_object('invitacion', r.id, 'equipo', r.team_id, 'servicio', r.service_id));
  end loop;
  return desplazadas;
end;
$$;

-- ───────────────────────────────────────
-- PASO 3 — dos triggers nuevos de invitations
-- ───────────────────────────────────────
create or replace function public.clear_declined_reason()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if TG_OP = 'UPDATE' then
    if new.status is distinct from 'declinado' then new.declined_reason := null; end if;
    if new.declined_reason is distinct from 'conflict' then new.superseded_by := null; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clear_declined_reason on public.invitations;
create trigger trg_clear_declined_reason
  before update on public.invitations
  for each row
  execute function public.clear_declined_reason();

create or replace function public.release_superseded()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if TG_OP = 'UPDATE' then
    if old.status = 'confirmado' and new.status is distinct from 'confirmado' then
      perform public.liberar_desplazadas(new.id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_release_superseded on public.invitations;
create trigger trg_release_superseded
  after update of status on public.invitations
  for each row
  execute function public.release_superseded();

-- ───────────────────────────────────────
-- PASO 4 — las tres funciones públicas (solo la llave de servicio)
-- ───────────────────────────────────────

create or replace function public.responder_convocatoria(p_member_id uuid, p_invitacion_id uuid, p_respuesta text, p_comentario text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inv public.invitations;
  choca public.invitations;
  desplazadas jsonb;
begin
  if p_respuesta is null or p_respuesta not in ('si', 'no') then
    return jsonb_build_object('resultado', 'respuesta_invalida');
  end if;

  -- UNA persona a la vez: dos respuestas simultáneas de la misma persona se hacen en fila (hasta el final de la transacción).
  perform pg_advisory_xact_lock(hashtextextended(p_member_id::text, 0));

  select * into inv from public.invitations where id = p_invitacion_id and member_id = p_member_id for update;
  if inv.id is null then return jsonb_build_object('resultado', 'no_existe'); end if;
  if inv.sent_at is null then return jsonb_build_object('resultado', 'no_enviada'); end if;

  if p_respuesta = 'no' then
    -- Decisión de la persona: sin motivo de conflicto. Si estaba confirmada, el trigger libera las que ella había desplazado.
    update public.invitations
       set status = 'declinado', comentario = nullif(p_comentario, ''), responded_at = now(), declined_reason = null, superseded_by = null
     where id = inv.id;
    return jsonb_build_object('resultado', 'ok');
  end if;

  if inv.team_id is not null then
    select c.* into choca from public.convocatorias_en_conflicto(inv.id) c where c.status = 'confirmado' limit 1;
    if choca.id is not null then
      return jsonb_build_object('resultado', 'conflicto', 'invitacion_en_conflicto', choca.id, 'equipo', choca.team_id, 'servicio', choca.service_id);
    end if;
  end if;

  desplazadas := public.confirmar_convocatoria(inv.id, p_comentario);
  return jsonb_build_object('resultado', 'ok', 'desplazadas', desplazadas);
end;
$$;

create or replace function public.aceptar_aqui_en_su_lugar(p_member_id uuid, p_invitacion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inv public.invitations;
  c record;
  vacantes integer := 0;
  n integer;
  dejo jsonb := '[]'::jsonb;
  desplazadas jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_member_id::text, 0));

  select * into inv from public.invitations where id = p_invitacion_id and member_id = p_member_id for update;
  if inv.id is null then return jsonb_build_object('resultado', 'no_existe'); end if;
  if inv.sent_at is null then return jsonb_build_object('resultado', 'no_enviada'); end if;
  if inv.team_id is null then return jsonb_build_object('resultado', 'sin_equipo'); end if;
  if inv.status = 'confirmado' then return jsonb_build_object('resultado', 'ya_confirmada'); end if;

  -- Salir de un equipo NO es una baja de nómina: la persona lo eligió. Vale solo dentro de esta transacción.
  perform set_config('ancora.sin_aviso', 'on', true);

  for c in select * from public.convocatorias_en_conflicto(inv.id) where status = 'confirmado' loop
    -- 1) esa confirmación pasa a «aceptó en otro equipo» (el trigger devuelve a pendiente lo que ELLA había desplazado, esta incluida)
    update public.invitations
       set status = 'declinado', declined_reason = 'conflict', superseded_by = inv.id, needs_reassignment_confirm = false, confirmed_position_ids = null
     where id = c.id;
    -- 2) sus posiciones quedan VACANTES (la fila se conserva: el líder de ese equipo las ve sin cubrir)
    update public.banda_assignments b
       set member_id = null
      from public.team_positions tp
     where tp.id = b.team_position_id and tp.team_id = c.team_id and b.service_id = c.service_id and b.member_id = p_member_id;
    get diagnostics n = row_count;
    vacantes := vacantes + n;
    dejo := dejo || jsonb_build_array(jsonb_build_object('invitacion', c.id, 'equipo', c.team_id, 'servicio', c.service_id));
  end loop;

  desplazadas := public.confirmar_convocatoria(inv.id, null);
  return jsonb_build_object('resultado', 'ok', 'dejo', dejo, 'vacantes', vacantes, 'desplazadas', desplazadas);
end;
$$;

create or replace function public.quitar_confirmacion(p_member_id uuid, p_invitacion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inv public.invitations;
  liberadas jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_member_id::text, 0));

  select * into inv from public.invitations where id = p_invitacion_id and member_id = p_member_id for update;
  if inv.id is null then return jsonb_build_object('resultado', 'no_existe'); end if;
  if inv.status <> 'confirmado' then return jsonb_build_object('resultado', 'no_confirmada'); end if;

  -- Las que ESTA confirmación había desplazado (el trigger las devuelve a pendiente al dejar de estar confirmada).
  select coalesce(jsonb_agg(d.id), '[]'::jsonb) into liberadas from public.invitations d where d.superseded_by = inv.id;

  update public.invitations
     set status = 'pendiente', responded_at = null, comentario = null, confirmed_position_ids = null, needs_reassignment_confirm = false
   where id = inv.id;
  return jsonb_build_object('resultado', 'ok', 'liberadas', liberadas);
end;
$$;

-- Solo la llave de servicio (service_role) puede ejecutarlas: ni el público, ni anon, ni cualquier sesión (authenticated).
revoke all on function public.responder_convocatoria(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.aceptar_aqui_en_su_lugar(uuid, uuid) from public, anon, authenticated;
revoke all on function public.quitar_confirmacion(uuid, uuid) from public, anon, authenticated;
grant execute on function public.responder_convocatoria(uuid, uuid, text, text) to service_role;
grant execute on function public.aceptar_aqui_en_su_lugar(uuid, uuid) to service_role;
grant execute on function public.quitar_confirmacion(uuid, uuid) to service_role;

-- Las internas y las de trigger: nadie las llama a mano.
revoke all on function public.convocatorias_se_solapan(time, time, time, time) from public, anon, authenticated;
revoke all on function public.convocatorias_en_conflicto(uuid) from public, anon, authenticated;
revoke all on function public.tiene_posiciones_en_equipo(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.liberar_desplazadas(uuid) from public, anon, authenticated;
revoke all on function public.confirmar_convocatoria(uuid, text) from public, anon, authenticated;
revoke all on function public.clear_declined_reason() from public, anon, authenticated;
revoke all on function public.release_superseded() from public, anon, authenticated;

-- ───────────────────────────────────────
-- PASO 5 — las dos funciones de AVISO, definidas desde el repo (los triggers NO se tocan: siguen apagados)
-- ───────────────────────────────────────
-- La URL y el secreto son un MARCADOR: «.invalid» es un dominio reservado que nunca resuelve. Se reconectan en la fase de notificaciones.

-- Una declinación por CONFLICTO no avisa al líder «no podrá asistir».
create or replace function public.notify_rsvp_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status
     and new.status in ('confirmado', 'declinado')
     and not (new.status = 'declinado' and new.declined_reason is not distinct from 'conflict') then   -- is not distinct: con motivo NULL la comparación con = daría NULL y callaría TODA declinación
    perform net.http_post(
      url := 'https://REEMPLAZAR-EN-LA-FASE-DE-NOTIFICACIONES.invalid/api/rsvp-notify',
      body := jsonb_build_object(
        'memberId', new.member_id,
        'serviceId', new.service_id,
        'teamId', new.team_id,
        'status', new.status,
        'declinedReason', new.declined_reason
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', 'REEMPLAZAR-EN-LA-FASE-DE-NOTIFICACIONES'
      )
    );
  end if;
  return new;
end;
$$;

-- Salir de un equipo con «Aceptar aquí en su lugar» no es una baja de nómina: no avisa (la transacción marca ancora.sin_aviso).
create or replace function public.notify_nomina_removal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected_service_id uuid;
  removed_member_id uuid;
begin
  if coalesce(current_setting('ancora.sin_aviso', true), '') = 'on' then
    if TG_OP = 'DELETE' then return old; else return new; end if;
  end if;

  if TG_OP = 'DELETE' then
    affected_service_id := old.service_id;
    removed_member_id := old.member_id;
  else -- UPDATE
    affected_service_id := new.service_id;
    if new.member_id is distinct from old.member_id then
      removed_member_id := old.member_id;
    else
      removed_member_id := null;
    end if;
  end if;

  -- No avisar si el servicio completo se está borrando (cascada), o si en realidad no hubo nadie removido de esa posición.
  if removed_member_id is not null and exists (select 1 from public.services where id = affected_service_id) then
    perform net.http_post(
      url := 'https://REEMPLAZAR-EN-LA-FASE-DE-NOTIFICACIONES.invalid/api/nomina-notify',
      body := jsonb_build_object('memberId', removed_member_id, 'serviceId', affected_service_id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', 'REEMPLAZAR-EN-LA-FASE-DE-NOTIFICACIONES'
      )
    );
  end if;

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

commit;


-- ───────────────────────────────────────
-- VERIFICACIONES (descomenta y corre una por una; ninguna escribe)
-- ───────────────────────────────────────

-- a · columnas, reglas e índice
-- select column_name, is_nullable from information_schema.columns where table_name = 'invitations' and column_name in ('declined_reason', 'superseded_by');   -- las dos YES
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--  where conrelid = 'public.invitations'::regclass and (conname in ('invitations_declined_reason_ck', 'invitations_superseded_by_ck') or contype = 'f');
--   -- superseded_by → invitations(id) ON DELETE SET NULL; los dos CHECK
-- select indexname from pg_indexes where tablename = 'invitations' and indexname = 'idx_invitations_superseded_by';

-- b · las tres funciones públicas: las ejecuta service_role y NO anon ni authenticated (el público tampoco)
-- select p.proname,
--        has_function_privilege('service_role', p.oid, 'execute')  as service_role,   -- true, true, true
--        has_function_privilege('authenticated', p.oid, 'execute') as authenticated,  -- false, false, false
--        has_function_privilege('anon', p.oid, 'execute')          as anon            -- false, false, false
--   from pg_proc p where p.pronamespace = 'public'::regnamespace
--    and p.proname in ('responder_convocatoria', 'aceptar_aqui_en_su_lugar', 'quitar_confirmacion');

-- c · LOS CUATRO TRIGGERS DE AVISO SIGUEN APAGADOS: las 4 filas deben decir 'D' (disabled). Si alguna dice 'O', apágala con
--     alter table <tabla> disable trigger <nombre>;
-- select t.tgname, t.tgrelid::regclass as tabla, p.proname as funcion, t.tgenabled
--   from pg_trigger t join pg_proc p on p.oid = t.tgfoid
--  where p.proname in ('notify_chat_message', 'notify_rsvp_change', 'notify_setlist_change', 'notify_nomina_removal') and not t.tgisinternal
--  order by p.proname;

-- d · SIN URL REAL en las dos funciones que esta migración redefine: ambas llevan el marcador y ninguna contiene una dirección real.
--     (notify_chat_message y notify_setlist_change NO se tocan aquí: siguen con su URL vieja, apagadas, hasta la fase de notificaciones.)
-- select proname from pg_proc where proname in ('notify_rsvp_change', 'notify_nomina_removal') and prosrc like '%REEMPLAZAR-EN-LA-FASE-DE-NOTIFICACIONES%';   -- las 2
-- select proname from pg_proc where proname in ('notify_rsvp_change', 'notify_nomina_removal') and prosrc ~* 'vercel\.app|supabase\.co';                       -- 0 filas

-- e · los triggers nuevos están ACTIVOS ('O')
-- select tgname, tgenabled from pg_trigger where tgname in ('trg_clear_declined_reason', 'trg_release_superseded') and not tgisinternal;

-- f · todas las funciones nuevas tienen search_path fijo
-- select proname, proconfig from pg_proc where pronamespace = 'public'::regnamespace
--  and proname in ('responder_convocatoria', 'aceptar_aqui_en_su_lugar', 'quitar_confirmacion', 'confirmar_convocatoria', 'liberar_desplazadas',
--                  'convocatorias_en_conflicto', 'tiene_posiciones_en_equipo', 'clear_declined_reason', 'release_superseded');

-- g · el horario: solape estricto (devuelve true, false, false, false, true)
-- select public.convocatorias_se_solapan('10:00', '12:00', '11:00', '13:00') as se_cruzan,
--        public.convocatorias_se_solapan('10:00', '12:00', '12:00', '14:00') as justo_al_terminar,
--        public.convocatorias_se_solapan('12:00', '10:00', '10:00', '14:00') as fin_menor_que_inicio,
--        public.convocatorias_se_solapan('10:00', '12:00', '13:00', '15:00') as separados,
--        public.convocatorias_se_solapan(null, null, '11:00', '13:00')       as nulos_son_10_a_14;


-- ───────────────────────────────────────
-- REVERTIR (solo si hiciera falta; las declinaciones por conflicto ya hechas quedan como «declinado» sin motivo)
-- ───────────────────────────────────────
-- PASO 1 — antes de borrar nada, devuelve a pendiente lo desplazado:   update public.invitations set status = 'pendiente' where declined_reason = 'conflict';
--          (hazlo ANTES del paso 3; la regla de la columna lo exige) y despliega el código del commit 2.
-- PASO 2 — vuelve a correr supabase-schema-v18 (notify_rsvp_change) y v24 (notify_nomina_removal) con TU URL y TU secreto reales, si ya los habías reconectado.
-- PASO 3 — descomenta y corre:
-- drop trigger if exists trg_release_superseded on public.invitations;
-- drop trigger if exists trg_clear_declined_reason on public.invitations;
-- drop function if exists public.responder_convocatoria(uuid, uuid, text, text);
-- drop function if exists public.aceptar_aqui_en_su_lugar(uuid, uuid);
-- drop function if exists public.quitar_confirmacion(uuid, uuid);
-- drop function if exists public.confirmar_convocatoria(uuid, text);
-- drop function if exists public.liberar_desplazadas(uuid);
-- drop function if exists public.release_superseded();
-- drop function if exists public.clear_declined_reason();
-- drop function if exists public.convocatorias_en_conflicto(uuid);
-- drop function if exists public.tiene_posiciones_en_equipo(uuid, uuid, uuid);
-- drop function if exists public.convocatorias_se_solapan(time, time, time, time);
-- alter table public.invitations drop constraint if exists invitations_superseded_by_ck;
-- alter table public.invitations drop constraint if exists invitations_declined_reason_ck;
-- alter table public.invitations drop column if exists superseded_by;     -- también borra su índice
-- alter table public.invitations drop column if exists declined_reason;
