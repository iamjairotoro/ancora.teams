-- ============================================================
-- 036 — Audio propio de las canciones (punto 55, paso 4)
--
-- QUÉ HACE (aditivo; no toca ni borra ningún dato existente):
--   A · Tres funciones de permiso (security definer, search_path fijo) que leen las MISMAS reglas que lib/auth/libraryAccess.ts:
--         has_library_access(email, organización)        owner/admin de la organización, o integrante de un equipo NO archivado
--                                                         con library_access = true.
--         can_manage_library_files(email, organización)   owner/admin, o LÍDER (team_members.is_leader) de un equipo con acceso.
--                                                         Ser integrante NO alcanza para subir ni borrar.
--         storage_path_org(ruta)                          la organización de una ruta {organization_id}/{song_id}/{archivo}
--                                                         (NULL si la primera carpeta no es un uuid: así una ruta rara nunca da error, solo niega).
--   B · Bucket PRIVADO `song-audio`: 20 MB por archivo (límite impuesto por el almacenamiento, no solo por la pantalla) y solo audio
--       mp3 / m4a / aac.
--   C · Cuatro políticas sobre storage.objects SOLO para ese bucket. La ORGANIZACIÓN va por delante en la ruta y la política compara esa
--       carpeta con la organización de quien pide: no se fija el id de ninguna organización en el SQL.
--         leer   → has_library_access        subir / reemplazar / borrar → can_manage_library_files
--       El músico del portal NO es usuario de Supabase Auth: sus enlaces los firma el servidor con la llave de servicio
--       (POST /api/portal/cancion/firmar, que ya exige acceso a la biblioteca). Estas políticas son para la administración.
--   D · song_attachments.bucket: en qué bucket está cada adjunto ('song-attachments' por defecto, así que lo que ya existe no cambia).
--
-- RUTA de los archivos nuevos de audio: {organization_id}/{song_id}/{marca-de-tiempo}-{nombre}. Los adjuntos viejos de `song-attachments`
-- siguen con su ruta {song_id}/… y NO se mueven.
--
-- QUIÉN LA USA: components/canciones/CancionesPanel.tsx (subida de audio, solo administración) y app/api/portal/cancion/firmar.
-- Sin la migración: la subida de audio falla con un mensaje claro y todo lo demás sigue igual (las funciones del servidor no dependen de
-- esta columna).
-- NO incluye los topes de los buckets actuales: eso es OPCIONAL y vive aparte en migrations/036b-topes-de-buckets-actuales.sql.
-- ============================================================


-- ───────────────────────────────────────
-- A · FUNCIONES DE PERMISO
-- ───────────────────────────────────────

