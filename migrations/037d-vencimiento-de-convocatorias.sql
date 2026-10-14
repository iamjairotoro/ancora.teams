-- ============================================================
-- 037d — El VENCIMIENTO de las convocatorias (punto 52, commit 5)
--
-- REGLA: una convocatoria se puede responder hasta el FINAL DEL DÍA DEL SERVICIO, en la hora de America/Santiago. Desde las 00:00 del día siguiente
-- (hora de Chile) ya no: «Esta convocatoria ya cerró». Vale para servicios y ensayos (los dos tienen services.fecha). La administración NO se bloquea:
-- el líder puede seguir asignando y reasignando; lo que se cierra es lo que HACE LA PERSONA (confirmar, «no puedo», «Aceptar aquí en su lugar»,
-- «Quitar mi confirmación»). Después del cierre la persona no puede cambiar nada, ni siquiera quitar su confirmación.
--
-- DÓNDE SE APLICA: en la BASE, dentro de las funciones que ya son el único camino de respuesta. Así ninguna ruta ni pantalla puede saltársela.
--
-- QUÉ HACE:
--   0 · GUARDA: comprueba EN VIVO que services.fecha sea de tipo `date`. Si fuera texto u otra cosa, la migración se detiene con un mensaje claro
--       (el repo dice `date` en supabase-schema.sql y la 024 ya aplicada resta fechas; pero el repo es una reconstrucción de la base real: se comprueba la real).
--   1 · UNA función nueva (interna, nadie la llama a mano):
--         convocatoria_cerrada(p_service_id uuid, p_ahora timestamptz default now())  →  boolean
--             verdadero si (p_ahora en America/Santiago)::date > services.fecha. Se compara FECHA contra FECHA, no horas: así el cambio de horario de
--             Chile (que ocurre a medianoche) no mueve el cierre. Un servicio que no existe da falso (la función que llama ya responde «no existe»).
--             p_ahora existe para poder probar los bordes con instantes concretos; en producción nadie lo pasa y vale now().
--   2 · Las TRES funciones públicas se redefinen desde el repo (create or replace, mismos permisos: SOLO service_role) y devuelven
--       {"resultado": "cerrada"} ANTES de tocar nada:
--         responder_convocatoria(persona, invitación, 'si'|'no', comentario)   — el «no» sobre una confirmada es el «Declinar» normal
--         aceptar_aqui_en_su_lugar(persona, invitación)
--         quitar_confirmacion(persona, invitación)
--       El resto del cuerpo es IDÉNTICO al de la 037c (bloqueo por persona incluido): solo se añade el chequeo del cierre.
--       Las convocatorias que chocan con una son siempre del MISMO día (esa es la regla del conflicto), así que si una está abierta todas lo están.
--
-- NO TOCA: ninguna función de aviso (notify_*), ningún trigger, ninguna tabla ni columna. LOS CUATRO TRIGGERS DE AVISO SIGUEN APAGADOS ('D'): la
-- verificación comentada (b) lo comprueba. Esta migración no los crea, borra ni enciende.
--
-- ORDEN: la 037a, 037b y 037c ya aplicadas. Correr ANTES de desplegar el código del commit 5 (las rutas ya saben leer «cerrada»; sin la migración
-- simplemente nunca la reciben, así que desplegar primero tampoco rompe nada, pero el cierre no existiría). Corre en una transacción.
-- Córrela primero en «Ancora - TEST».
--
-- ANTES de correrla (opcional, solo lectura): el tipo real de la columna →
--   select data_type from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'fecha';   -- date
-- ============================================================

begin;

-- ───────────────────────────────────────
-- PASO 0 — guarda: services.fecha tiene que ser date
-- ───────────────────────────────────────
do $$
declare
  tipo text;
begin
  select data_type into tipo from information_schema.columns
   where table_schema = 'public' and table_name = 'services' and column_name = 'fecha';
  if tipo is distinct from 'date' then
    raise exception '037d: services.fecha es de tipo % y esta migración espera date. No se aplicó nada: avisa para escribir la conversión explícita.', coalesce(tipo, '(no existe)');
  end if;
end $$;

-- ───────────────────────────────────────
-- PASO 1 — la regla del cierre
-- ───────────────────────────────────────
create or replace function public.convocatoria_cerrada(p_service_id uuid, p_ahora timestamptz default now())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select (p_ahora at time zone 'America/Santiago')::date > s.fecha from public.services s where s.id = p_service_id),
    false);
$$;

revoke all on function public.convocatoria_cerrada(uuid, timestamptz) from public, anon, authenticated;

