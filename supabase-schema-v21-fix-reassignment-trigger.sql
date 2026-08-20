-- Corrige un bug del trigger de v20 (flag_reassignment_if_changed): tocaba
-- los campos de OLD/NEW sin fijarse en TG_OP. En Postgres, referenciar OLD
-- en un INSERT (o NEW en un DELETE) no da null — lanza el error
-- "record 'old' is not assigned yet" y aborta la operación completa.
--
-- Esto rompía cada vez que se asignaba a alguien una posición por PRIMERA
-- vez en un servicio (eso es un INSERT en banda_assignments, no un UPDATE).
--
-- Cómo correrlo: Supabase → tu proyecto → SQL Editor → pegar y ejecutar todo.
-- Reemplaza por completo la función del mismo nombre creada en v20 — no hace
-- falta tocar nada más (columnas, Trigger A y el trigger en sí ya están bien).

create or replace function public.flag_reassignment_if_changed()
returns trigger
language plpgsql
security definer
as $$
declare
  affected_service_id uuid;
  member_ids uuid[];
  affected_member_id uuid;
  current_posiciones text[];
  inv record;
begin
  if TG_OP = 'DELETE' then
    affected_service_id := old.service_id;
    member_ids := array[old.member_id];
  elsif TG_OP = 'INSERT' then
    affected_service_id := new.service_id;
    member_ids := array[new.member_id];
  else -- UPDATE
    affected_service_id := new.service_id;
    member_ids := array[old.member_id, new.member_id];
  end if;

  -- No hacer nada si el servicio completo se está borrando (cascada).
  if not exists (select 1 from services where id = affected_service_id) then
    return coalesce(new, old);
  end if;

  foreach affected_member_id in array member_ids
  loop
    if affected_member_id is null then continue; end if;

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

-- ────────────────────────────────────────────────────────────────────
-- Verificación rápida:
--   1. Asigna a alguien una posición NUEVA (que nunca había tenido nadie
--      en ese servicio) — antes esto fallaba silenciosamente, ahora debe
--      guardar sin problema.
--   2. Repite la prueba del v20: confirma, cambia su instrumento, revisa
--      needs_reassignment_confirm.
-- ────────────────────────────────────────────────────────────────────
