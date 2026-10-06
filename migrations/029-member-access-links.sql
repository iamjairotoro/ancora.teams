-- ============================================================
-- 029 — Identidad del músico (punto 48, S2): enlaces de acceso personales,
--       sesiones del portal e índice único de correo sin distinguir mayúsculas
--
-- POR QUÉ. Hoy members.id es una credencial (/portal/member_<id>) y los tokens de
-- `invitations` se pueden leer con la llave pública. Esto crea lo necesario para
-- identificar al músico EN EL SERVIDOR con un enlace secreto personal:
--
--   member_access_links   un enlace por persona. SOLO se guarda el HASH (SHA-256,
--                         hex) del token; el token (32 bytes aleatorios) se muestra
--                         UNA vez al administrador y no se puede recuperar.
--                         Tiene vencimiento (expires_at, lo elige el admin: 7 / 30
--                         / 90 días) y revocación (revoked_at). A lo sumo UN enlace
--                         ACTIVO (sin revocar) por persona: regenerar revoca el
--                         anterior.
--   member_portal_sessions el token se canjea UNA vez por una sesión: la cookie del
--                         portal guarda un identificador OPACO aleatorio (aquí solo
--                         su hash) y NO el token. Cada petición se comprueba en la
--                         base contra su enlace, así que revocar o vencer el enlace
--                         corta la sesión DE INMEDIATO. No hace falta ningún secreto
--                         nuevo (nada firmado).
--
-- Las dos tablas quedan con RLS activada y SIN ninguna política, y sin permisos
-- para anon/authenticated: la llave pública NO las ve ni las escribe; solo el
-- servidor con la llave de servicio (lib/supabase/admin.ts).
--
-- ÍNDICE ÚNICO members(lower(email)). La app compara correos sin distinguir
-- mayúsculas; hoy solo hay unique(email), que acepta «A@x» y «a@x» a la vez. Antes
-- de crearlo, el PASO 1 comprueba que no haya duplicados y, si los hay, FALLA con un
-- mensaje claro que los lista. NO reescribe ni borra ningún dato.
--
-- Corré esto en "Ancora - Teams". Idempotente (if not exists). Para quitarlo, ver
-- REVERTIR al final.
-- ============================================================


-- ───────────────────────────────────────
-- PASO 1 — comprobación previa de correos repetidos (NO modifica nada)
-- ───────────────────────────────────────
do $$
declare
  repetidos text;
begin
  select string_agg(d.correo || ' (' || d.n || ' filas)', ', ' order by d.correo)
    into repetidos
    from (
      select lower(email) as correo, count(*) as n
        from public.members
       group by lower(email)
      having count(*) > 1
    ) d;

  if repetidos is not null then
    raise exception
      'No se puede crear el indice unico sobre lower(email): hay correos repetidos que solo cambian en mayusculas: %. Corrige o elimina los duplicados en Personas y vuelve a correr esta migracion. No se modifico ningun dato.',
      repetidos;
  end if;
end $$;


-- ───────────────────────────────────────
-- PASO 2 — índice único sobre lower(email)
-- ───────────────────────────────────────
create unique index if not exists members_email_lower_key
  on public.members (lower(email));


-- ───────────────────────────────────────
-- PASO 3 — member_access_links
-- ───────────────────────────────────────
create table if not exists public.member_access_links (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  member_id       uuid not null references public.members(id) on delete cascade,
  -- SHA-256 del token en hex (64 caracteres). El token NUNCA se guarda.
  token_hash      text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at      timestamptz not null default now(),
  created_by      uuid references public.members(id) on delete set null,
  expires_at      timestamptz not null,
  revoked_at      timestamptz,
  revoked_by      uuid references public.members(id) on delete set null,
  last_used_at    timestamptz,
  constraint member_access_links_expiry_check check (expires_at > created_at)
);

create index if not exists member_access_links_member
  on public.member_access_links (member_id);

-- A lo sumo un enlace ACTIVO (sin revocar) por persona.
create unique index if not exists member_access_links_one_active
  on public.member_access_links (member_id) where revoked_at is null;


-- ───────────────────────────────────────
-- PASO 4 — member_portal_sessions
-- ───────────────────────────────────────
create table if not exists public.member_portal_sessions (
  id           uuid primary key default gen_random_uuid(),
  link_id      uuid not null references public.member_access_links(id) on delete cascade,
  member_id    uuid not null references public.members(id) on delete cascade,
  -- SHA-256 (hex) del identificador opaco de la cookie. La cookie NO lleva el token.
  session_hash text not null unique check (session_hash ~ '^[0-9a-f]{64}$'),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz,
  expires_at   timestamptz not null
);

create index if not exists member_portal_sessions_link   on public.member_portal_sessions (link_id);
create index if not exists member_portal_sessions_member on public.member_portal_sessions (member_id);


-- ───────────────────────────────────────
-- PASO 5 — RLS activada, SIN políticas y sin permisos para la llave pública
-- ───────────────────────────────────────
alter table public.member_access_links   enable row level security;
alter table public.member_portal_sessions enable row level security;

revoke all on table public.member_access_links    from anon, authenticated;
revoke all on table public.member_portal_sessions from anon, authenticated;


-- ───────────────────────────────────────
-- PASO 6 — VERIFICACIÓN (correr cada bloque por separado)
-- ───────────────────────────────────────

-- 6a · las dos tablas existen con RLS activada (rowsecurity = true en ambas)
--
-- select tablename, rowsecurity from pg_tables
--  where schemaname = 'public' and tablename in ('member_access_links','member_portal_sessions');

-- 6b · NO hay ninguna política sobre ellas (debe dar 0)
--
-- select count(*) as politicas from pg_policies
--  where tablename in ('member_access_links','member_portal_sessions');

-- 6c · los índices existen (members_email_lower_key y member_access_links_one_active)
--
-- select indexname from pg_indexes
--  where schemaname = 'public'
--    and indexname in ('members_email_lower_key','member_access_links_one_active');

-- 6d · la llave pública NO puede leerlas: DEBE FALLAR con «permission denied»
--
-- begin;
--   set local role anon;
--   select count(*) from public.member_access_links;
-- rollback;

-- 6e · el índice de correo rechaza un duplicado que solo cambia en mayúsculas:
--      DEBE FALLAR con 23505 (y el rollback deja todo como estaba)
--
-- begin;
--   insert into public.members (nombre, email)
--   select 'Prueba', upper(email) from public.members order by email limit 1;
-- rollback;


-- ───────────────────────────────────────
-- REVERTIR — quita lo creado (no toca los datos de members)
-- ───────────────────────────────────────
-- drop table if exists public.member_portal_sessions;
-- drop table if exists public.member_access_links;
-- drop index if exists public.members_email_lower_key;
