begin;
create policy "admins insertan services" on public.services for insert to authenticated with check (public.is_org_admin(auth.jwt()->>'email', organization_id));
create policy "admins insertan service_blocks" on public.service_blocks for insert to authenticated with check (exists (select 1 from public.services s where s.id = service_blocks.service_id and public.is_org_admin(auth.jwt()->>'email', s.organization_id)));
create policy "admins borran service_blocks" on public.service_blocks for delete to authenticated using (exists (select 1 from public.services s where s.id = service_blocks.service_id and public.is_org_admin(auth.jwt()->>'email', s.organization_id)));
do $$ declare p record; begin for p in select tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('services', 'service_blocks', 'invitations') and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE') and (qual = 'true' or with_check = 'true') loop execute format('drop policy %I on public.%I', p.policyname, p.tablename); end loop; end $$;
revoke insert, update, delete on public.services from anon;
revoke insert, update, delete on public.service_blocks from anon;
revoke insert, update, delete on public.invitations from anon;
commit;
