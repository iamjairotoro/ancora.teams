-- Segunda pasada sobre el mismo bug de v21: el `return coalesce(new, old);`
-- final de flag_reassignment_if_changed también toca OLD en un INSERT (y NEW
-- en un DELETE), aunque sea solo para devolverlo — y eso también dispara
-- "record 'old' is not assigned yet". El fix correcto es el idiom estándar:
-- ramificar explícitamente el return según TG_OP, nunca tocar OLD/NEW fuera
-- de la rama donde sí existen.
--
-- Cómo correrlo: Supabase → tu proyecto → SQL Editor → pegar y ejecutar todo.

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

  if not exists (select 1 from services where id = affected_service_id) then
    if TG_OP = 'DELETE' then return old; else return new; end if;
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

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;
