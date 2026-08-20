-- Agrega soporte de Mensajes Directos (DM) a la tabla messages existente.
-- Un mensaje es DM cuando recipient_member_id no es null (y service_id sí lo es).
-- Cómo correrlo: Supabase → tu proyecto → SQL Editor → pegar y ejecutar todo.

alter table messages add column if not exists recipient_member_id uuid references members(id) on delete cascade;

create index if not exists messages_dm_sender_idx on messages (member_id, recipient_member_id) where recipient_member_id is not null;
create index if not exists messages_dm_recipient_idx on messages (recipient_member_id, member_id) where recipient_member_id is not null;

-- Actualiza el trigger de push para que también mande el recipient_member_id
-- (necesario para que /api/chat-notify sepa que es un DM y no un chat grupal).
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
      'recipientMemberId', new.recipient_member_id,
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
