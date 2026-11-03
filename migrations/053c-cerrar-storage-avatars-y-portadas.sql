begin;
create policy "admins suben portadas de canciones" on storage.objects for insert to authenticated with check (bucket_id = 'song-covers' and public.is_org_admin(auth.jwt()->>'email', '00000000-0000-0000-0000-000000000001'::uuid));
create policy "admins reemplazan portadas de canciones" on storage.objects for update to authenticated using (bucket_id = 'song-covers' and public.is_org_admin(auth.jwt()->>'email', '00000000-0000-0000-0000-000000000001'::uuid)) with check (bucket_id = 'song-covers' and public.is_org_admin(auth.jwt()->>'email', '00000000-0000-0000-0000-000000000001'::uuid));
drop policy "Anyone can upload song covers" on storage.objects;
drop policy "Anyone can update song covers" on storage.objects;
drop policy "Auth users can upload avatars" on storage.objects;
drop policy "Auth users can update avatars" on storage.objects;
commit;
