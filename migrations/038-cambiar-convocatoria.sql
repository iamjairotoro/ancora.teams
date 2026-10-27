-- ============================================================
-- 038 — «Cambiar» de convocatoria SIN vaciar las posiciones (punto 4: convocado a dos equipos)
--
-- PROBLEMA: «Aceptar aquí en su lugar» (037c/037d, `aceptar_aqui_en_su_lugar`) saca a la persona de las posiciones del equipo que deja (quedan VACANTES). Sirve cuando
-- llega una convocatoria nueva que choca con una ya confirmada, pero NO sirve para «Cambiar» entre dos equipos que te convocaron a la vez: ir de Alabanza a Producción y
-- volver a Alabanza dejaría a Alabanza confirmada SIN tus posiciones. La regla decidida es: el equipo que se deja queda como rechazo AUTOMÁTICO con su nombre
-- (declined_reason = 'conflict', superseded_by = la que se confirma), con sus posiciones intactas, y por eso el cambio es reversible las veces que haga falta.
--
-- QUÉ HACE (una sola función, nada más):
--   cambiar_convocatoria(p_member_id uuid, p_desde_id uuid, p_hacia_id uuid)  →  jsonb
--     p_desde_id = la convocatoria CONFIRMADA que se deja.   p_hacia_id = la declinada POR CONFLICTO CON ESA MISMA (superseded_by = desde) que se confirma.
--     En UNA transacción, con el bloqueo por persona de siempre (pg_advisory_xact_lock):
--       1 · desde pasa a «declinado» por conflicto (superseded_by = hacia); sus posiciones NO se tocan.
--       2 · hacia se confirma (confirmar_convocatoria: las demás PENDIENTES que chocan quedan declinadas por conflicto, igual que al confirmar normalmente).
--       3 · COMPROBACIÓN FINAL: se vuelve a leer el estado y, si hacia no quedó confirmada, desde no quedó declinada por conflicto (enlazada a hacia) o quedó otra
--           convocatoria confirmada que choca, la función LANZA UNA EXCEPCIÓN y Postgres deshace todo. `confirmar_convocatoria` no devuelve errores como dato (solo
--           falla lanzando excepciones, que ya abortan), así que esta comprobación es la garantía de que la persona nunca queda con ninguna confirmada ni con dos.
--     Devuelve {"resultado": …}:  ok · misma · no_existe · no_enviada · sin_equipo · cerrada · desde_no_confirmada · hacia_no_declinada_por_conflicto ·
--                                 hacia_no_declinada_por_desde · no_chocan · sin_posiciones
--       no_existe  → alguna de las dos no existe o no es de esa persona (la ruta del servidor resuelve la persona; el navegador nunca la manda)
--       cerrada    → pasó el día del servicio (037d: `convocatoria_cerrada`); después del cierre la persona no cambia nada
--       hacia_no_declinada_por_conflicto → hacia no está declinada por conflicto (una que la persona rechazó ella misma se confirma con el «Confirmo» normal)
--       hacia_no_declinada_por_desde     → hacia fue declinada por conflicto, pero por OTRA confirmación (superseded_by distinto de desde)
--       no_chocan  → las dos no se cruzan (mismo día y horas que se traslapan, `convocatorias_en_conflicto`): no hay nada que cambiar
--       sin_posiciones → la persona ya no tiene posiciones en el equipo al que quiere volver (alguien más las ocupó, o salió con «Aceptar aquí en su lugar»)
--     Salir de un equipo así NO es una baja de nómina: `ancora.sin_aviso` = 'on' dentro de la transacción (igual que «Aceptar aquí en su lugar»).
--
-- NO TOCA: ninguna tabla ni columna, ningún trigger, ninguna función existente ni de aviso (notify_*). LOS CUATRO TRIGGERS DE AVISO SIGUEN APAGADOS ('D').
-- PERMISOS: SOLO service_role puede ejecutarla (revoke a public, anon y authenticated), como las otras tres funciones públicas de convocatorias.
-- ORDEN: la 037a, 037b, 037c y 037d ya aplicadas (la consulta B1 de verificación lo comprueba). Córrela ANTES de desplegar el commit que usa la ruta nueva
-- (/api/portal/cambiar-convocatoria). La base es una sola, «Ancora - Teams»: no hay otra donde probar; por eso la prueba (bloque C, fuera de este archivo) se deshace sola.
-- ============================================================

