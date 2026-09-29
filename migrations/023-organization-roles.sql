-- ============================================================
-- Fase 23 — roles de organización (punto 14 de docs/PENDIENTES-code.md)
--
-- Hoy team_admins solo distingue "admin de organización" (team_id null,
-- vía is_org_admin) de "líder de un equipo" (team_members.is_leader).
-- No existe la distinción Owner/Admin que pide el punto 14 — todo admin
-- de organización de hoy puede, sin querer, nombrar a otro admin o borrar
-- la organización. Esta fase agrega esa capa encima, sin tocar
-- team_admins ni is_team_admin (quedan como están, ver nota del PASO 3).
--
-- Matriz que implementa (docs/PENDIENTES-code.md, punto 14):
--   Owner   — todo, incluido nombrar admins y borrar la organización.
--   Admin   — crea/edita servicios (fecha, setlist, estructura), administra
--             cualquier equipo. NO nombra admins ni borra la organización.
--   Líder   — administra SU equipo (team_members.is_leader, ya existía) y
--             asigna gente a los slots de SU equipo. No toca fecha,
--             setlist, estructura ni otros equipos.
--   Integrante — ve y confirma.
--
-- Corré esto en "Ancora - TEST" primero, PASO a PASO, y recién cuando lo
-- confirmes ahí se corre igual en "Ancora - Teams" (prod).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — tabla organization_members
-- ────────────────────────────────────────────────────────────

create table if not exists organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  person_id       uuid not null references members(id) on delete cascade,
  role            text not null check (role in ('owner','admin','member')),
  created_at      timestamptz not null default now(),
  primary key (organization_id, person_id)
);

create index if not exists idx_organization_members_person on organization_members(person_id);

-- ── Verificación PASO 1 ──
-- Debe existir la tabla, 0 filas todavía.
select count(*) from organization_members;


-- ────────────────────────────────────────────────────────────
-- PASO 2 — migrar los admins globales de hoy → Owner
-- ────────────────────────────────────────────────────────────
-- team_admins con team_id null son, hoy, admins sin restricción — ya
-- pueden hacer todo lo que un Owner podría hacer. Bajarlos a 'admin'
-- sería quitarles poder sin que nadie lo haya decidido; se preservan
-- como 'owner'. Los roles 'admin' (con menos permisos) se asignan
-- después, desde la app, por un Owner — no hay forma de saber hoy quién
-- debería quedar en ese nivel intermedio.

insert into organization_members (organization_id, person_id, role)
select ta.organization_id, ta.member_id, 'owner'
from team_admins ta
where ta.team_id is null
on conflict (organization_id, person_id) do nothing;

-- ── Verificación PASO 2 ──
-- Debe coincidir con el total de admins globales de team_admins.
select
  (select count(*) from team_admins where team_id is null) as admins_globales_antes,
  (select count(*) from organization_members where role = 'owner') as owners_despues;


-- ────────────────────────────────────────────────────────────
-- PASO 3 — is_org_admin pasa a leer organization_members
-- ────────────────────────────────────────────────────────────
-- Mismo nombre y firma que ya usan ~15 archivos de RLS y
-- lib/auth/authorize.ts — no hace falta tocar ningún call site, solo el
-- cuerpo de la función. team_admins queda en la base sin usarse desde
-- acá en más (igual que admin_emails desde la fase 2) — no se borra por
-- si hace falta volver atrás. is_team_admin (migrations/002-teams.sql)
-- tampoco se toca: desde la fase 8 ya no tiene filas con team_id no nulo,
-- así que hoy es equivalente a is_org_admin — se deja como está, no se
-- reutiliza para el líder de equipo (ver is_team_leader, PASO 5).

create or replace function is_org_admin(p_email text, p_organization_id uuid)
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from organization_members om
    join members m on m.id = om.person_id
    where lower(m.email) = lower(p_email)
      and om.organization_id = p_organization_id
      and om.role in ('owner','admin')
  );
$$;

-- ── Verificación PASO 3 ──
-- Debe devolver true para cualquier email que haya quedado como owner
-- en el PASO 2 (reemplazar el email de prueba).
select is_org_admin('nadie@ejemplo.com', '00000000-0000-0000-0000-000000000001');


-- ────────────────────────────────────────────────────────────
-- PASO 4 — is_org_owner(email, organization_id)
-- ────────────────────────────────────────────────────────────
-- Gate específico para lo que SOLO puede hacer el Owner: nombrar/quitar
-- admins y (en el futuro) borrar la organización.

create or replace function is_org_owner(p_email text, p_organization_id uuid)
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from organization_members om
    join members m on m.id = om.person_id
    where lower(m.email) = lower(p_email)
      and om.organization_id = p_organization_id
      and om.role = 'owner'
  );
$$;

-- ── Verificación PASO 4 ──
select is_org_owner('nadie@ejemplo.com', '00000000-0000-0000-0000-000000000001');


