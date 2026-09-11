-- ============================================================
-- Fase 9 — Secciones dentro de un equipo (brief actualizado de Claudia)
--
-- Agrega el nivel intermedio opcional entre Equipo y Posición:
-- Equipo → Sección (opcional) → Posición → Persona. Es el mismo lugar
-- que hoy ocupan, hardcodeados en el código del servicio, los
-- encabezados BANDA/VOCES/TÉCNICA — acá se vuelven filas editables.
--
-- 100% aditivo: no toca teams, team_members, team_admins ni ninguna
-- posición existente (todas quedan con section_id = null, "sueltas",
-- que es un estado tan válido como cualquier otro).
--
-- Corré esto PRIMERO en "Ancora - TEST", paso a paso, confirmando cada
-- verificación antes de seguir.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — tabla team_sections
-- ────────────────────────────────────────────────────────────

create table if not exists team_sections (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  team_id         uuid not null references teams(id) on delete cascade,
  name            text not null,
  sort_order      int  not null default 0,
  archived_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_team_sections_team on team_sections(team_id);
create unique index if not exists team_sections_name_active
  on team_sections (team_id, lower(name)) where archived_at is null;

-- ── Verificación PASO 1 ──
-- Debe existir la tabla, 0 filas todavía.
select count(*) from team_sections;


-- ────────────────────────────────────────────────────────────
-- PASO 2 — RLS de team_sections (mismo patrón que team_positions:
-- admin de organización + lectura pública, porque es solo nombre de
-- agrupación, no quién está en ella)
-- ────────────────────────────────────────────────────────────

alter table team_sections enable row level security;

create policy "org admins read team_sections" on team_sections
  for select using (is_org_admin(auth.jwt()->>'email', organization_id));

create policy "org admins write team_sections" on team_sections
  for all
  using (is_org_admin(auth.jwt()->>'email', organization_id))
  with check (is_org_admin(auth.jwt()->>'email', organization_id));

create policy "public read team_sections" on team_sections
  for select using (true);

-- ── Verificación PASO 2 ──
-- Debe listar 3 policies (2 admin + 1 pública).
select policyname, cmd from pg_policies where tablename = 'team_sections';


-- ────────────────────────────────────────────────────────────
-- PASO 3 — team_positions.section_id
-- ────────────────────────────────────────────────────────────
-- ON DELETE SET NULL: si alguna vez se borrara en duro una sección (hoy
-- la app solo la archiva, nunca la borra), sus posiciones no se
-- pierden — quedan sueltas, igual que al archivar.

alter table team_positions add column if not exists section_id uuid references team_sections(id) on delete set null;

-- ── Verificación PASO 3 ──
-- Debe existir la columna, todo en null todavía (0 posiciones tienen sección).
select column_name, is_nullable from information_schema.columns
where table_name = 'team_positions' and column_name = 'section_id';
select count(*) as total, count(section_id) as con_seccion from team_positions;


-- ────────────────────────────────────────────────────────────
-- PASO 4 — trigger: la sección de una posición debe ser del mismo equipo
-- ────────────────────────────────────────────────────────────
-- Ninguna FK sola lo garantiza (section_id no sabe nada de team_id).

create or replace function check_team_position_section_same_team()
returns trigger
language plpgsql
as $$
declare
  v_section_team_id uuid;
begin
  if new.section_id is null then
    return new;
  end if;
  select team_id into v_section_team_id from team_sections where id = new.section_id;
  if v_section_team_id is distinct from new.team_id then
    raise exception 'team_positions: la sección % no pertenece al mismo equipo que la posición (equipo % vs %)',
      new.section_id, v_section_team_id, new.team_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_team_position_section_same_team on team_positions;
create trigger trg_check_team_position_section_same_team
  before insert or update on team_positions
  for each row execute function check_team_position_section_same_team();

-- ── Verificación PASO 4 ──
select tgname from pg_trigger where tgrelid = 'team_positions'::regclass and tgname = 'trg_check_team_position_section_same_team';


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL DE ESTA FASE
-- ────────────────────────────────────────────────────────────
-- Nada existente cambió de comportamiento: banda_assignments, Servicio,
-- team_members y las posiciones ya creadas siguen exactamente igual
-- (todas "sueltas", section_id null). Las secciones son puramente
-- opcionales desde acá — un equipo puede no tener ninguna y seguir
-- funcionando como hasta ahora.

select 'team_sections' as tabla, count(*) from team_sections
union all
select 'team_positions con sección', count(*) from team_positions where section_id is not null
union all
select 'team_positions sin sección', count(*) from team_positions where section_id is null;
