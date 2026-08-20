-- Envía el aviso push de chat directo desde la base de datos, en el mismo
-- instante que se guarda el mensaje — sin depender de que el navegador de
-- quien escribe siga con la pestaña abierta o la conexión activa.
--
-- Cómo correrlo: Supabase → tu proyecto → SQL Editor → pegar y ejecutar
-- TODO el archivo de una vez.

-- 1) Extensión que le permite a Postgres hacer llamadas HTTP (ya viene
--    disponible en todos los proyectos de Supabase, solo hay que activarla).
create extension if not exists pg_net;

-- 2) Función que se ejecuta automáticamente después de cada mensaje nuevo.
--    IMPORTANTE: reemplaza el valor de x-internal-secret por el mismo que
--    pongas en Vercel como INTERNAL_API_SECRET (ver instrucciones abajo).
create or replace function public.notify_chat_message()
returns trigger
language plpgsql
security definer
as $$
begin
  -- VERSIÓN DE PRUEBA: comentado para que un INSERT en esta base de prueba
  -- no dispare una llamada HTTP real contra la app de producción. Se deja
  -- comentado (no borrado) para poder ver exactamente qué hacía el original.
  /*
  perform net.http_post(
    url := 'https://ancora-setlist.vercel.app/api/chat-notify',
    body := jsonb_build_object(
      'serviceId', new.service_id,
      'senderMemberId', new.member_id,
      'content', new.content
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', 'TU_INTERNAL_API_SECRET_AQUI'
    )
  );
  */
  return new;
end;
$$;

-- 3) El trigger propiamente dicho: se dispara después de cada INSERT en messages.
drop trigger if exists trg_notify_chat_message on messages;
create trigger trg_notify_chat_message
  after insert on messages
  for each row
  execute function public.notify_chat_message();

-- ────────────────────────────────────────────────────────────────────
-- Verificación rápida después de correr esto:
--   1. Manda un mensaje de chat en la app.
--   2. Corre esta consulta — debería aparecer una fila reciente con tu envío:
--        select * from net._http_response order by created desc limit 5;
--   3. Si el "status_code" no es 200, revisa el "content" de esa fila para
--      ver el error que devolvió la app (por ejemplo, si el secreto no coincide).
-- ────────────────────────────────────────────────────────────────────
