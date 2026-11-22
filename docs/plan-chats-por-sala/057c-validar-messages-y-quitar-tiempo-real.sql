-- 057c · Chats por sala — PARTE C: la base valida lo que se escribe en `messages` y deja de transmitirlo por tiempo real.  PARA REVISIÓN: no corrida.
--
-- NO CORRER hasta que el código nuevo (rutas del chat y panel de moderación) esté en `main`: esta parte es MÁS ESTRICTA que el código de hoy y haría fallar a main en estos casos:
--   · un ensayo futuro al que la persona no fue convocada (hoy el servidor se lo deja leer y escribir a cualquiera), o un servicio que ya declinó;
--   · escribir en el chat de un servicio pasado de las últimas 24 h (hoy el chat de un servicio desaparece al terminar, así que ese caso no existe).
-- QUÉ HACE: (1) un disparador BEFORE INSERT en `messages` que rechaza: directos entre personas de organizaciones distintas, mensajes de servicio de quien no sirve ese servicio (o fuera de ventana) y mensajes
--           generales de quien no tiene organización; (2) saca `messages` de la publicación de tiempo real (el portal consulta al servidor; el panel de moderación pasará a consultar cada pocos segundos).
-- IDEMPOTENTE. Va después del disparador de aviso push (que es AFTER INSERT): primero valida, después avisa.
begin;

do $$
begin
  if to_regprocedure('public.chat_puede_servicio(uuid,uuid,boolean)') is null then raise exception 'Falta correr 057a antes que 057c'; end if;
end $$;

create or replace function public.messages_valida() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  if new.recipient_member_id is not null and new.service_id is not null then
    raise exception 'Un mensaje no puede ser directo y de servicio a la vez' using errcode = '23514';
  elsif new.recipient_member_id is not null then
    if not exists (select 1 from public.members a join public.members b on b.organization_id = a.organization_id
                    where a.id = new.member_id and b.id = new.recipient_member_id) then
      raise exception 'Los mensajes directos son solo entre personas de la misma organización' using errcode = '42501';
    end if;
  elsif new.service_id is not null then
    if not public.chat_puede_servicio(new.member_id, new.service_id, true) then
      raise exception 'La persona no sirve ese servicio (o el chat ya cerró)' using errcode = '42501';
    end if;
  else
    if not public.chat_es_miembro_general(new.member_id) then
      raise exception 'La persona no pertenece a una organización' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.messages_valida() from public, anon, authenticated;
drop trigger if exists trg_messages_valida on public.messages;
create trigger trg_messages_valida before insert on public.messages for each row execute function public.messages_valida();

do $$
begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime drop table public.messages;
  end if;
end $$;

commit;
