-- ============================================================
-- 027 — Seguridad S0 (punto 34): nadie cambia el correo de una persona
-- salvo un admin de la organización con sesión, o la llave de servicio
--
-- POR QUÉ. is_org_admin() resuelve el rol cruzando members.email con el
-- correo de la sesión de Google (organization_members → members). Y
-- `members` tiene políticas `for all using (true)`: cualquiera con la llave
-- pública puede escribirla. Cambiar el email de un admin por el propio y
-- entrar con Google era, en teoría, una toma de control de /admin
-- (hallazgo de la auditoría del punto 33; NO se probó). Este trigger cierra
-- ESE vector sin tocar ninguna política ni el portal.
--
-- QUÉ HACE. BEFORE UPDATE OF email ON members, solo cuando el correo
-- REALMENTE cambia (WHEN old.email is distinct from new.email — un update
-- que reenvía el mismo correo, como puede hacer un PATCH de fila completa,
-- pasa sin más). Deja pasar el cambio únicamente si quien lo hace es:
--   1. la llave de servicio (rol service_role), o un rol interno de la base
--      (postgres / supabase_admin: el editor SQL de Supabase y las
--      migraciones; no son alcanzables desde la API pública), o
--   2. un admin u owner de la organización DE ESA PERSONA, con sesión:
--      correo de la sesión (auth.jwt()->>'email') + is_org_admin().
-- Cualquier otro caso (anon sin sesión, un músico, un líder que no sea
-- admin) recibe el error 42501 con un mensaje claro.
--
-- VERIFICADO LEYENDO EL CÓDIGO (antes de escribir esto):
--   - El perfil del portal NO edita el correo: sus update de members
--     escriben nombre, apellido, telefono, fecha_nacimiento, instrumentos,
--     last_seen, instalado_pwa_at, avatar_url, chart_prefs y theme.
--   - El único lugar que cambia members.email es el formulario de edición
--     de TeamPanel (/admin), con la sesión de Google del admin.
--   - Los INSERT (alta de personas) no pasan por este trigger.
--
-- NO CUBRE (a propósito, fuera de S0): DELETE o INSERT sobre members, ni el
-- resto de las políticas abiertas. Eso es S3.
--
-- Corré esto en "Ancora - TEST" primero. Idempotente: create or replace +
-- drop trigger if exists. Para quitarlo, ver la sección REVERTIR al final.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — la función del trigger
-- ────────────────────────────────────────────────────────────
-- SECURITY INVOKER (el valor por defecto) a propósito: así current_user es
-- quien de verdad hace el update (anon, authenticated, service_role o el
-- usuario de la base), no el dueño de la función. is_org_admin() es
-- security definer y ya la llama la app con la sesión del usuario, así que
-- `authenticated` puede ejecutarla; para anon se rechaza ANTES de llamarla.

create or replace function public.guard_members_email_change()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_claims jsonb := auth.jwt();
  v_email  text  := nullif(lower(btrim(coalesce(v_claims->>'email', ''))), '');
begin
  -- 1. llave de servicio o rol interno de la base
  if current_user in ('service_role', 'postgres', 'supabase_admin')
     or coalesce(v_claims->>'role', '') = 'service_role' then
    return new;
  end if;

  -- 2. admin / owner de la organización de esa persona, con sesión
  if v_email is not null and public.is_org_admin(v_email, old.organization_id) then
    return new;
  end if;

  raise exception using
    errcode = '42501',
    message = 'Solo un administrador de la organización, con sesión iniciada, puede cambiar el correo de una persona.',
    hint    = 'Iniciá sesión con una cuenta de administrador. El correo es lo que identifica a cada persona al entrar.';
end;
$$;

-- ── Verificación PASO 1 ──
select proname, prosecdef as security_definer
from pg_proc
where proname = 'guard_members_email_change' and pronamespace = 'public'::regnamespace;
-- Debe devolver 1 fila con security_definer = false.


-- ────────────────────────────────────────────────────────────
-- PASO 2 — el trigger
-- ────────────────────────────────────────────────────────────

drop trigger if exists trg_guard_members_email on public.members;
create trigger trg_guard_members_email
  before update of email on public.members
  for each row
  when (old.email is distinct from new.email)
  execute function public.guard_members_email_change();

-- ── Verificación PASO 2 ──
select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.members'::regclass and tgname = 'trg_guard_members_email' and not tgisinternal;
-- Debe devolver 1 fila con tgenabled = 'O' (habilitado).


-- ────────────────────────────────────────────────────────────
-- PASO 3 — verificación: sin sesión, el cambio de correo FALLA
-- ────────────────────────────────────────────────────────────
-- Corré cada bloque POR SEPARADO en el editor SQL. Todos terminan en
-- ROLLBACK: aunque algo salga distinto de lo esperado, no queda ningún
-- cambio guardado. (Si un bloque da error, la transacción queda abortada y
-- se descarta sola al terminar la consulta.)

-- 3a · SIN sesión (la llave pública, como la usa el portal). DEBE FALLAR:
--      ERROR 42501 "Solo un administrador de la organización, con sesión
--      iniciada, puede cambiar el correo de una persona."
--
-- begin;
--   set local role anon;
--   update public.members
--      set email = email || '.prueba'
--    where id = (select id from public.members order by email limit 1);
-- rollback;

-- 3b · CON sesión pero sin ser admin (cualquier correo que no sea de un
--      admin). DEBE FALLAR igual:
--
-- begin;
--   select set_config('request.jwt.claims',
--     '{"role":"authenticated","email":"nadie@ejemplo.com"}', true);
--   set local role authenticated;
--   update public.members
--      set email = email || '.prueba'
--    where id = (select id from public.members order by email limit 1);
-- rollback;

-- 3c · CON sesión de un admin: DEBE FUNCIONAR (reemplazá el correo por el de
--      un admin real). Devuelve la fila actualizada y después se descarta:
--
-- begin;
--   select set_config('request.jwt.claims',
--     '{"role":"authenticated","email":"CORREO_DE_UN_ADMIN@gmail.com"}', true);
--   set local role authenticated;
--   update public.members
--      set email = email || '.prueba'
--    where id = (select id from public.members order by email limit 1)
--   returning email;
-- rollback;

-- 3d · SIN sesión pero SIN cambiar el correo (lo que puede mandar el portal
--      al guardar el perfil): DEBE FUNCIONAR, no es un cambio de correo.
--
-- begin;
--   set local role anon;
--   update public.members set email = email, last_seen = now()
--    where id = (select id from public.members order by email limit 1)
--   returning id;
-- rollback;


-- ────────────────────────────────────────────────────────────
-- REVERTIR — quitar el trigger (y la función). No toca datos.
-- ────────────────────────────────────────────────────────────
-- drop trigger if exists trg_guard_members_email on public.members;
-- drop function if exists public.guard_members_email_change();
