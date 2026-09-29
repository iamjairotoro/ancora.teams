// punto 25 — lógica de aplicar plantillas, compartida entre las
// herramientas interactivas (ChecklistTool.tsx, ScheduleTool.tsx, el
// Orden del servicio en AdminServiceView.tsx) y las predeterminadas que
// se aplican solas al crear un servicio (app/admin/page.tsx). Una sola
// fuente de verdad — nada de esto se reimplementa en dos lugares.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ToolTemplate, ToolTemplateChecklistItem, ToolTemplateScheduleItem, ToolTemplateOrderItem } from './types'

export type ApplyMode = 'reemplazar' | 'agregar'

// "10:00", "9:30", "10:00:00" → minutos desde medianoche. Cualquier otra
// cosa (texto libre, vacío) → null.
export function parseHHMM(raw?: string | null): number | null {
  if (!raw) return null
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  const h = parseInt(m[1], 10), min = parseInt(m[2], 10)
  if (h > 23 || min > 59) return null
  return h * 60 + min
}
export function formatMinutes(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440
  const h = Math.floor(wrapped / 60), m = wrapped % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

// select-then-insert/update en vez de .upsert(): el índice único de
// service_applied_templates es parcial (team_tool_id is not null / is
// null según la herramienta) y el onConflict de supabase-js no soporta
// un predicado — no matchea un índice parcial.
export async function upsertAppliedTemplate(supabase: SupabaseClient, params: {
  serviceId: string; tool: 'schedule'|'checklist'|'order'; teamToolId: string|null; templateId: string|null
}) {
  const { serviceId, tool, teamToolId, templateId } = params
  let q = supabase.from('service_applied_templates').select('id').eq('service_id', serviceId).eq('tool', tool)
  q = teamToolId ? q.eq('team_tool_id', teamToolId) : q.is('team_tool_id', null)
  const { data: existing } = await q.maybeSingle()
  if (existing) {
    await supabase.from('service_applied_templates').update({ template_id: templateId, applied_at: new Date().toISOString() }).eq('id', existing.id)
  } else {
    await supabase.from('service_applied_templates').insert({ service_id: serviceId, tool, team_tool_id: teamToolId, template_id: templateId })
  }
}

export async function applyChecklistTemplate(supabase: SupabaseClient, params: {
  serviceId: string; teamId: string; teamToolId: string; template: ToolTemplate; mode: ApplyMode
}) {
  const { serviceId, teamId, teamToolId, template, mode } = params
  let { data: checklist } = await supabase.from('service_checklists').select('*')
    .eq('service_id', serviceId).eq('team_tool_id', teamToolId).maybeSingle()
  if (!checklist) {
    const { data: created } = await supabase.from('service_checklists')
      .insert({ service_id: serviceId, team_id: teamId, team_tool_id: teamToolId }).select().single()
    checklist = created
  }
  if (!checklist) throw new Error('No se pudo crear el checklist del servicio')
  const tItems = (template.content as ToolTemplateChecklistItem[]) || []
  if (mode === 'reemplazar') {
    await supabase.from('service_checklist_items').delete().eq('service_checklist_id', checklist.id)
    if (tItems.length) await supabase.from('service_checklist_items').insert(
      tItems.map((ti,i)=>({ service_checklist_id: checklist.id, texto: ti.texto, sort_order: i, checked: false }))
    )
  } else {
    const { data: existingItems } = await supabase.from('service_checklist_items').select('sort_order').eq('service_checklist_id', checklist.id)
    const nextOrder = existingItems?.length ? Math.max(...existingItems.map((i:any)=>i.sort_order)) + 1 : 0
    if (tItems.length) await supabase.from('service_checklist_items').insert(
      tItems.map((ti,i)=>({ service_checklist_id: checklist.id, texto: ti.texto, sort_order: nextOrder+i, checked: false }))
    )
  }
  await upsertAppliedTemplate(supabase, { serviceId, tool: 'checklist', teamToolId, templateId: template.id })
}

// sinInicio = true si el servicio no tiene hora de inicio parseable y
// alguna fila de la plantilla necesitaba calcular su hora desde un
// offset — esas filas quedan sin hora (no se inventa una).
export async function applyScheduleTemplate(supabase: SupabaseClient, params: {
  serviceId: string; teamId: string; teamToolId: string; horaInicio?: string|null; template: ToolTemplate; mode: ApplyMode
}): Promise<{ sinInicio: boolean }> {
  const { serviceId, teamId, teamToolId, horaInicio, template, mode } = params
  const inicio = parseHHMM(horaInicio)
  let sinInicio = false
  const tItems = (template.content as ToolTemplateScheduleItem[]) || []
  const rows = tItems.map(ti => {
    let hora: string | null
    if (ti.offset_min !== undefined) {
      if (inicio !== null) hora = formatMinutes(inicio + ti.offset_min)
      else { hora = null; sinInicio = true }
    } else hora = ti.hora_literal || null
    return { texto: ti.texto, hora }
  })
  if (mode === 'reemplazar') {
    await supabase.from('service_schedule_items').delete().eq('service_id', serviceId).eq('team_tool_id', teamToolId)
    if (rows.length) await supabase.from('service_schedule_items').insert(
      rows.map((r,i)=>({ service_id: serviceId, team_id: teamId, team_tool_id: teamToolId, hora: r.hora, texto: r.texto, sort_order: i }))
    )
  } else {
    const { data: existingItems } = await supabase.from('service_schedule_items').select('sort_order').eq('service_id', serviceId).eq('team_tool_id', teamToolId)
    const base = existingItems?.length ? Math.max(...existingItems.map((i:any)=>i.sort_order)) + 1 : 0
    if (rows.length) await supabase.from('service_schedule_items').insert(
      rows.map((r,i)=>({ service_id: serviceId, team_id: teamId, team_tool_id: teamToolId, hora: r.hora, texto: r.texto, sort_order: base+i }))
    )
  }
  await upsertAppliedTemplate(supabase, { serviceId, tool: 'schedule', teamToolId, templateId: template.id })
  return { sinInicio }
}

// El marcador de canciones se materializa como una fila REAL (tipo
// 'bloque', titulo 'Canciones') — nunca queda solo en la plantilla.
export function orderContentToRows(content: ToolTemplateOrderItem[]) {
  return content.map(ci => ci.tipo === 'cancion_marker'
    ? { tipo: 'bloque' as const, titulo: 'Canciones', duracion_min: 300 }
    : { tipo: 'bloque' as const, titulo: ci.titulo, duracion_min: ci.duracion_min ?? 300 }
  )
}

export async function applyOrderTemplate(supabase: SupabaseClient, params: {
  serviceId: string; template: ToolTemplate; mode: ApplyMode
}) {
  const { serviceId, template, mode } = params
  const rows = orderContentToRows((template.content as ToolTemplateOrderItem[]) || [])
  if (mode === 'reemplazar') {
    await supabase.from('service_blocks').delete().eq('service_id', serviceId)
    if (rows.length) await supabase.from('service_blocks').insert(
      rows.map((r,i)=>({ ...r, service_id: serviceId, orden: i+1 }))
    )
  } else {
    const { data: existingBlocks } = await supabase.from('service_blocks').select('orden').eq('service_id', serviceId)
    const base = existingBlocks?.length ? Math.max(...existingBlocks.map((b:any)=>b.orden)) : 0
    if (rows.length) await supabase.from('service_blocks').insert(
      rows.map((r,i)=>({ ...r, service_id: serviceId, orden: base+i+1 }))
    )
  }
  await upsertAppliedTemplate(supabase, { serviceId, tool: 'order', teamToolId: null, templateId: template.id })
}
