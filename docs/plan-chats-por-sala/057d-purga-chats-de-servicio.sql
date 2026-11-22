-- 057d · Chats por sala — PARTE D: borrar los mensajes de servicios pasados a los 90 días.  PARA REVISIÓN: no corrida.
--
-- Decisión de Claudia: los mensajes de un servicio (o ensayo) terminado se borran a los 90 días de su fin. La app los muestra solo 7 días (057a); esto es lo que además los borra de la base.
-- QUÉ HACE: crea la función `chat_purgar_servicios(dias)`, que borra de `messages` los mensajes de SERVICIO (no los generales, no los directos, no los de equipo) cuyo servicio terminó hace más de `dias` días (90 por defecto), y devuelve cuántos borró.
--           El fin se mide en hora de Chile (chat_fin_servicio, de 057a). NO borra servicios ni nada más.
-- NO LA PROGRAMA: ejecutar la función a mano o programarla es una decisión aparte (ver abajo). Solo la ejecuta el servidor (service_role).
-- COMPATIBLE CON `main`: solo agrega una función; no cambia nada existente. Requiere 057a (usa chat_fin_servicio). IDEMPOTENTE (create or replace).
begin;

do $$
begin
  if to_regprocedure('public.chat_fin_servicio(date,time without time zone)') is null then raise exception 'Falta correr 057a antes que 057d'; end if;
end $$;

create or replace function public.chat_purgar_servicios(p_dias integer default 90)
returns integer language plpgsql security definer set search_path = public as
$$ declare n integer;
begin
  if p_dias is null or p_dias < 30 then raise exception 'Por seguridad no se borra con menos de 30 días (recibió %)', p_dias; end if;
  delete from public.messages m
        using public.services s
        where m.service_id = s.id
          and m.recipient_member_id is null
          and public.chat_fin_servicio(s.fecha, s.hora_fin) < now() - make_interval(days => p_dias);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.chat_purgar_servicios(integer) from public, anon, authenticated;
grant execute on function public.chat_purgar_servicios(integer) to service_role;

commit;

-- ── ANTES de ejecutarla por primera vez: cuántos mensajes borraría (solo lectura) ──
--   select count(*) from public.messages m join public.services s on s.id = m.service_id
--    where m.recipient_member_id is null and public.chat_fin_servicio(s.fecha, s.hora_fin) < now() - make_interval(days => 90);
--
-- ── Cómo ejecutarla (a elegir; recomiendo la 1, porque no agrega una ruta pública ni un cron en la app) ──
--   1. pg_cron de Supabase (actívalo en Database → Extensions), una vez por semana, domingo 07:00 UTC:
--        select cron.schedule('chat-purga-servicios', '0 7 * * 0', $$select public.chat_purgar_servicios(90)$$);
--      Para ver lo que corrió:  select * from cron.job_run_details order by start_time desc limit 5;
--   2. A mano, de vez en cuando, desde el SQL Editor:  select public.chat_purgar_servicios(90);
--   3. Una ruta de cron protegida en la app (la menos recomendable: más superficie y hay que cuidar que no corra en producción por error).
