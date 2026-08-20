-- ============================================================
-- ANCORA SETLIST — Esquema consolidado (estado final de producción)
-- Reconstruido a partir de correr, en orden, supabase-schema.sql
-- hasta supabase-schema-v25-pending-reminder-column.sql.
--
-- Pensado para pegar UNA vez en el SQL Editor de un proyecto de
-- Supabase de PRUEBA (no producción) y dejarlo con un esquema
-- equivalente al real, sin tener que correr los 25 archivos sueltos.
--
-- Ya viene "aplanado" para que sea seguro correr aquí:
--   - Los 4 net.http_post(...) de las funciones de notificación
--     quedan COMENTADOS (no borrados) y el secreto reemplazado por
--     un placeholder — así un INSERT/UPDATE/DELETE en esta base de
--     prueba no dispara una llamada real contra producción.
--   - El INSERT del email real de admin (de v5) queda comentado.
--
-- Ver el mensaje de chat donde se pidió este archivo para el detalle
-- de qué partes son fieles a los 25 archivos originales y cuáles son
-- inferencia (tablas `messages` y `date_blocks`, que nunca tuvieron
-- CREATE TABLE en ningún archivo — se crearon a mano en el dashboard).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- EXTENSIONES
-- ────────────────────────────────────────────────────────────

-- gen_random_uuid() / gen_random_bytes() (usadas desde la primera tabla)
-- vienen de pgcrypto. Nunca se ve un "create extension pgcrypto" explícito
-- en ninguno de los 25 archivos — Supabase la activa por defecto en todo
-- proyecto nuevo. La declaramos igual acá para que este archivo no dependa
-- de ese supuesto.
create extension if not exists pgcrypto;

-- Permite a Postgres hacer llamadas HTTP salientes (net.http_post). Viene
-- de v14, explícito en el original.
create extension if not exists pg_net;


-- ────────────────────────────────────────────────────────────
-- TABLAS (forma final, ya con todos los ALTER de v2..v25 aplicados)
-- ────────────────────────────────────────────────────────────

-- members — base + avatar_url (v5) + fecha_nacimiento (v6) + instalado_pwa_at (v19)
--         + last_seen — 🔶 NO ESTABA EN NINGÚN ARCHIVO, se creó a mano en el
--         dashboard. Detectada comparando el backup real contra este mismo
--         archivo (ver scripts/diff-schema-vs-backup.js). Se actualiza vía
--         .update({last_seen: new Date().toISOString()}) cada vez que un
--         músico carga su portal — timestamptz simple, sin default.
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null default '',
  email text not null unique,
  telefono text,
  instrumentos text[] not null default '{}',
  avatar_url text,
  fecha_nacimiento date,
  instalado_pwa_at timestamptz,
  last_seen timestamptz, -- 🔶 reconstruida, no venía de ningún archivo
  created_at timestamptz default now()
);

alter table members enable row level security;
drop policy if exists "public read members" on members;
create policy "public read members" on members for select using (true);
drop policy if exists "public write members" on members;
create policy "public write members" on members for all using (true);


-- songs — base + bpm/compas/link_recursos/tags (v2) + bpm→float y duracion_min (v4)
--       + spotify_url/apple_music_url/caratula_url (v17)
create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  artista text not null default '',
  tono_original text,
  link_spotify text,      -- OJO (comentario original de v17): en la app este campo
                          -- en realidad se usa como link de YouTube, no de Spotify.
  link_letras text,
  notas text,
  bpm float,
  compas text,
  link_recursos text,
  tags text[],
  duracion_min float,
  spotify_url text,
  apple_music_url text,
  caratula_url text,
  created_at timestamptz default now()
);

alter table songs enable row level security;
drop policy if exists "public read songs" on songs;
create policy "public read songs" on songs for select using (true);
drop policy if exists "public write songs" on songs;
create policy "public write songs" on songs for all using (true);


-- services — base + hora_inicio/hora_fin (v6) + tipo/lugar/direccion/maps_link (v7/v8)
--          + last_setlist_notified_at (v23)
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  titulo text not null default 'Servicio Ancora',
  hora_inicio time default '10:00:00',
  hora_fin time default '14:00:00',
  tipo text not null default 'servicio' check (tipo in ('servicio','ensayo')),
  lugar text,
  direccion text,
  maps_link text,
  last_setlist_notified_at timestamptz,
  created_at timestamptz default now()
);

