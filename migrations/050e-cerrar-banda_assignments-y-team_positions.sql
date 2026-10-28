begin;

drop policy if exists "public read banda" on public.banda_assignments;
drop policy if exists "public write banda" on public.banda_assignments;
drop policy if exists "public read team_positions" on public.team_positions;

drop policy if exists "org admins all banda_assignments" on public.banda_assignments;
create policy "org admins all banda_assignments" on public.banda_assignments
  for all to authenticated
  using (exists (select 1 from public.services s where s.id = banda_assignments.service_id and is_org_admin(auth.jwt()->>'email', s.organization_id)))
  with check (exists (select 1 from public.services s where s.id = banda_assignments.service_id and is_org_admin(auth.jwt()->>'email', s.organization_id)));

drop policy if exists "lideres leen banda_assignments" on public.banda_assignments;
create policy "lideres leen banda_assignments" on public.banda_assignments
  for select to authenticated
  using (exists (select 1 from public.services s where s.id = banda_assignments.service_id and is_any_team_leader(auth.jwt()->>'email', s.organization_id)));

drop policy if exists "lideres leen team_positions" on public.team_positions;
create policy "lideres leen team_positions" on public.team_positions
  for select to authenticated
  using (is_any_team_leader(auth.jwt()->>'email', organization_id));

alter table public.banda_assignments enable row level security;
alter table public.banda_assignments no force row level security;
alter table public.team_positions enable row level security;
alter table public.team_positions no force row level security;

revoke all on table public.banda_assignments from anon;
revoke all on table public.team_positions from anon;

commit;