-- ────────────────────────────────────────────────────────────
-- PASO 5 — is_team_leader / is_any_team_leader
-- ────────────────────────────────────────────────────────────
-- El liderazgo de equipo YA existe (team_members.is_leader, fase 8) —
-- estas dos funciones son solo la forma estándar de consultarlo desde
-- RLS y desde la app, igual que is_org_admin. is_team_leader es para
-- políticas acotadas a UN equipo (administrar su equipo, asignar sus
-- slots). is_any_team_leader es para gates binarios que no dependen de
-- cuál equipo (ej. subir adjuntos de canciones, entrar a /home).

create or replace function is_team_leader(p_email text, p_team_id uuid, p_organization_id uuid)
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from team_members tm
    join members m on m.id = tm.member_id
    where lower(m.email) = lower(p_email)
      and tm.organization_id = p_organization_id
      and tm.team_id = p_team_id
      and tm.is_leader = true
  );
$$;

create or replace function is_any_team_leader(p_email text, p_organization_id uuid)
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from team_members tm
    join members m on m.id = tm.member_id
    where lower(m.email) = lower(p_email)
      and tm.organization_id = p_organization_id
      and tm.is_leader = true
  );
$$;

-- ── Verificación PASO 5 ──
select is_team_leader('nadie@ejemplo.com', null, '00000000-0000-0000-0000-000000000001');
select is_any_team_leader('nadie@ejemplo.com', '00000000-0000-0000-0000-000000000001');


-- ────────────────────────────────────────────────────────────
-- PASO 6 — RLS de organization_members
-- ────────────────────────────────────────────────────────────
-- Lectura: cualquier admin/owner de la organización (hace falta para que
-- la propia app pueda listar quién es qué). Escritura (nombrar o quitar
-- admins): SOLO el Owner — es exactamente el permiso que esta fase
-- separa del resto.

alter table organization_members enable row level security;

drop policy if exists "org admins read organization_members" on organization_members;
create policy "org admins read organization_members" on organization_members
  for select using (is_org_admin(auth.jwt()->>'email', organization_id));

drop policy if exists "org owners write organization_members" on organization_members;
create policy "org owners write organization_members" on organization_members
  for all
  using (is_org_owner(auth.jwt()->>'email', organization_id))
  with check (is_org_owner(auth.jwt()->>'email', organization_id));

-- ── Verificación PASO 6 ──
select tablename, policyname, cmd from pg_policies where tablename = 'organization_members';
select tablename, rowsecurity from pg_tables where tablename = 'organization_members';


-- ────────────────────────────────────────────────────────────
-- PASO 7 — team_members / team_member_positions: el líder administra SU
-- equipo (agregar, quitar, posiciones)
-- ────────────────────────────────────────────────────────────
-- Se agregan políticas NUEVAS (no se tocan las de is_org_admin de las
-- fases 4 y 7 — postgres las combina con OR para el mismo comando). Un
-- líder puede escribir team_members/team_member_positions solo de SU
-- equipo — nunca de otro, y nunca crear equipos ni posiciones nuevas
-- (eso sigue siendo cosa de Admin/Owner, vía is_org_admin).

drop policy if exists "team leaders write own team_members" on team_members;
create policy "team leaders write own team_members" on team_members
  for all
  using (is_team_leader(auth.jwt()->>'email', team_id, organization_id))
  with check (is_team_leader(auth.jwt()->>'email', team_id, organization_id));

drop policy if exists "team leaders write own team_member_positions" on team_member_positions;
create policy "team leaders write own team_member_positions" on team_member_positions
  for all
  using (
    exists (
      select 1 from team_members tm
      where tm.id = team_member_positions.team_member_id
        and is_team_leader(auth.jwt()->>'email', tm.team_id, tm.organization_id)
    )
  )
  with check (
    exists (
      select 1 from team_members tm
      where tm.id = team_member_positions.team_member_id
        and is_team_leader(auth.jwt()->>'email', tm.team_id, tm.organization_id)
    )
  );

-- ── Verificación PASO 7 ──
select tablename, policyname, cmd from pg_policies
where tablename in ('team_members','team_member_positions')
order by tablename, policyname;


-- ────────────────────────────────────────────────────────────
-- PASO 8 — lectura pública de teams
-- ────────────────────────────────────────────────────────────
-- team_positions ya tiene "lectura pública" (fase 7: "son solo nombres/
-- códigos... no quién ocupa cada una") — teams es exactamente el mismo
-- caso (el nombre del equipo, nada de quién pertenece) y hoy le falta.
-- Sin esto, un líder no puede ni siquiera resolver el NOMBRE de su
-- propio equipo en /home — la política de is_org_admin (fase 2) seguía
-- siendo la única para leer teams.
--
-- OJO: esta política puede ya existir en la base (no fue creada por esta
-- fase — no hay drop-if-exists acá, a propósito). Si ya está, se deja
-- exactamente como está en vez de recrearla.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'teams' and policyname = 'public read teams'
  ) then
    create policy "public read teams" on teams for select using (true);
  end if;
