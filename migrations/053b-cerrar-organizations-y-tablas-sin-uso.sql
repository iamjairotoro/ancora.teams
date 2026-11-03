begin;
do $$ declare p record; begin for p in select tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('organizations', 'chat_presence', 'availability', 'setlist_items') and (qual = 'true' or with_check = 'true') loop execute format('drop policy %I on public.%I', p.policyname, p.tablename); end loop; end $$;
revoke all on public.organizations from anon;
revoke all on public.chat_presence from anon;
revoke all on public.availability from anon;
revoke all on public.setlist_items from anon;
commit;
