-- ============================================================
-- Fase 15 — varios cupos por posición, por servicio (estilo Planning
-- Center: "Acoustic Guitar — 1 Needed −/+")
--
-- Hasta ahora banda_assignments tenía unique(service_id, posicion): como
-- mucho una persona por posición por servicio. Se agrega slot_index para
-- permitir varias, y una tabla nueva para guardar cuántos cupos pide
-- cada posición en cada servicio puntual (por defecto 1, ajustable con
-- el −/+ que aparece al pasar el mouse).
--
-- Los 4 triggers que ya dependen de banda_assignments.posicion (ver fase
-- 7 de este mismo proyecto) siguen funcionando igual: siguen comparando
-- el texto de posicion vía array_agg, sin importarles slot_index — no
-- hace falta tocarlos.
--
-- Corré esto en "Ancora - TEST" primero, paso a paso, y después en la
-- base real.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1 — slot_index en banda_assignments
-- ────────────────────────────────────────────────────────────

alter table banda_assignments add column if not exists slot_index int not null default 1;

-- ── Verificación PASO 1 ──
select column_name, column_default from information_schema.columns
where table_name = 'banda_assignments' and column_name = 'slot_index';


-- ────────────────────────────────────────────────────────────
-- PASO 2 — la unicidad pasa a ser por (servicio, posición, cupo)
-- ────────────────────────────────────────────────────────────

alter table banda_assignments drop constraint if exists banda_assignments_service_id_posicion_key;
alter table banda_assignments add constraint banda_assignments_service_id_posicion_slot_key unique (service_id, posicion, slot_index);

-- ── Verificación PASO 2 ──
select conname from pg_constraint where conrelid = 'banda_assignments'::regclass;


-- ────────────────────────────────────────────────────────────
-- PASO 3 — cuántos cupos pide cada posición, por servicio puntual
-- ────────────────────────────────────────────────────────────

create table if not exists service_position_slots (
  id                uuid primary key default gen_random_uuid(),
  service_id        uuid not null references services(id) on delete cascade,
  team_position_id  uuid not null references team_positions(id) on delete cascade,
  slots_needed      int not null default 1 check (slots_needed >= 1),
  unique(service_id, team_position_id)
);
create index if not exists idx_service_position_slots_service on service_position_slots(service_id);

-- ── Verificación PASO 3 ──
select count(*) from service_position_slots;


-- ────────────────────────────────────────────────────────────
-- PASO 4 — RLS (mismo patrón de siempre)
-- ────────────────────────────────────────────────────────────

alter table service_position_slots enable row level security;

create policy "org admins all service_position_slots" on service_position_slots
  for all
  using (exists (
    select 1 from team_positions tp join teams t on t.id = tp.team_id
    where tp.id = service_position_slots.team_position_id and is_org_admin(auth.jwt()->>'email', t.organization_id)
  ))
  with check (exists (
    select 1 from team_positions tp join teams t on t.id = tp.team_id
    where tp.id = service_position_slots.team_position_id and is_org_admin(auth.jwt()->>'email', t.organization_id)
  ));

-- ── Verificación PASO 4 ──
select tablename, policyname from pg_policies where tablename = 'service_position_slots';


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────
-- Nada existente cambia — todas las asignaciones actuales quedan con
-- slot_index = 1, que es exactamente lo mismo que tenían implícito hoy.
select 'banda_assignments' as tabla, count(*) from banda_assignments
union all
select 'banda_assignments slot_index=1', count(*) from banda_assignments where slot_index = 1
union all
select 'service_position_slots', count(*) from service_position_slots;
