-- ============================================================
-- Punto 50 — DIAGNÓSTICO de seguridad (SOLO LECTURA)
--
-- Cómo usarlo: Supabase → SQL Editor → corré UN bloque a la vez (seleccioná el bloque
-- y «Run»). Ninguna consulta escribe, crea ni borra nada. Copiá el resultado de cada
-- bloque (o una captura) y traéselo a Code. No hace falta correrlo todo junto.
--
-- Qué NO imprime a propósito: el cuerpo de las funciones (el secreto interno está escrito
-- dentro de las funciones de aviso) ni ningún dato personal (solo conteos).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- BLOQUE 1 — ¿Qué tablas de `public` tienen RLS activado?
-- Esperado: todas con rls = true. Una con false está ABIERTA a la clave pública
-- (sospechosa: organizations, messages y cualquier tabla creada desde el panel).
-- ────────────────────────────────────────────────────────────
select c.relname as tabla,
       c.relrowsecurity as rls_activado,
       c.relforcerowsecurity as rls_forzado_al_dueno
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relrowsecurity, c.relname;


-- ────────────────────────────────────────────────────────────
-- BLOQUE 2 — Todas las políticas (tablas de `public` y Storage)
-- Mirá sobre todo: qual = 'true', roles que incluyan {public} o {anon}, y las de
-- cmd = ALL / INSERT / UPDATE / DELETE sin condición.
-- ────────────────────────────────────────────────────────────
select schemaname as esquema, tablename as tabla, policyname as politica,
       cmd as comando, roles, permissive as permisiva,
       qual as using_, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;


-- ────────────────────────────────────────────────────────────
-- BLOQUE 3 — Permisos (GRANT) sobre tablas para anon / authenticated / PUBLIC
-- Supabase da por defecto todos los permisos a anon y authenticated; lo que protege es RLS.
-- Una tabla con RLS desactivado y estos permisos es lectura/escritura libre.
-- ────────────────────────────────────────────────────────────
select table_name as tabla, grantee,
       string_agg(privilege_type, ', ' order by privilege_type) as permisos
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')
group by table_name, grantee
order by table_name, grantee;


-- ────────────────────────────────────────────────────────────
-- BLOQUE 4 — Permisos sobre secuencias
-- ────────────────────────────────────────────────────────────
select object_name as secuencia, grantee, string_agg(privilege_type, ', ') as permisos
from information_schema.role_usage_grants
where object_schema = 'public' and object_type = 'SEQUENCE'
  and grantee in ('anon', 'authenticated', 'PUBLIC')
group by object_name, grantee
order by object_name, grantee;


-- ────────────────────────────────────────────────────────────
-- BLOQUE 5 — Funciones de `public`: ¿son security definer y quién puede ejecutarlas?
-- anon_ejecuta / auth_ejecuta salen de has_function_privilege. En Postgres, por defecto
-- EXECUTE lo tiene PUBLIC: una función security definer con anon_ejecuta = true la puede
-- llamar cualquiera con la clave pública (por /rest/v1/rpc/<nombre>).
-- No se imprime el cuerpo de la función.
-- ────────────────────────────────────────────────────────────
select p.proname as funcion,
       pg_get_function_identity_arguments(p.oid) as argumentos,
       p.prosecdef as security_definer,
       (p.prorettype = 'trigger'::regtype) as es_trigger,
       has_function_privilege('anon', p.oid, 'execute') as anon_ejecuta,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_ejecuta,
       has_function_privilege('service_role', p.oid, 'execute') as service_ejecuta,
       p.proacl::text as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.prosecdef desc, anon_ejecuta desc, p.proname;


-- ────────────────────────────────────────────────────────────
-- BLOQUE 6 — Permisos por defecto para objetos nuevos (¿nacen abiertos?)
-- ────────────────────────────────────────────────────────────
select pg_get_userbyid(defaclrole) as rol_creador,
       defaclnamespace::regnamespace as esquema,
       defaclobjtype as tipo,  -- r = tabla, S = secuencia, f = función
       defaclacl::text as acl
from pg_default_acl
order by 1, 2, 3;


-- ────────────────────────────────────────────────────────────
-- BLOQUE 7 — Buckets de Storage
-- public = true: cualquiera con la URL lee el archivo. Mirá también los topes y tipos.
-- (Las políticas de Storage están en el bloque 2, esquema storage.)
-- ────────────────────────────────────────────────────────────
select id as bucket, public as publico, file_size_limit as tope_bytes,
       allowed_mime_types as tipos_permitidos
