-- Punto 3 del sistema de notificaciones: si un músico ya confirmó su
-- convocatoria en un instrumento/posición específica y el admin lo cambia a
-- otro, no debe quedar asumido como aceptado — se marca para que el admin
-- decida manualmente cuándo reinvitarlo (botón "Reinvitar" en el panel).
--
-- Cómo correrlo: Supabase → tu proyecto → SQL Editor → pegar y ejecutar todo.

-- 1) Columnas nuevas en invitations.
alter table invitations add column if not exists confirmed_posiciones text[];
alter table invitations add column if not exists needs_reassignment_confirm boolean not null default false;

-- 2) Trigger A — cada vez que una invitación pasa a "confirmado", guarda
--    una foto de qué posiciones tenía el músico en ese instante. También
--    limpia la bandera de reasignación pendiente (una confirmación nueva
--    reemplaza cualquier aviso pendiente anterior).
create or replace function public.snapshot_confirmed_posiciones()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'confirmado' and (old.status is distinct from new.status) then
    select array_agg(posicion order by posicion) into new.confirmed_posiciones
    from banda_assignments
    where service_id = new.service_id and member_id = new.member_id;
    new.needs_reassignment_confirm := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_snapshot_confirmed_posiciones on invitations;
create trigger trg_snapshot_confirmed_posiciones
  before update on invitations
  for each row
  execute function public.snapshot_confirmed_posiciones();

-- 3) Trigger B — cuando cambia una fila de banda_assignments, revisa si el
--    músico afectado (el que tenía la posición antes y/o el que la tiene
--    ahora) sigue teniendo las mismas posiciones que había confirmado. Si
--    ya no coinciden, SOLO marca la bandera — no manda nada solo. El admin
--    decide cuándo avisar con el botón "Reinvitar".
create or replace function public.flag_reassignment_if_changed()
returns trigger
language plpgsql
security definer
as $$
declare
  affected_service_id uuid := coalesce(new.service_id, old.service_id);
  affected_member_id uuid;
  current_posiciones text[];
  inv record;
begin
  -- No hacer nada si el servicio completo se está borrando (cascada).
  if not exists (select 1 from services where id = affected_service_id) then
    return coalesce(new, old);
  end if;

  for affected_member_id in
    select distinct m from (
      select old.member_id as m
      union
      select new.member_id as m
    ) t
    where m is not null
  loop
    select array_agg(posicion order by posicion) into current_posiciones
    from banda_assignments
    where service_id = affected_service_id and member_id = affected_member_id;

    select * into inv from invitations
    where service_id = affected_service_id and member_id = affected_member_id;

    if inv.id is not null and inv.status = 'confirmado' then
      update invitations
        set needs_reassignment_confirm = (current_posiciones is distinct from inv.confirmed_posiciones)
        where id = inv.id;
    end if;
  end loop;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_flag_reassignment_if_changed on banda_assignments;
create trigger trg_flag_reassignment_if_changed
  after insert or update or delete on banda_assignments
  for each row
  execute function public.flag_reassignment_if_changed();

-- ────────────────────────────────────────────────────────────────────
-- Verificación rápida:
--   1. Que alguien confirme su convocatoria.
--   2. Cambia su posición/instrumento en el panel de admin.
--   3. select status, confirmed_posiciones, needs_reassignment_confirm
--      from invitations where member_id = '...' and service_id = '...';
--      → needs_reassignment_confirm debería quedar en true.
-- ────────────────────────────────────────────────────────────────────
