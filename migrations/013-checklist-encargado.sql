-- ============================================================
-- Fase 13 — encargado por tarea del checklist
--
-- Cada ítem de un checklist puede tener una persona encargada, elegida
-- entre quienes ya están asignados a ese equipo ese domingo (no un
-- selector general de personas) — para repartir mejor las tareas.
-- 100% aditivo.
--
-- Corré esto en "Ancora - TEST" primero, y después en la base real.
-- ============================================================

alter table service_checklist_items add column if not exists assigned_member_id uuid references members(id) on delete set null;

-- ── Verificación ──
select column_name, is_nullable from information_schema.columns
where table_name = 'service_checklist_items' and column_name = 'assigned_member_id';
