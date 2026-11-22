-- 057-0 · Diagnóstico de los chats (SOLO LECTURA: no cambia nada). Córrelo ANTES de todo y guarda el resultado.
-- Por qué: el esquema del repo para `messages` es una RECONSTRUCCIÓN (se creó a mano en el panel), así que las políticas, los permisos, los disparadores y el tiempo real
-- que describe el plan salen de documentos y de código, no de la base viva. Esto lo confirma.

-- 1) Columnas reales (¿hay organization_id? ¿otras columnas?)
select table_name, column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name in ('messages', 'chat_presence')
 order by table_name, ordinal_position;

-- 2) RLS activo y políticas (qual/with_check = true significa «abierto a todos»)
select c.relname as tabla, c.relrowsecurity as rls_activo
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relname in ('messages', 'chat_presence');
select tablename, policyname, cmd, roles, qual, with_check
  from pg_policies where schemaname = 'public' and tablename in ('messages', 'chat_presence') order by tablename, policyname;

-- 3) Permisos de tabla de anon / authenticated / service_role
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as permisos
  from information_schema.role_table_grants
 where table_schema = 'public' and table_name in ('messages', 'chat_presence') and grantee in ('anon', 'authenticated', 'service_role')
 group by table_name, grantee order by table_name, grantee;

-- 4) Tiempo real: qué tablas se transmiten por la publicación de Realtime
select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1, 2;

-- 5) Disparadores de `messages` (tgenabled: O = activo, D = apagado) y la identidad de réplica
select tgname, tgenabled from pg_trigger where not tgisinternal and tgrelid = 'public.messages'::regclass;
select relname, relreplident from pg_class where oid = 'public.messages'::regclass;     -- d = solo la llave primaria en UPDATE/DELETE

-- 6) Cuánto hay de cada tipo de sala
select count(*) filter (where service_id is null and recipient_member_id is null) as general,
       count(*) filter (where service_id is not null) as de_servicio,
       count(*) filter (where recipient_member_id is not null) as directos
  from public.messages;

-- 7) ¿Existe ya algo con nombre chat_* o team_messages? (la parte A los crea; debe salir vacío antes de correrla)
select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and (p.proname like 'chat\_%' or p.proname like 'team\_messages%');
select to_regclass('public.team_messages') as team_messages;