create or replace function public.storage_path_org(p_name text)
returns uuid
language sql immutable
as $$
  select case
    when split_part(coalesce(p_name, ''), '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end
$$;

create or replace function public.has_library_access(p_email text, p_organization_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    p_email is not null and p_organization_id is not null and (
      exists (
        select 1 from organization_members om
        join members m on m.id = om.person_id
        where lower(m.email) = lower(p_email)
          and om.organization_id = p_organization_id
          and om.role in ('owner', 'admin')
      )
      or exists (
        select 1 from team_members tm
        join members m on m.id = tm.member_id
        join teams t on t.id = tm.team_id
        where lower(m.email) = lower(p_email)
          and tm.organization_id = p_organization_id
          and t.organization_id = p_organization_id
          and t.library_access = true
          and t.archived_at is null
      )
    ),
    false)
$$;

create or replace function public.can_manage_library_files(p_email text, p_organization_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    p_email is not null and p_organization_id is not null and (
      exists (
        select 1 from organization_members om
        join members m on m.id = om.person_id
        where lower(m.email) = lower(p_email)
          and om.organization_id = p_organization_id
          and om.role in ('owner', 'admin')
      )
      or exists (
        select 1 from team_members tm
        join members m on m.id = tm.member_id
        join teams t on t.id = tm.team_id
        where lower(m.email) = lower(p_email)
          and tm.organization_id = p_organization_id
          and tm.is_leader = true
          and t.organization_id = p_organization_id
          and t.library_access = true
          and t.archived_at is null
      )
    ),
    false)
$$;

-- Solo las ejecuta quien tiene sesión (las políticas corren con su rol) y el servidor; nadie anónimo. Supabase da EXECUTE a `anon` por
-- privilegios por defecto sobre las funciones nuevas del esquema public: revocar solo de PUBLIC no lo quita, por eso se revoca también de anon.
revoke all on function public.has_library_access(text, uuid) from public, anon;
revoke all on function public.can_manage_library_files(text, uuid) from public, anon;
grant execute on function public.has_library_access(text, uuid) to authenticated, service_role;
grant execute on function public.can_manage_library_files(text, uuid) to authenticated, service_role;


-- ───────────────────────────────────────
-- B · BUCKET PRIVADO song-audio (20 MB; mp3 / m4a / aac)
-- ───────────────────────────────────────
-- Tipos permitidos: lo que declaran los navegadores para estos formatos. La pantalla de administración valida la extensión y los primeros
-- bytes del archivo y sube SIEMPRE con un tipo canónico (audio/mpeg, audio/mp4 o audio/aac), así que no depende de lo que declare iOS
-- (que para .m4a suele ser audio/x-m4a). Si NO se quiere permitir .aac, quitar 'audio/aac' y 'audio/x-aac' de esta lista.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('song-audio', 'song-audio', false, 20971520,
        array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/x-aac'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ───────────────────────────────────────
-- C · POLÍTICAS (solo el bucket song-audio)
-- ───────────────────────────────────────

drop policy if exists "biblioteca lee audio de canciones" on storage.objects;
create policy "biblioteca lee audio de canciones"
on storage.objects for select to authenticated
using (
  bucket_id = 'song-audio'
  and public.has_library_access(auth.jwt() ->> 'email', public.storage_path_org(name))
);

drop policy if exists "biblioteca sube audio de canciones" on storage.objects;
create policy "biblioteca sube audio de canciones"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'song-audio'
  and public.can_manage_library_files(auth.jwt() ->> 'email', public.storage_path_org(name))
);

drop policy if exists "biblioteca reemplaza audio de canciones" on storage.objects;
create policy "biblioteca reemplaza audio de canciones"
on storage.objects for update to authenticated
using (
  bucket_id = 'song-audio'
  and public.can_manage_library_files(auth.jwt() ->> 'email', public.storage_path_org(name))
)
with check (
  bucket_id = 'song-audio'
  and public.can_manage_library_files(auth.jwt() ->> 'email', public.storage_path_org(name))
);

drop policy if exists "biblioteca borra audio de canciones" on storage.objects;
create policy "biblioteca borra audio de canciones"
on storage.objects for delete to authenticated
using (
  bucket_id = 'song-audio'
  and public.can_manage_library_files(auth.jwt() ->> 'email', public.storage_path_org(name))
);


-- ───────────────────────────────────────
-- D · song_attachments.bucket
-- ───────────────────────────────────────

alter table public.song_attachments
  add column if not exists bucket text not null default 'song-attachments'
    check (bucket in ('song-attachments', 'song-audio'));


-- ───────────────────────────────────────
-- VERIFICACIÓN — TODO COMENTADO a propósito: la migración no devuelve nada por sí sola.
-- Para comprobar, descomentá UN bloque, corrélo, mirá el resultado y volvelo a comentar. Ninguno usa correos de personas.
-- ───────────────────────────────────────

-- a · el bucket: public = false, file_size_limit = 20971520 y los 7 tipos (1 fila)
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'song-audio';

-- b · las 3 funciones existen y las dos de permiso son security definer (3 filas; security_definer = false solo en storage_path_org)
-- select p.proname, p.prosecdef as security_definer, pg_get_function_identity_arguments(p.oid) as argumentos
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.proname in ('storage_path_org', 'has_library_access', 'can_manage_library_files')
--  order by p.proname;

-- c · las 4 políticas del bucket (4 filas: DELETE, INSERT, SELECT, UPDATE; roles = {authenticated})
-- select policyname, cmd, roles from pg_policies
--  where schemaname = 'storage' and tablename = 'objects' and policyname like 'biblioteca % audio de canciones'
--  order by cmd;

-- d · la columna: not null, por defecto 'song-attachments' (1 fila) y todo lo que ya había quedó en song-attachments
-- select column_name, data_type, is_nullable, column_default from information_schema.columns
--  where table_schema = 'public' and table_name = 'song_attachments' and column_name = 'bucket';
-- select bucket, kind, count(*) as n from public.song_attachments group by bucket, kind order by 1, 2;

-- e · la ruta: el primer tramo tiene que ser un uuid (1 fila: con_uuid = 00000000-0000-0000-0000-000000000001; sin_uuid y vacia = null)
-- select public.storage_path_org('00000000-0000-0000-0000-000000000001/abc/x.m4a') as con_uuid,
--        public.storage_path_org('basura/x.m4a') as sin_uuid,
--        public.storage_path_org('') as vacia;

-- f · permisos por rol (CONTEOS, sin correos). Por cada rol (owner, admin): personas = leen = gestionan (todos pueden leer y gestionar)
-- select om.role, count(*) as personas,
--        count(*) filter (where public.has_library_access(m.email, om.organization_id)) as leen,
--        count(*) filter (where public.can_manage_library_files(m.email, om.organization_id)) as gestionan
--   from organization_members om join members m on m.id = om.person_id
--  where om.role in ('owner', 'admin') group by om.role order by om.role;

-- g · permisos en equipos CON acceso a la biblioteca, por is_leader (CONTEOS, sin correos).
--     is_leader = true:  personas = leen = gestionan.
--     is_leader = false: personas = leen; gestionan = solo quienes además sean owner/admin (normalmente 0).
-- select tm.is_leader, count(*) as personas,
--        count(*) filter (where public.has_library_access(m.email, tm.organization_id)) as leen,
--        count(*) filter (where public.can_manage_library_files(m.email, tm.organization_id)) as gestionan
--   from team_members tm join members m on m.id = tm.member_id join teams t on t.id = tm.team_id
--  where t.library_access = true and t.archived_at is null group by tm.is_leader order by tm.is_leader desc;

-- h · alguien sin ningún permiso: false y false (1 fila)
-- select public.has_library_access('nadie@ejemplo.com', '00000000-0000-0000-0000-000000000001') as lee,
--        public.can_manage_library_files('nadie@ejemplo.com', '00000000-0000-0000-0000-000000000001') as gestiona;

-- i · `anon` no puede ejecutar las funciones (0 filas: ni EXECUTE directo ni por privilegios por defecto)
-- select p.proname, r.rolname as rol
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace, pg_roles r
--  where n.nspname = 'public' and p.proname in ('has_library_access', 'can_manage_library_files')
--    and r.rolname = 'anon' and has_function_privilege(r.oid, p.oid, 'execute');

-- NOTA: las políticas de storage NO se pueden probar desde el editor SQL (corre como administrador y se las salta). La prueba real es
-- subir un audio desde la administración con tu sesión de Google y comprobar que un archivo de más de 20 MB o de otro tipo se rechaza.


-- ───────────────────────────────────────
-- REVERTIR (solo si hiciera falta; se pierde únicamente lo de esta migración; la subida de audio deja de funcionar)
-- ───────────────────────────────────────
-- PASO 1 — el BUCKET se borra DESDE EL PANEL DE STORAGE, y vacío: abrí Storage → song-audio, borrá sus archivos (o usá «Quitar» en la
--          pantalla de cada canción) y después «Delete bucket». NO uses `delete from storage.buckets ...` en el editor SQL: Supabase lo bloquea.
-- PASO 2 — recién entonces, descomentá y corré esto (políticas, columna y funciones; en este orden):
-- drop policy if exists "biblioteca lee audio de canciones" on storage.objects;
-- drop policy if exists "biblioteca sube audio de canciones" on storage.objects;
-- drop policy if exists "biblioteca reemplaza audio de canciones" on storage.objects;
-- drop policy if exists "biblioteca borra audio de canciones" on storage.objects;
-- alter table public.song_attachments drop column if exists bucket;
-- drop function if exists public.can_manage_library_files(text, uuid);
-- drop function if exists public.has_library_access(text, uuid);
-- drop function if exists public.storage_path_org(text);
