-- ============================================================
-- Fase 26 — Checklist migra a tool_templates (punto 25, parte 2 de 2)
-- Depende de que 025-tool-templates.sql ya haya corrido.
--
-- checklist_templates/checklist_template_items ya eran, en los hechos,
-- un sistema de plantillas — solo que para una única herramienta. Esta
-- fase los copia a tool_templates CONSERVANDO EL MISMO id: así
-- service_checklists.template_id (que sigue apuntando a
-- checklist_templates, columna intacta, no se toca ni se repunta) queda
-- automáticamente coincidiendo también con tool_templates.id, sin
-- ninguna tabla puente ni migración de foreign keys.
--
-- checklist_templates y checklist_template_items NO se borran ni se
-- tocan — quedan en la base como respaldo, igual que team_admins o
-- admin_emails en fases anteriores. Desde que este archivo corre, la
-- app (ChecklistTool.tsx) deja de leerlas — todo pasa por tool_templates
-- y service_applied_templates.
--
-- Corré esto en "Ancora - TEST" primero, PASO a PASO, y recién cuando lo
-- confirmes ahí se corre igual en "Ancora - Teams" (prod).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 0 — REPORTE, solo lectura. Anotá estos 3 números antes de seguir
-- — la verificación final tiene que coincidir con ellos.
-- ────────────────────────────────────────────────────────────

select
  (select count(*) from checklist_templates) as checklist_templates_total,
  (select count(*) from checklist_templates where archived_at is not null) as checklist_templates_archivadas,
  (select count(*) from checklist_template_items) as checklist_template_items_total,
  (select count(*) from service_checklists where template_id is not null and team_tool_id is not null) as service_checklists_con_plantilla;


-- ────────────────────────────────────────────────────────────
-- PASO 1 — copiar checklist_templates → tool_templates, mismo id
-- ────────────────────────────────────────────────────────────
-- content = jsonb_agg de los items de esa plantilla, en su sort_order.
-- Una plantilla sin items todavía (existe pero vacía) queda con '[]'.

insert into tool_templates (id, organization_id, team_id, tool, name, content, archived_at, created_at)
select
  ct.id, ct.organization_id, ct.team_id, 'checklist', ct.name,
  coalesce((
    select jsonb_agg(jsonb_build_object('texto', cti.texto) order by cti.sort_order)
    from checklist_template_items cti
    where cti.template_id = ct.id
  ), '[]'::jsonb),
  ct.archived_at, ct.created_at
from checklist_templates ct
on conflict (id) do nothing;

-- ── Verificación PASO 1 ──
-- Debe coincidir con checklist_templates_total del PASO 0.
select count(*) from tool_templates where tool = 'checklist';


-- ────────────────────────────────────────────────────────────
-- PASO 2 — service_applied_templates desde service_checklists
-- ────────────────────────────────────────────────────────────
-- template_id ya vale como tool_templates.id (mismo id, PASO 1) — no
-- hace falta traducir nada.

insert into service_applied_templates (service_id, tool, team_tool_id, template_id, applied_at)
select sc.service_id, 'checklist', sc.team_tool_id, sc.template_id, sc.created_at
from service_checklists sc
where sc.template_id is not null and sc.team_tool_id is not null
on conflict (service_id, tool, team_tool_id) where team_tool_id is not null do nothing;

-- ── Verificación PASO 2 ──
-- Debe coincidir con service_checklists_con_plantilla del PASO 0.
select count(*) from service_applied_templates where tool = 'checklist';


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL — los 3 pares de conteos deben coincidir
-- ────────────────────────────────────────────────────────────

select
  (select count(*) from checklist_templates) as checklist_templates,
  (select count(*) from tool_templates where tool = 'checklist') as tool_templates_checklist;

select
  (select count(*) from checklist_template_items) as checklist_template_items,
  (select coalesce(sum(jsonb_array_length(content)),0) from tool_templates where tool = 'checklist') as tool_templates_checklist_items_total;

select
  (select count(*) from service_checklists where template_id is not null and team_tool_id is not null) as service_checklists_con_plantilla,
  (select count(*) from service_applied_templates where tool = 'checklist') as service_applied_templates_checklist;

-- Si algún par no coincide: PARAR, no seguir con el resto del punto 25
-- (Cronograma/Orden/predeterminadas) hasta entender por qué.
