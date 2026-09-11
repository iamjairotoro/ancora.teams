-- ============================================================
-- Fase 11 — herramienta por equipo (Setlist / Checklist / Subir archivo)
--
-- Cada equipo puede tener una "herramienta" propia que aparece en su
-- pestaña dentro de Servicio: Alabanza usa el setlist que ya existe,
-- Producción usa un checklist nuevo (con plantillas reutilizables por
-- equipo). "Subir archivo" queda como valor válido para más adelante,
-- no se implementa todavía.
--
-- 100% aditivo — no toca banda_assignments, invitations, ni ninguna
-- tabla existente. No se auto-asigna tool_type a ningún equipo por
-- nombre: queda null hasta que se configure a mano desde la interfaz.
--
-- Corré esto en "Ancora - TEST" primero, paso a paso, y después en la
-- base real.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — teams.tool_type
-- ────────────────────────────────────────────────────────────

alter table teams add column if not exists tool_type text
  check (tool_type in ('setlist','checklist','file_upload'));

-- ── Verificación PASO 1 ──
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'teams' and column_name = 'tool_type';


-- ────────────────────────────────────────────────────────────
-- PASO 2 — plantillas de checklist (una por equipo)
-- ────────────────────────────────────────────────────────────

create table if not exists checklist_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  team_id         uuid not null references teams(id) on delete cascade,
  name            text not null,
  sort_order      int  not null default 0,
  archived_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_checklist_templates_team on checklist_templates(team_id);

create table if not exists checklist_template_items (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references checklist_templates(id) on delete cascade,
  texto       text not null,
  sort_order  int  not null default 0
);
create index if not exists idx_checklist_template_items_template on checklist_template_items(template_id);

-- ── Verificación PASO 2 ──
select count(*) from checklist_templates;
select count(*) from checklist_template_items;


-- ────────────────────────────────────────────────────────────
-- PASO 3 — instancia por servicio (copia los items de la plantilla
-- elegida — nunca una referencia viva, para no cambiar checklists de
-- domingos ya pasados si se edita la plantilla después)
-- ────────────────────────────────────────────────────────────

create table if not exists service_checklists (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid not null references services(id) on delete cascade,
  team_id      uuid not null references teams(id) on delete cascade,
  template_id  uuid references checklist_templates(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique(service_id, team_id)
);
create index if not exists idx_service_checklists_service on service_checklists(service_id);

create table if not exists service_checklist_items (
  id                    uuid primary key default gen_random_uuid(),
  service_checklist_id  uuid not null references service_checklists(id) on delete cascade,
  texto                 text not null,
  checked               boolean not null default false,
  sort_order            int not null default 0
);
create index if not exists idx_service_checklist_items_checklist on service_checklist_items(service_checklist_id);

-- ── Verificación PASO 3 ──
select count(*) from service_checklists;
select count(*) from service_checklist_items;


-- ────────────────────────────────────────────────────────────
-- PASO 4 — RLS (mismo patrón que el resto de Equipos: solo admin de
-- organización, sin lectura pública — esto no lo necesita)
-- ────────────────────────────────────────────────────────────

alter table checklist_templates enable row level security;
alter table checklist_template_items enable row level security;
alter table service_checklists enable row level security;
alter table service_checklist_items enable row level security;

create policy "org admins all checklist_templates" on checklist_templates
  for all
  using (is_org_admin(auth.jwt()->>'email', organization_id))
  with check (is_org_admin(auth.jwt()->>'email', organization_id));

-- checklist_template_items no tiene organization_id propio — se resuelve
-- vía su plantilla.
create policy "org admins all checklist_template_items" on checklist_template_items
  for all
  using (exists (
    select 1 from checklist_templates t
    where t.id = checklist_template_items.template_id
      and is_org_admin(auth.jwt()->>'email', t.organization_id)
  ))
  with check (exists (
    select 1 from checklist_templates t
    where t.id = checklist_template_items.template_id
      and is_org_admin(auth.jwt()->>'email', t.organization_id)
  ));

-- service_checklists tampoco tiene organization_id propio — se resuelve
-- vía el equipo.
create policy "org admins all service_checklists" on service_checklists
  for all
  using (exists (
    select 1 from teams t
    where t.id = service_checklists.team_id
      and is_org_admin(auth.jwt()->>'email', t.organization_id)
  ))
  with check (exists (
    select 1 from teams t
    where t.id = service_checklists.team_id
      and is_org_admin(auth.jwt()->>'email', t.organization_id)
  ));

create policy "org admins all service_checklist_items" on service_checklist_items
  for all
  using (exists (
    select 1 from service_checklists sc
    join teams t on t.id = sc.team_id
    where sc.id = service_checklist_items.service_checklist_id
      and is_org_admin(auth.jwt()->>'email', t.organization_id)
  ))
  with check (exists (
    select 1 from service_checklists sc
    join teams t on t.id = sc.team_id
    where sc.id = service_checklist_items.service_checklist_id
      and is_org_admin(auth.jwt()->>'email', t.organization_id)
  ));

-- ── Verificación PASO 4 ──
-- Debe listar 1 policy por tabla, las 4 tablas.
select tablename, policyname from pg_policies
where tablename in ('checklist_templates','checklist_template_items','service_checklists','service_checklist_items')
order by tablename;


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────
-- Nada existente cambia de comportamiento — teams.tool_type queda null
-- en todos los equipos hasta que se configure a mano desde la interfaz.

select 'teams con tool_type' as tabla, count(*) from teams where tool_type is not null
union all
select 'checklist_templates', count(*) from checklist_templates
union all
select 'service_checklists', count(*) from service_checklists;
