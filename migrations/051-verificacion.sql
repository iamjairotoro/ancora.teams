select table_name, column_name, data_type, is_nullable from information_schema.columns where table_schema = 'public' and ((table_name = 'service_checklist_groups') or (table_name = 'service_checklist_items' and column_name in ('group_id','team_position_id','checked_by_member_id','checked_at'))) order by table_name, ordinal_position;

select conrelid::regclass as tabla, conname, confrelid::regclass as apunta_a, case confdeltype when 'a' then 'no action' when 'r' then 'restrict' when 'c' then 'cascade' when 'n' then 'set null' when 'd' then 'set default' end as al_borrar from pg_constraint where contype = 'f' and conrelid in ('public.service_checklist_groups'::regclass, 'public.service_checklist_items'::regclass) order by 1, 2;

select tablename, indexname from pg_indexes where schemaname = 'public' and tablename in ('service_checklist_groups','service_checklist_items') order by 1, 2;

select c.relname as tabla, c.relrowsecurity as rls_activo, c.relforcerowsecurity as rls_forzado, (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as politicas, has_table_privilege('anon', c.oid, 'select') as anon_select, has_table_privilege('anon', c.oid, 'insert') as anon_insert, has_table_privilege('authenticated', c.oid, 'select') as authenticated_select, has_table_privilege('authenticated', c.oid, 'insert') as authenticated_insert from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'service_checklist_groups';

do $$ begin set local role anon; perform count(*) from public.service_checklist_groups; raise exception 'FALLO: anon pudo leer service_checklist_groups'; end $$;

do $$ begin set local role authenticated; perform count(*) from public.service_checklist_groups; raise exception 'FALLO: authenticated pudo leer service_checklist_groups'; end $$;

select count(*) as items_total, count(group_id) as con_grupo, count(team_position_id) as con_posicion, count(checked_by_member_id) as con_quien_marco, count(checked_at) as con_hora, count(*) filter (where checked) as marcados from public.service_checklist_items;
