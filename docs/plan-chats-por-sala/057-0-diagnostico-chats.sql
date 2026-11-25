-- EN PAUSA desde 2026-11-25: no ejecutar.
-- 057-0 · Diagnóstico de los chats. SOLO LECTURA: no cambia nada. Es lo PRIMERO que se corre, y su resultado se guarda.
-- Un solo resultado (el editor de Supabase muestra solo la última consulta): una tabla con las columnas «seccion» y «detalle». Cópiala entera (botón Copy → CSV o Markdown) y pégasela a Claude.
-- Por qué: el esquema del repo para `messages` es una RECONSTRUCCIÓN (se creó a mano en el panel), así que políticas, permisos, disparadores y tiempo real salen de documentos y de código, no de la base viva. Esto lo confirma.
-- Esta salida (sección «2») es además el respaldo de las políticas actuales: es lo que habría que recrear si hubiera que deshacer 057b.
select seccion, detalle from (

  select '1 columna' as seccion, table_name || '.' || column_name || ' (' || data_type || case when is_nullable = 'NO' then ', NOT NULL' else '' end || ')' as detalle
    from information_schema.columns where table_schema = 'public' and table_name in ('messages', 'chat_presence')

  union all select '2 RLS', c.relname || ': ' || case when c.relrowsecurity then 'RLS activo' else 'RLS APAGADO' end
    from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('messages', 'chat_presence', 'members')

  union all select '2 política', tablename || ' · ' || policyname || ' · ' || cmd || ' · roles=' || roles::text || ' · using=' || coalesce(qual, '∅') || ' · check=' || coalesce(with_check, '∅')
    from pg_policies where schemaname = 'public' and tablename in ('messages', 'chat_presence', 'members')

  union all select '3 permisos', table_name || ' · ' || grantee || ' · ' || string_agg(privilege_type, ',' order by privilege_type)
    from information_schema.role_table_grants
   where table_schema = 'public' and table_name in ('messages', 'chat_presence') and grantee in ('anon', 'authenticated', 'service_role')
   group by table_name, grantee

  union all select '4 tiempo real', schemaname || '.' || tablename from pg_publication_tables where pubname = 'supabase_realtime'

  union all select '5 disparador', pg_get_triggerdef(t.oid) || ' · ' || case t.tgenabled when 'O' then 'ACTIVO' when 'D' then 'APAGADO' else t.tgenabled::text end
    from pg_trigger t where not t.tgisinternal and t.tgrelid = 'public.messages'::regclass

  union all select '5 identidad de réplica', relname || ' = ' || relreplident::text || ' (d = solo la llave primaria)' from pg_class where oid = 'public.messages'::regclass

  union all select '6 conteo', 'general=' || count(*) filter (where service_id is null and recipient_member_id is null)
                              || ' · de_servicio=' || count(*) filter (where service_id is not null)
                              || ' · directos=' || count(*) filter (where recipient_member_id is not null) from public.messages

  union all select '7 YA EXISTE (debe salir vacío)', p.oid::regprocedure::text
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and (p.proname like 'chat\_%' or p.proname like 'team\_messages%' or p.proname = 'messages_valida')

  union all select '7 YA EXISTE (debe salir vacío)', 'tabla public.team_messages' where to_regclass('public.team_messages') is not null

  union all select '8 requisitos', 'función is_org_admin(text, uuid): ' || case when to_regprocedure('public.is_org_admin(text,uuid)') is not null then 'existe' else 'FALTA' end
  union all select '8 requisitos', 'columna invitations.team_id: ' || case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'invitations' and column_name = 'team_id') then 'existe' else 'FALTA' end
  union all select '8 requisitos', 'columna banda_assignments.team_position_id: ' || case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'banda_assignments' and column_name = 'team_position_id') then 'existe' else 'FALTA' end
  union all select '8 requisitos', 'columna services.kind: ' || case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'kind') then 'existe' else 'FALTA' end
  union all select '8 requisitos', 'columna invitations.sent_at: ' || case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'invitations' and column_name = 'sent_at') then 'existe' else 'FALTA' end
  union all select '8 requisitos', 'columna teams.archived_at: ' || case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'teams' and column_name = 'archived_at') then 'existe' else 'FALTA' end

  -- Los valores REALES que la regla de «sirve» da por supuestos (el código dice: status ∈ pendiente/confirmado/declinado y tipo ∈ servicio/ensayo; aquí se ve qué hay de verdad)
  union all select '9 datos', 'invitations.status · ' || coalesce(status, '(nulo)') || ' = ' || count(*) from public.invitations group by status
  union all select '9 datos', 'invitations · con sent_at = ' || count(*) filter (where sent_at is not null) || ' · sin sent_at = ' || count(*) filter (where sent_at is null) from public.invitations
  union all select '9 datos', 'services.tipo / kind · ' || coalesce(to_jsonb(s) ->> 'tipo', '(nulo)') || ' / ' || coalesce(to_jsonb(s) ->> 'kind', '(sin columna)') || ' = ' || count(*)
    from public.services s group by to_jsonb(s) ->> 'tipo', to_jsonb(s) ->> 'kind'

) x order by seccion, detalle;