from storage.buckets
order by id;


-- ────────────────────────────────────────────────────────────
-- BLOQUE 8 — ¿Qué tablas publica Realtime? (Realtime respeta RLS; una tabla publicada
-- y abierta transmite sus cambios a cualquiera.)
-- ────────────────────────────────────────────────────────────
select schemaname as esquema, tablename as tabla
from pg_publication_tables
where pubname = 'supabase_realtime'
order by 1, 2;


-- ────────────────────────────────────────────────────────────
-- BLOQUE 9 — Disparadores de la base (los que llaman a la app con el secreto interno)
-- Solo nombres: sirve para saber cuántas funciones hay que actualizar al rotar el secreto.
-- ────────────────────────────────────────────────────────────
select t.tgname as disparador, c.relname as tabla, p.proname as funcion,
       (p.prosrc ilike '%x-internal-secret%') as lleva_secreto_interno,
       (p.prosrc ilike '%net.http_post%') as llama_a_la_app
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal
order by lleva_secreto_interno desc, c.relname, t.tgname;


-- ────────────────────────────────────────────────────────────
-- BLOQUE 10 — ¿A qué dirección llaman esos disparadores? (sin el secreto)
-- Para comprobar que apuntan al despliegue de producción correcto antes de llevar dev a main.
-- Imprime solo el dominio que aparece después de «url := '».
-- ────────────────────────────────────────────────────────────
select p.proname as funcion,
       substring(p.prosrc from $re$url\s*:=\s*'(https?://[^/']+)$re$) as dominio_al_que_llama
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosrc ilike '%net.http_post%'
order by 1;


-- ────────────────────────────────────────────────────────────
-- BLOQUE 11 — Conteos (sin datos personales): ¿los datos son de prueba o reales?
-- ────────────────────────────────────────────────────────────
select (select count(*) from members) as personas,
       (select count(*) filter (where email ilike '%@test.local') from members) as personas_de_prueba,
       (select count(*) from members where email is null or email = '') as sin_correo,
       (select count(*) from invitations) as invitaciones,
       (select count(*) from messages) as mensajes,
       (select count(*) from push_subscriptions) as suscripciones_push,
       (select count(*) from organizations) as organizaciones;


-- ────────────────────────────────────────────────────────────
-- BLOQUE 12 — ¿Qué migraciones del repo están aplicadas en ESTA base?
-- (Cada fila es una pista: existe o no el objeto que esa migración crea.)
-- ────────────────────────────────────────────────────────────
select 'date_blocks.team_id (031)' as migracion,
       exists (select 1 from information_schema.columns where table_schema='public' and table_name='date_blocks' and column_name='team_id') as aplicada
union all select 'member_access_links (029)',
       exists (select 1 from information_schema.tables where table_schema='public' and table_name='member_access_links')
union all select 'invitations.team_id (037b)',
       exists (select 1 from information_schema.columns where table_schema='public' and table_name='invitations' and column_name='team_id')
union all select 'invitations.declined_reason (037c)',
       exists (select 1 from information_schema.columns where table_schema='public' and table_name='invitations' and column_name='declined_reason')
union all select 'función responder_convocatoria (037c/d)',
       exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='responder_convocatoria')
union all select 'función convocatoria_cerrada (037d)',
       exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='convocatoria_cerrada')
union all select 'bucket song-audio (036)',
       exists (select 1 from storage.buckets where id = 'song-audio')
union all select 'banda_assignments.team_position_id (037a)',
       exists (select 1 from information_schema.columns where table_schema='public' and table_name='banda_assignments' and column_name='team_position_id')
union all select 'organization_members (023)',
       exists (select 1 from information_schema.tables where table_schema='public' and table_name='organization_members');


-- ────────────────────────────────────────────────────────────
-- BLOQUE 13 — Respuestas recientes de la app a los avisos de la base (pg_net)
-- Dice si hoy el secreto de los disparadores COINCIDE con INTERNAL_API_SECRET de Vercel:
-- 200 = coincide (o la app no lo exige todavía); 401 = no coincide. Solo códigos y conteos.
-- Si pg_net no está activo o la tabla no existe, esta consulta dará error: no pasa nada.
-- ────────────────────────────────────────────────────────────
select status_code, count(*) as respuestas, max(created) as la_ultima
from net._http_response
where created > now() - interval '30 days'
group by status_code
order by status_code;