alter table services enable row level security;
drop policy if exists "public read services" on services;
create policy "public read services" on services for select using (true);
drop policy if exists "public write services" on services;
create policy "public write services" on services for all using (true);


-- setlist_items — legacy (base, sin más ALTER en ningún archivo posterior).
-- Ya no se escribe desde la app (ver comentario original de v23) — el setlist
-- real vive en service_blocks. Se incluye solo para que el esquema sea completo.
create table if not exists setlist_items (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete cascade,
  orden int not null,
  song_id uuid references songs(id) on delete set null,
  tono text,
  lead_id uuid references members(id) on delete set null,
  link text,
  unique(service_id, orden)
);

alter table setlist_items enable row level security;
drop policy if exists "public read setlist" on setlist_items;
create policy "public read setlist" on setlist_items for select using (true);
drop policy if exists "public write setlist" on setlist_items;
create policy "public write setlist" on setlist_items for all using (true);


-- banda_assignments — base, sin más ALTER en ningún archivo posterior.
create table if not exists banda_assignments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete cascade,
  posicion text not null,
  member_id uuid references members(id) on delete set null,
  unique(service_id, posicion)
);

alter table banda_assignments enable row level security;
drop policy if exists "public read banda" on banda_assignments;
create policy "public read banda" on banda_assignments for select using (true);
drop policy if exists "public write banda" on banda_assignments;
create policy "public write banda" on banda_assignments for all using (true);


-- invitations — base + confirmed_posiciones/needs_reassignment_confirm (v20)
--             + last_reminder_at (v25)
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pendiente' check (status in ('pendiente','confirmado','declinado')),
  comentario text,
  sent_at timestamptz,
  responded_at timestamptz,
  confirmed_posiciones text[],
  needs_reassignment_confirm boolean not null default false,
  last_reminder_at timestamptz,
  created_at timestamptz default now(),
  unique(service_id, member_id)
);

alter table invitations enable row level security;
drop policy if exists "public read invitations" on invitations;
create policy "public read invitations" on invitations for select using (true);
drop policy if exists "public write invitations" on invitations;
create policy "public write invitations" on invitations for all using (true);


-- service_blocks — el setlist real (v3). Nombres de política tal cual el
-- original ("blocks", no "service_blocks") — sin más ALTER en archivos posteriores.
create table if not exists service_blocks (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete cascade,
  orden int not null,
  tipo text not null default 'bloque', -- 'cancion' | 'bloque'
  titulo text,
  duracion_min int default 5,
  notas text,
  song_id uuid references songs(id) on delete set null,
  tono text,
  lead_id uuid references members(id) on delete set null
);

alter table service_blocks enable row level security;
drop policy if exists "public read blocks" on service_blocks;
create policy "public read blocks" on service_blocks for select using (true);
drop policy if exists "public write blocks" on service_blocks;
create policy "public write blocks" on service_blocks for all using (true);


-- admin_emails (v5) — quiénes pueden entrar al panel admin.
create table if not exists admin_emails (
  email text primary key,
  created_at timestamptz default now()
);

alter table admin_emails enable row level security;
drop policy if exists "public read admin_emails" on admin_emails;
create policy "public read admin_emails" on admin_emails for select using (true);
drop policy if exists "public write admin_emails" on admin_emails;
create policy "public write admin_emails" on admin_emails for all using (true);


-- availability (v6) — "disponible" / "no_disponible" por servicio.
create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  status text not null check (status in ('disponible','no_disponible')) default 'disponible',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(member_id, service_id)
);

alter table availability enable row level security;
drop policy if exists "public read availability" on availability;
create policy "public read availability" on availability for select using (true);
drop policy if exists "public write availability" on availability;
create policy "public write availability" on availability for all using (true);


