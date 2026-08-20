-- Verifica/asegura que la tabla push_subscriptions tenga lo que el código
-- necesita para guardar las suscripciones de notificaciones push.
-- Es seguro ejecutar esto aunque la tabla ya exista y esté bien: los
-- "IF NOT EXISTS" no rompen nada si ya está todo correcto.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

-- El código hace upsert con onConflict: 'member_id,endpoint' — sin este
-- índice único, cada intento de re-suscripción falla silenciosamente.
create unique index if not exists push_subscriptions_member_endpoint_key
  on push_subscriptions (member_id, endpoint);

alter table push_subscriptions enable row level security;

drop policy if exists "public read push_subscriptions" on push_subscriptions;
create policy "public read push_subscriptions" on push_subscriptions for select using (true);

drop policy if exists "public write push_subscriptions" on push_subscriptions;
create policy "public write push_subscriptions" on push_subscriptions for all using (true);

-- Verificación rápida — debería devolver el nombre de la tabla:
-- select * from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages';
-- select count(*) from push_subscriptions;
