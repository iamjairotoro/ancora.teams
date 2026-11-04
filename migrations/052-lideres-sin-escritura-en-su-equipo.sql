begin;
drop policy if exists "team leaders write own team_members" on public.team_members;
drop policy if exists "team leaders write own team_member_positions" on public.team_member_positions;
create policy "lideres leen su equipo en team_members" on public.team_members for select to authenticated using (public.is_team_leader(auth.jwt()->>'email', team_id, organization_id));
create policy "lideres leen sus posiciones en team_member_positions" on public.team_member_positions for select to authenticated using (exists (select 1 from public.team_members tm where tm.id = team_member_positions.team_member_id and public.is_team_leader(auth.jwt()->>'email', tm.team_id, tm.organization_id)));
commit;
