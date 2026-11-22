-- 057a · Chats por sala — PARTE A: pertenencia calculada, tabla privada del chat de equipo y bloqueos.  PARA REVISIÓN: no corrida.
--
-- SOLO AGREGA. Es COMPATIBLE CON `main`: no cambia ni borra nada que exista (messages, chat_presence, sus políticas, el tiempo real y los disparadores quedan igual).
-- Todo lo nuevo es invisible para el código que hoy corre: nadie lo llama hasta que el código nuevo llegue.
-- IDEMPOTENTE: create or replace / if not exists / drop … create; correrla dos veces deja lo mismo.
-- La pertenencia NO se guarda: cada función lee team_members, banda_assignments, invitations y members en el momento de la consulta; quien sale de un equipo o de un servicio pierde el acceso solo.
-- Las funciones son SECURITY DEFINER y SOLO las puede ejecutar el servidor (service_role): ni anon ni authenticated pueden llamarlas.
begin;

do $$
begin
  if to_regclass('public.messages') is null or to_regclass('public.members') is null or to_regclass('public.services') is null
     or to_regclass('public.teams') is null or to_regclass('public.team_members') is null
     or to_regclass('public.banda_assignments') is null or to_regclass('public.invitations') is null then
    raise exception 'Falta una tabla base del chat (messages, members, services, teams, team_members, banda_assignments o invitations): revisa el diagnóstico 057-0.';
  end if;
end $$;

-- 1 · Parámetros (se cambian aquí, sin tocar el código)
create or replace function public.chat_dias_visible_servicio() returns integer language sql immutable as $$ select 7 $$;       -- el chat de un servicio ya terminado sigue visible (solo lectura) este número de días
create or replace function public.chat_horas_escritura_servicio() returns integer language sql immutable as $$ select 24 $$;   -- y se puede seguir escribiendo estas horas después de su fin

-- el fin de un servicio, en la hora de Chile (services guarda fecha y hora sin zona)
create or replace function public.chat_fin_servicio(p_fecha date, p_hora_fin time)
returns timestamptz language sql immutable as
$$ select (p_fecha + coalesce(p_hora_fin, time '14:00')) at time zone 'America/Santiago' $$;

-- 2 · Pertenencia
-- General: toda persona de la organización.
create or replace function public.chat_es_miembro_general(p_member uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.members m where m.id = p_member and m.organization_id is not null) $$;