end $$;

-- ── Verificación PASO 8 ──
select tablename, policyname, cmd from pg_policies where tablename = 'teams' order by policyname;


-- ────────────────────────────────────────────────────────────
-- PASO 9 — adjuntos de canciones: cualquier líder de equipo puede subir
-- ────────────────────────────────────────────────────────────
-- Reemplaza las 3 políticas de escritura de migrations/021 (insert,
-- update, delete) agregando "o es líder de algún equipo" — no hay
-- "create or replace policy" en Postgres, así que se dropean y se
-- vuelven a crear. La política de lectura (021, "miembros leen...") no
-- cambia — ya no estaba restringida a admins.

drop policy if exists "admins suben adjuntos de canciones" on storage.objects;
create policy "admins suben adjuntos de canciones"
on storage.objects for insert
with check (
  bucket_id = 'song-attachments'
  and (
    is_org_admin(auth.jwt()->>'email', '00000000-0000-0000-0000-000000000001')
    or is_any_team_leader(auth.jwt()->>'email', '00000000-0000-0000-0000-000000000001')
  )
);

drop policy if exists "admins reemplazan adjuntos de canciones" on storage.objects;
create policy "admins reemplazan adjuntos de canciones"
on storage.objects for update
using (
  bucket_id = 'song-attachments'
  and (
    is_org_admin(auth.jwt()->>'email', '00000000-0000-0000-0000-000000000001')
    or is_any_team_leader(auth.jwt()->>'email', '00000000-0000-0000-0000-000000000001')
  )
)
with check (
  bucket_id = 'song-attachments'
  and (
    is_org_admin(auth.jwt()->>'email', '00000000-0000-0000-0000-000000000001')
    or is_any_team_leader(auth.jwt()->>'email', '00000000-0000-0000-0000-000000000001')
  )
);

drop policy if exists "admins borran adjuntos de canciones" on storage.objects;
create policy "admins borran adjuntos de canciones"
on storage.objects for delete
using (
  bucket_id = 'song-attachments'
  and (
    is_org_admin(auth.jwt()->>'email', '00000000-0000-0000-0000-000000000001')
    or is_any_team_leader(auth.jwt()->>'email', '00000000-0000-0000-0000-000000000001')
  )
);

-- ── Verificación PASO 9 ──
select policyname, cmd from pg_policies where tablename = 'objects' and schemaname = 'storage' and policyname like '%adjuntos%';


-- ────────────────────────────────────────────────────────────
-- PASO 10 — conteo de bloqueos de "otros equipos" para el panel del día
-- de /home (punto 15/14: el líder ve su equipo con nombre, el resto solo
-- como conteo)
-- ────────────────────────────────────────────────────────────
-- La política del PASO 7 deja leer team_members SOLO del equipo propio
-- (para un líder) — correcto para el detalle de "tu equipo", pero un
-- líder no puede armar el conteo de los demás equipos desde el cliente
-- porque no le llegan esas filas. Esta función corre con privilegios
-- elevados para poder contarlas SIN exponerlas fila por fila: solo
-- entrega (nombre de equipo, cuántos), nunca quién. El where interno
-- filtra por rol al final — si quien llama no es admin/owner/líder de
-- algún equipo, devuelve 0 filas en vez de fallar.

create or replace function blocked_others_summary(
  p_email text, p_organization_id uuid, p_date date, p_own_team_id uuid
)
returns table(team_name text, cnt bigint)
language sql security definer set search_path = public
as $$
  select t.name, count(*)
  from date_blocks db
  join team_members tm on tm.member_id = db.member_id and tm.organization_id = p_organization_id
  join teams t on t.id = tm.team_id
  where db.blocked_date = p_date
    and tm.team_id is distinct from p_own_team_id
    and (
      is_org_admin(p_email, p_organization_id)
      or is_any_team_leader(p_email, p_organization_id)
    )
  group by t.name
  order by t.name;
$$;

-- ── Verificación PASO 10 ──
-- No debe fallar (0 filas es la respuesta esperada sin datos de prueba).
select * from blocked_others_summary('nadie@ejemplo.com', '00000000-0000-0000-0000-000000000001', current_date, null);


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────
select 'organization_members' as tabla, count(*) from organization_members
union all
select 'organization_members owners', count(*) from organization_members where role = 'owner'
union all
select 'organization_members admins', count(*) from organization_members where role = 'admin'
union all
select 'team_members líderes (sin cambios, ya existían)', count(*) from team_members where is_leader;

-- team_admins NO se toca ni se borra en esta fase — sigue siendo la
-- fuente de is_team_admin (vestigial desde la fase 8, ver PASO 3) y
-- queda como respaldo de los admins globales migrados en el PASO 2.
