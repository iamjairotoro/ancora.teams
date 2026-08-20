-- Punto 2 del sistema de notificaciones: cuando a alguien le quitan la
-- posición que tenía asignada en un servicio (sin importar si sigue
-- teniendo otras posiciones ese mismo día, y sin importar el estado de su
-- invitación), recibe un aviso push con un tono suave.
--
-- Solo UPDATE/DELETE — un INSERT nunca le quita el puesto a nadie, así que
-- no hace falta escuchar ese caso. Igual que en v22/v23: nunca tocar OLD/NEW
-- sin revisar TG_OP primero, ni siquiera en el return.
--
-- Cómo correrlo: Supabase → tu proyecto → SQL Editor → pegar y ejecutar todo.

create or replace function public.notify_nomina_removal()
returns trigger
language plpgsql
security definer
as $$
declare
  affected_service_id uuid;
  removed_member_id uuid;
begin
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

  -- No avisar si el servicio completo se está borrando (cascada), o si en
  -- realidad no hubo nadie removido de esa posición.
  if removed_member_id is not null and exists (select 1 from services where id = affected_service_id) then
    perform net.http_post(
      url := 'https://ancora-setlist.vercel.app/api/nomina-notify',
      body := jsonb_build_object('memberId', removed_member_id, 'serviceId', affected_service_id),
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

drop trigger if exists trg_notify_nomina_removal on banda_assignments;
create trigger trg_notify_nomina_removal
  after update or delete on banda_assignments
  for each row
  execute function public.notify_nomina_removal();

-- ────────────────────────────────────────────────────────────────────
-- Verificación rápida:
--   1. Asigna a alguien una posición, después cámbiala a otra persona (o
--      bórrala).
--   2. select * from net._http_response order by created desc limit 5;
--      → debería aparecer una fila reciente con status_code 200.
--   3. Confirma que le llegó el push a quien perdió el puesto.
-- ────────────────────────────────────────────────────────────────────
