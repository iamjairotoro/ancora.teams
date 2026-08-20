-- Punto 1 del sistema de notificaciones: si alguien ya confirmó su
-- convocatoria y después se modifica el setlist de ese servicio, recibe un
-- aviso push. La tabla real del setlist que usa el admin es service_blocks
-- (NO setlist_items, que quedó legacy y ya no se escribe).
--
-- Anti-spam: reordenar el setlist dispara un UPDATE por cada canción — sin
-- esto, un solo reordenamiento mandaría una notificación por canción. Por
-- eso se guarda cuándo fue el último aviso de este servicio y solo se manda
-- uno nuevo si pasaron 3 minutos o más desde el anterior.
--
-- Cómo correrlo: Supabase → tu proyecto → SQL Editor → pegar y ejecutar todo.

-- 1) Columna para el debounce.
alter table services add column if not exists last_setlist_notified_at timestamptz;

-- 2) Trigger — mismo cuidado que en v22: nunca tocar OLD/NEW sin revisar
--    TG_OP primero, ni siquiera en el return.
create or replace function public.notify_setlist_change()
returns trigger
language plpgsql
security definer
as $$
declare
  affected_service_id uuid;
  last_notified timestamptz;
begin
  if TG_OP = 'DELETE' then
    affected_service_id := old.service_id;
  else
    affected_service_id := new.service_id;
  end if;

  -- No hacer nada si el servicio completo se está borrando (cascada).
  if not exists (select 1 from services where id = affected_service_id) then
    if TG_OP = 'DELETE' then return old; else return new; end if;
  end if;

  select last_setlist_notified_at into last_notified
  from services where id = affected_service_id;

  if last_notified is null or now() - last_notified >= interval '3 minutes' then
    update services set last_setlist_notified_at = now() where id = affected_service_id;

    perform net.http_post(
      url := 'https://ancora-setlist.vercel.app/api/setlist-notify',
      body := jsonb_build_object('serviceId', affected_service_id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', 'TU_INTERNAL_API_SECRET_AQUI'
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

drop trigger if exists trg_notify_setlist_change on service_blocks;
create trigger trg_notify_setlist_change
  after insert or update or delete on service_blocks
  for each row
  execute function public.notify_setlist_change();

-- ────────────────────────────────────────────────────────────────────
-- Verificación rápida:
--   1. Que alguien confirme su convocatoria a un servicio.
--   2. Edita/agrega/borra una canción del setlist de ese servicio (o
--      reordénalo) desde el admin.
--   3. select * from net._http_response order by created desc limit 5;
--      → debería aparecer una fila reciente con status_code 200.
--   4. Prueba editar varias canciones seguidas (< 3 min entre cada una)
--      y confirma que solo llega UN push, no uno por canción.
-- ────────────────────────────────────────────────────────────────────
