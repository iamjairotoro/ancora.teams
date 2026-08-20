-- Agrega campos nuevos a la tabla songs: Spotify, Apple Music y carátula.
-- OJO: la columna "link_spotify" que ya existía en realidad se usa hoy como
-- link de YouTube en la app (así quedó armado desde el principio) — no la
-- tocamos para no romper los links que ya cargaron. Por eso los campos
-- nuevos de Spotify/Apple Music van con nombre propio, sin pisar nada.
--
-- Cómo correrlo: Supabase → tu proyecto → SQL Editor → pegar y ejecutar todo.

alter table songs add column if not exists spotify_url text;
alter table songs add column if not exists apple_music_url text;
alter table songs add column if not exists caratula_url text;

-- Bucket de almacenamiento para las carátulas (mismo patrón que "avatars").
insert into storage.buckets (id, name, public) values ('song-covers', 'song-covers', true) on conflict do nothing;

drop policy if exists "Public song cover access" on storage.objects;
create policy "Public song cover access" on storage.objects for select using (bucket_id = 'song-covers');

drop policy if exists "Anyone can upload song covers" on storage.objects;
create policy "Anyone can upload song covers" on storage.objects for insert with check (bucket_id = 'song-covers');

drop policy if exists "Anyone can update song covers" on storage.objects;
create policy "Anyone can update song covers" on storage.objects for update using (bucket_id = 'song-covers');