create or replace function public.cambiar_convocatoria(p_member_id uuid, p_desde_id uuid, p_hacia_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  desde public.invitations;
  hacia public.invitations;
  desplazadas jsonb;
  estado_desde text;
  motivo_desde text;
  enlace_desde uuid;
  estado_hacia text;
  confirmadas_que_chocan integer;
begin
  if p_desde_id is null or p_hacia_id is null or p_desde_id = p_hacia_id then
    return jsonb_build_object('resultado', 'misma');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_member_id::text, 0));

  perform 1 from public.invitations where id in (p_desde_id, p_hacia_id) and member_id = p_member_id order by id for update;
  select * into desde from public.invitations where id = p_desde_id and member_id = p_member_id;
  select * into hacia from public.invitations where id = p_hacia_id and member_id = p_member_id;

  if desde.id is null or hacia.id is null then return jsonb_build_object('resultado', 'no_existe'); end if;
  if desde.sent_at is null or hacia.sent_at is null then return jsonb_build_object('resultado', 'no_enviada'); end if;
  if desde.team_id is null or hacia.team_id is null then return jsonb_build_object('resultado', 'sin_equipo'); end if;
  if public.convocatoria_cerrada(desde.service_id) or public.convocatoria_cerrada(hacia.service_id) then return jsonb_build_object('resultado', 'cerrada'); end if;
  if desde.status <> 'confirmado' then return jsonb_build_object('resultado', 'desde_no_confirmada'); end if;
  if not (hacia.status = 'declinado' and hacia.declined_reason = 'conflict') then return jsonb_build_object('resultado', 'hacia_no_declinada_por_conflicto'); end if;
  if hacia.superseded_by is distinct from desde.id then return jsonb_build_object('resultado', 'hacia_no_declinada_por_desde'); end if;
  if not exists (select 1 from public.convocatorias_en_conflicto(desde.id) c where c.id = hacia.id) then return jsonb_build_object('resultado', 'no_chocan'); end if;
  if not public.tiene_posiciones_en_equipo(hacia.service_id, p_member_id, hacia.team_id) then return jsonb_build_object('resultado', 'sin_posiciones'); end if;

  perform set_config('ancora.sin_aviso', 'on', true);

  update public.invitations
     set status = 'declinado', declined_reason = 'conflict', superseded_by = hacia.id, needs_reassignment_confirm = false, confirmed_position_ids = null
   where id = desde.id;

  desplazadas := public.confirmar_convocatoria(hacia.id, null);

  select status, declined_reason, superseded_by into estado_desde, motivo_desde, enlace_desde from public.invitations where id = desde.id;
  select status into estado_hacia from public.invitations where id = hacia.id;
  select count(*) into confirmadas_que_chocan from public.convocatorias_en_conflicto(hacia.id) c where c.status = 'confirmado';

  if estado_hacia is distinct from 'confirmado'
     or estado_desde is distinct from 'declinado'
     or motivo_desde is distinct from 'conflict'
     or enlace_desde is distinct from hacia.id
     or confirmadas_que_chocan <> 0 then
    raise exception 'cambiar_convocatoria: estado final inesperado (desde=%, motivo=%, hacia=%, confirmadas que chocan=%); se deshace todo', estado_desde, motivo_desde, estado_hacia, confirmadas_que_chocan;
  end if;

  return jsonb_build_object('resultado', 'ok', 'desde', desde.id, 'hacia', hacia.id, 'desplazadas', desplazadas);
end;
$$;

revoke all on function public.cambiar_convocatoria(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.cambiar_convocatoria(uuid, uuid, uuid) to service_role;

-- Verificación (solo lectura) y prueba que se deshace sola: bloques B1 a B4 y C, entregados aparte.
-- REVERTIR (solo si hiciera falta; la función no crea tablas ni columnas):
-- drop function if exists public.cambiar_convocatoria(uuid, uuid, uuid);