-- Equipo: pertenece a un equipo NO archivado de su misma organización.
create or replace function public.chat_es_miembro_equipo(p_member uuid, p_team uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (
     select 1
       from public.team_members tm
       join public.teams   t on t.id = tm.team_id   and t.organization_id = tm.organization_id and t.archived_at is null
       join public.members m on m.id = tm.member_id and m.organization_id = tm.organization_id
      where tm.member_id = p_member and tm.team_id = p_team) $$;

-- Servicio («sirve ese servicio») — REGLA PROPUESTA, A CONFIRMAR POR CLAUDIA:
--   · servicio normal: está asignada a alguna posición (banda_assignments) Y tiene una convocatoria ENVIADA (invitations.sent_at) que NO declinó;
--   · ensayo: tiene una convocatoria enviada que no declinó (los ensayos no llevan nómina);
--   · y es de su misma organización.
-- «No declinó» = existe al menos una convocatoria enviada con status distinto de 'declinado' (si está en dos equipos y declinó uno, sigue sirviendo por el otro).
create or replace function public.chat_sirve_servicio(p_member uuid, p_service uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (
     select 1
       from public.services s
       join public.members m on m.id = p_member and m.organization_id = s.organization_id
      where s.id = p_service
        and exists (select 1 from public.invitations i
                     where i.service_id = s.id and i.member_id = p_member and i.sent_at is not null and i.status <> 'declinado')
        and ( s.tipo = 'ensayo'
              or exists (select 1 from public.banda_assignments b where b.service_id = s.id and b.member_id = p_member))) $$;

-- Ventana de tiempo: leer hasta N días después del fin; escribir hasta N horas después.
create or replace function public.chat_servicio_visible(p_service uuid, p_escribir boolean)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (
     select 1 from public.services s
      where s.id = p_service
        and now() <= public.chat_fin_servicio(s.fecha, s.hora_fin)
                     + case when p_escribir then make_interval(hours => public.chat_horas_escritura_servicio())
                            else make_interval(days  => public.chat_dias_visible_servicio()) end) $$;

create or replace function public.chat_puede_servicio(p_member uuid, p_service uuid, p_escribir boolean)
returns boolean language sql stable security definer set search_path = public as
$$ select public.chat_sirve_servicio(p_member, p_service) and public.chat_servicio_visible(p_service, p_escribir) $$;

-- 3 · Listas para el resumen del chat y para los avisos push
create or replace function public.chat_equipos_de(p_member uuid)
returns table (team_id uuid, nombre text, color text)
language sql stable security definer set search_path = public as
$$ select t.id, t.name, t.color
     from public.team_members tm
     join public.teams   t on t.id = tm.team_id   and t.organization_id = tm.organization_id and t.archived_at is null
     join public.members m on m.id = tm.member_id and m.organization_id = tm.organization_id
    where tm.member_id = p_member
    order by t.sort_order nulls last, t.name $$;

create or replace function public.chat_servicios_de(p_member uuid)
returns table (service_id uuid, fecha date, titulo text, tipo text, puede_escribir boolean)
language sql stable security definer set search_path = public as
$$ select s.id, s.fecha, s.titulo, s.tipo, public.chat_servicio_visible(s.id, true)
     from public.services s
    where s.fecha >= current_date - public.chat_dias_visible_servicio() - 1
      and public.chat_puede_servicio(p_member, s.id, false)
    order by s.fecha, s.hora_inicio $$;

-- A quién avisar (push) de un mensaje nuevo: las mismas reglas, para que el aviso nunca llegue a quien no puede leer.
--   p_sala: 'general' (p_id se ignora: la organización sale de quien escribe), 'servicio' (p_id = servicio) o 'equipo' (p_id = equipo).
create or replace function public.chat_destinatarios(p_sala text, p_id uuid, p_sender uuid)
returns table (member_id uuid)
language sql stable security definer set search_path = public as
$$ select m.id
     from public.members m
    where m.id <> p_sender
      and case p_sala
            when 'general'  then m.organization_id = (select s.organization_id from public.members s where s.id = p_sender)
            when 'servicio' then public.chat_puede_servicio(m.id, p_id, true)
            when 'equipo'   then public.chat_es_miembro_equipo(m.id, p_id)
            else false end $$;

-- 4 · Chat de equipo: tabla PRIVADA. Va en una tabla aparte (no en `messages`) a propósito: el código de main lee el chat general de `messages` con
--     «service_id y recipient_member_id nulos»; un mensaje de equipo guardado ahí se vería en el chat general de todos mientras main siga con el código de hoy.
create table if not exists public.team_messages (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id)   on delete cascade,
  member_id  uuid not null references public.members(id) on delete cascade,
  content    text not null check (length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists idx_team_messages_team_created on public.team_messages (team_id, created_at desc);

alter table public.team_messages enable row level security;          -- sin ninguna política: nadie con llave pública (anon ni authenticated) lee ni escribe
revoke all on public.team_messages from public, anon, authenticated;
grant select, insert, delete on public.team_messages to service_role;

-- Defensa en profundidad: aunque una ruta del servidor tuviera un error, la base se niega a guardar un mensaje de quien no es del equipo.
create or replace function public.team_messages_valida() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  if not public.chat_es_miembro_equipo(new.member_id, new.team_id) then
    raise exception 'La persona no pertenece a ese equipo' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_team_messages_valida on public.team_messages;
create trigger trg_team_messages_valida before insert on public.team_messages for each row execute function public.team_messages_valida();

-- 5 · Solo el servidor puede ejecutar estas funciones
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as firma
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and (p.proname like 'chat\_%' or p.proname = 'team_messages_valida')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.firma);
    execute format('grant execute on function %s to service_role', f.firma);
  end loop;
end $$;

-- 6 · El chat de equipo NUNCA va por tiempo real (nadie lo necesita: el portal consulta al servidor)
do $$
begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_messages') then
    alter publication supabase_realtime drop table public.team_messages;
  end if;
end $$;

commit;