-- date_blocks — 🔶 RECONSTRUIDA, NO ESTABA EN NINGÚN ARCHIVO.
-- v9 es el primer archivo que la toca (con ALTER TABLE), así que se creó a
-- mano en el dashboard antes de eso. Forma reconstruida a partir de v9 +
-- uso real en app/api/date-blocks/route.ts, components/AvailabilityPanel.tsx
-- y app/admin/page.tsx. El índice único es el que crea v9 explícitamente.
create table if not exists date_blocks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  service_id uuid references services(id) on delete set null, -- 🔶 ON DELETE inferido
  blocked_date date,
  reason text,
  start_date date,
  end_date date,
  created_at timestamptz default now() -- 🔶 inferido, sigue el patrón del resto
);

create unique index if not exists date_blocks_member_date_uniq on date_blocks(member_id, blocked_date);

alter table date_blocks enable row level security;
drop policy if exists "public read date_blocks" on date_blocks; -- 🔶 política inferida
create policy "public read date_blocks" on date_blocks for select using (true);
drop policy if exists "public write date_blocks" on date_blocks; -- 🔶 política inferida
create policy "public write date_blocks" on date_blocks for all using (true);


-- push_subscriptions — creada en v10, "reasegurada" en v13 (que en la práctica
-- no cambió nada porque la tabla ya existía — se queda con el member_id NOT
-- NULL de v10). El índice único de v13 queda además del UNIQUE de la tabla:
-- es redundante pero así está hoy en producción, se replica tal cual.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(member_id, endpoint)
);

create unique index if not exists push_subscriptions_member_endpoint_key
  on push_subscriptions (member_id, endpoint);

alter table push_subscriptions enable row level security;
drop policy if exists "public read push_subscriptions" on push_subscriptions;
create policy "public read push_subscriptions" on push_subscriptions for select using (true);
drop policy if exists "public write push_subscriptions" on push_subscriptions;
create policy "public write push_subscriptions" on push_subscriptions for all using (true);


-- song_favorites (v11)
create table if not exists song_favorites (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  created_at timestamptz default now(),
  unique(member_id, song_id)
);

alter table song_favorites enable row level security;
drop policy if exists "public read song_favorites" on song_favorites;
create policy "public read song_favorites" on song_favorites for select using (true);
drop policy if exists "public write song_favorites" on song_favorites;
create policy "public write song_favorites" on song_favorites for all using (true);


-- messages — 🔶 RECONSTRUIDA, NO ESTABA EN NINGÚN ARCHIVO.
-- v12 es el primer archivo que la toca (ALTER PUBLICATION), así que también
-- se creó a mano en el dashboard. Forma reconstruida a partir de v12/v15
-- (recipient_member_id agregado ahí) + uso real en
-- app/portal/[token]/page.tsx y components/ChatModerationPanel.tsx.
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  recipient_member_id uuid references members(id) on delete cascade, -- agregado en v15
  content text not null, -- 🔶 inferido NOT NULL
  created_at timestamptz default now() -- 🔶 inferido, sigue el patrón del resto
);

create index if not exists messages_dm_sender_idx on messages (member_id, recipient_member_id) where recipient_member_id is not null;
create index if not exists messages_dm_recipient_idx on messages (recipient_member_id, member_id) where recipient_member_id is not null;

alter table messages enable row level security;
drop policy if exists "public read messages" on messages; -- 🔶 política inferida
create policy "public read messages" on messages for select using (true);
drop policy if exists "public write messages" on messages; -- 🔶 política inferida
create policy "public write messages" on messages for all using (true);


-- chat_presence (v16)
create table if not exists chat_presence (
  member_id uuid primary key references members(id) on delete cascade,
  chat_id text,
  updated_at timestamptz default now()
);

alter table chat_presence enable row level security;
drop policy if exists "public read chat_presence" on chat_presence;
create policy "public read chat_presence" on chat_presence for select using (true);
drop policy if exists "public write chat_presence" on chat_presence;
create policy "public write chat_presence" on chat_presence for all using (true);


-- ────────────────────────────────────────────────────────────
-- STORAGE — buckets y políticas (v5, v17)
-- ────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;

drop policy if exists "Public avatar access" on storage.objects;
create policy "Public avatar access" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "Auth users can upload avatars" on storage.objects;
create policy "Auth users can upload avatars" on storage.objects for insert with check (bucket_id = 'avatars');
drop policy if exists "Auth users can update avatars" on storage.objects;
create policy "Auth users can update avatars" on storage.objects for update using (bucket_id = 'avatars');

