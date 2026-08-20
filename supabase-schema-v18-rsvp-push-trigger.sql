-- Avisa por push a los administradores cuando alguien confirma o declina su
-- participación en un servicio — sin importar por cuál de los dos caminos
-- se actualizó la invitación (el link del correo o el portal), porque el
-- aviso lo dispara la base de datos directo, no el navegador de quien responde.
--
-- Cómo correrlo: Supabase → tu proyecto → SQL Editor → pegar y ejecutar todo.

create or replace function public.notify_rsvp_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status is distinct from old.status and new.status in ('confirmado','declinado') then
    perform net.http_post(
      url := 'https://ancora-setlist.vercel.app/api/rsvp-notify',
      body := jsonb_build_object(
        'memberId', new.member_id,
        'serviceId', new.service_id,
        'status', new.status
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', 'TU_INTERNAL_API_SECRET_AQUI'
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_rsvp_change on invitations;
create trigger trg_notify_rsvp_change
  after update on invitations
  for each row
  execute function public.notify_rsvp_change();

-- ────────────────────────────────────────────────────────────────────
-- Verificación rápida: después de que alguien confirme/decline una
-- convocatoria, corre esto — debería aparecer una fila reciente:
--   select * from net._http_response order by created desc limit 5;
-- ────────────────────────────────────────────────────────────────────