-- ───────────────────────────────────────
-- PASO 2 — las tres funciones públicas, con el chequeo del cierre (el resto, idéntico a la 037c)
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
  -- 037d: pasado el día del servicio (hora de Chile) la persona ya no cambia nada, ni el «no puedo».
  if public.convocatoria_cerrada(inv.service_id) then return jsonb_build_object('resultado', 'cerrada'); end if;

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
  -- 037d: cerrada manda sobre «ya_confirmada»: después del día del servicio no se puede cambiar nada.
  if public.convocatoria_cerrada(inv.service_id) then return jsonb_build_object('resultado', 'cerrada'); end if;
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
  -- 037d: pasado el día del servicio, tampoco se puede quitar la confirmación.
  if public.convocatoria_cerrada(inv.service_id) then return jsonb_build_object('resultado', 'cerrada'); end if;
  if inv.status <> 'confirmado' then return jsonb_build_object('resultado', 'no_confirmada'); end if;

  -- Las que ESTA confirmación había desplazado (el trigger las devuelve a pendiente al dejar de estar confirmada).
  select coalesce(jsonb_agg(d.id), '[]'::jsonb) into liberadas from public.invitations d where d.superseded_by = inv.id;

  update public.invitations
     set status = 'pendiente', responded_at = null, comentario = null, confirmed_position_ids = null, needs_reassignment_confirm = false
   where id = inv.id;
  return jsonb_build_object('resultado', 'ok', 'liberadas', liberadas);
end;
$$;

-- Mismos permisos que en la 037c: solo la llave de servicio (create or replace los conserva; se repiten para que esta migración se baste sola).
revoke all on function public.responder_convocatoria(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.aceptar_aqui_en_su_lugar(uuid, uuid) from public, anon, authenticated;
revoke all on function public.quitar_confirmacion(uuid, uuid) from public, anon, authenticated;
grant execute on function public.responder_convocatoria(uuid, uuid, text, text) to service_role;
grant execute on function public.aceptar_aqui_en_su_lugar(uuid, uuid) to service_role;
grant execute on function public.quitar_confirmacion(uuid, uuid) to service_role;

commit;

-- ============================================================
-- VERIFICACIÓN (cada consulta por separado, en una pestaña nueva; todas SOLO LEEN)
-- ============================================================

-- a · el tipo de la columna (el que la guarda ya comprobó): date
-- select data_type from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'fecha';

-- b · LOS CUATRO TRIGGERS DE AVISO SIGUEN APAGADOS: las 4 filas deben decir 'D' (disabled). Si alguna dice 'O', apágala con
--     alter table <tabla> disable trigger <nombre>;
-- select t.tgname, t.tgrelid::regclass as tabla, p.proname as funcion, t.tgenabled
--   from pg_trigger t join pg_proc p on p.oid = t.tgfoid
--  where p.proname in ('notify_chat_message', 'notify_rsvp_change', 'notify_setlist_change', 'notify_nomina_removal') and not t.tgisinternal
--  order by p.proname;

-- c · permisos: las 3 públicas SOLO las ejecuta service_role; convocatoria_cerrada, nadie de afuera
-- select p.proname,
--        has_function_privilege('service_role', p.oid, 'execute')  as service_role,   -- true, true, true, false
--        has_function_privilege('authenticated', p.oid, 'execute') as authenticated,  -- false en las 4
--        has_function_privilege('anon', p.oid, 'execute')          as anon            -- false en las 4
--   from pg_proc p where p.pronamespace = 'public'::regnamespace
--    and p.proname in ('responder_convocatoria', 'aceptar_aqui_en_su_lugar', 'quitar_confirmacion', 'convocatoria_cerrada')
--  order by p.proname;

-- d · las 3 públicas ya llaman a convocatoria_cerrada, y todas tienen search_path fijo (3 filas, las tres con true)
-- select proname, prosrc like '%convocatoria_cerrada%' as chequea_el_cierre, proconfig
--   from pg_proc where pronamespace = 'public'::regnamespace and proname in ('responder_convocatoria', 'aceptar_aqui_en_su_lugar', 'quitar_confirmacion');

-- e · la regla con instantes concretos sobre UN servicio real (el más reciente). Esperado: false, false, true
--     (a mediodía del día del servicio; al último segundo de ese día; y a la medianoche siguiente, hora de Chile).
-- with s as (select id, fecha from public.services order by fecha desc limit 1)
-- select public.convocatoria_cerrada(s.id, (s.fecha::timestamp + interval '12 hours') at time zone 'America/Santiago')                  as mediodia_abierta,
--        public.convocatoria_cerrada(s.id, ((s.fecha + 1)::timestamp - interval '1 second') at time zone 'America/Santiago')            as ultimo_segundo_abierta,
--        public.convocatoria_cerrada(s.id, ((s.fecha + 1)::timestamp + interval '1 hour') at time zone 'America/Santiago')              as una_hora_despues_cerrada
--   from s;
--     (una hora DESPUÉS de la medianoche en vez de la medianoche exacta: el cambio de horario de Chile puede dejar esa hora sin existir.)