insert into storage.buckets (id, name, public) values ('song-covers', 'song-covers', true) on conflict do nothing;

drop policy if exists "Public song cover access" on storage.objects;
create policy "Public song cover access" on storage.objects for select using (bucket_id = 'song-covers');
drop policy if exists "Anyone can upload song covers" on storage.objects;
create policy "Anyone can upload song covers" on storage.objects for insert with check (bucket_id = 'song-covers');
drop policy if exists "Anyone can update song covers" on storage.objects;
create policy "Anyone can update song covers" on storage.objects for update using (bucket_id = 'song-covers');


-- ────────────────────────────────────────────────────────────
-- REALTIME (v12) — solo `messages` está suscrita en toda la app
-- ────────────────────────────────────────────────────────────

alter publication supabase_realtime add table messages;


-- ────────────────────────────────────────────────────────────
-- FUNCIONES Y TRIGGERS — solo versiones VIVAS
-- (v14 quedó sobrescrita por v15; v20/v21 quedaron sobrescritas por v22 —
-- no se incluyen esas versiones intermedias/muertas)
-- ────────────────────────────────────────────────────────────

-- notify_chat_message (versión viva = v15, incluye recipient_member_id)
-- http_post COMENTADO + secreto con placeholder — seguro para esta base de prueba.
create or replace function public.notify_chat_message()
returns trigger
language plpgsql
security definer
as $$
begin
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

drop trigger if exists trg_notify_chat_message on messages;
create trigger trg_notify_chat_message
  after insert on messages
  for each row
  execute function public.notify_chat_message();


-- notify_rsvp_change (v18)
-- http_post COMENTADO + secreto con placeholder.
create or replace function public.notify_rsvp_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status is distinct from old.status and new.status in ('confirmado','declinado') then
    /*
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
    */
    null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_rsvp_change on invitations;
create trigger trg_notify_rsvp_change
  after update on invitations
  for each row
  execute function public.notify_rsvp_change();


-- snapshot_confirmed_posiciones (v20 — nunca se modificó después, sigue viva tal cual)
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


-- flag_reassignment_if_changed (versión viva = v22 — v20 y v21 fueron
-- iteraciones muertas, cada una sobrescrita por la siguiente). Sin llamadas
-- HTTP, nada que comentar aquí.
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

drop trigger if exists trg_flag_reassignment_if_changed on banda_assignments;
create trigger trg_flag_reassignment_if_changed
  after insert or update or delete on banda_assignments
  for each row
  execute function public.flag_reassignment_if_changed();


-- notify_setlist_change (v23)
-- http_post COMENTADO + secreto con placeholder.
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

  if not exists (select 1 from services where id = affected_service_id) then
    if TG_OP = 'DELETE' then return old; else return new; end if;
  end if;

  select last_setlist_notified_at into last_notified
  from services where id = affected_service_id;

  if last_notified is null or now() - last_notified >= interval '3 minutes' then
    update services set last_setlist_notified_at = now() where id = affected_service_id;

    /*
    perform net.http_post(
      url := 'https://ancora-setlist.vercel.app/api/setlist-notify',
      body := jsonb_build_object('serviceId', affected_service_id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', 'TU_INTERNAL_API_SECRET_AQUI'
      )
    );
    */
    null;
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


-- notify_nomina_removal (v24)
-- http_post COMENTADO + secreto con placeholder.
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

  if removed_member_id is not null and exists (select 1 from services where id = affected_service_id) then
    /*
    perform net.http_post(
      url := 'https://ancora-setlist.vercel.app/api/nomina-notify',
      body := jsonb_build_object('memberId', removed_member_id, 'serviceId', affected_service_id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', 'TU_INTERNAL_API_SECRET_AQUI'
      )
    );
    */
    null;
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


-- ────────────────────────────────────────────────────────────
-- DATOS SEMILLA (v5) — email real de admin comentado a propósito
-- ────────────────────────────────────────────────────────────

-- Descomenta y reemplaza por un correo tuyo si necesitas entrar al panel
-- admin en este proyecto de prueba:
-- insert into admin_emails (email) values ('tu-email-de-prueba@ejemplo.com') on conflict do nothing;
