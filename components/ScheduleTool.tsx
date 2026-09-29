'use client'
/* ════════════════════════════════════════════════════════════════════════
   ScheduleTool — punto 25 de docs/PENDIENTES-code.md.

   Las horas se guardan RELATIVAS al inicio del servicio (offset_min) en
   la plantilla, para que sirva igual a un domingo a las 10:00 que a uno
   a las 11:00. `hora` en service_schedule_items sigue siendo texto libre
   sin validar (ScheduleTool no lo cambia) — por eso una fila cuya hora no
   se puede leer como HH:MM se guarda en la plantilla como hora_literal
   (su texto tal cual) y se aplica sin tocar, en vez de forzarla al
   inicio del servicio o inventarle un offset que no le corresponde.
   ════════════════════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback } from 'react'
import { Plus, X, GripVertical, MoreHorizontal, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Service, ServiceScheduleItem, ToolTemplate, ToolTemplateScheduleItem, ServiceAppliedTemplate } from '@/lib/types'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'

interface Props {
  teamId: string
  teamToolId: string
  service: Service
  onRemoveTool: () => void
  canManageTemplates: boolean
  viewerMemberId?: string
}

const C = { crema:'var(--crema)', cremaDark:'var(--crema-dark)', txt:'var(--ancora-txt)', muted:'var(--ancora-muted)' }
const ACCENT = '#1A1A1A'
const KIND_LABEL: Record<string,string> = { service:'Servicio', rehearsal:'Ensayo', other:'Otro' }

// "10:00", "9:30", "10:00:00" → minutos desde medianoche. Cualquier otra
// cosa (texto libre, vacío) → null, y esa fila queda como hora_literal.
function parseHHMM(raw?: string | null): number | null {
  if (!raw) return null
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  const h = parseInt(m[1], 10), min = parseInt(m[2], 10)
  if (h > 23 || min > 59) return null
  return h * 60 + min
}
function formatMinutes(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440
  const h = Math.floor(wrapped / 60), m = wrapped % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

export default function ScheduleTool({ teamId, teamToolId, service, onRemoveTool, canManageTemplates, viewerMemberId }: Props) {
  const [items, setItems] = useState<ServiceScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newHora, setNewHora] = useState('')
  const [newTexto, setNewTexto] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const [templates, setTemplates] = useState<ToolTemplate[]>([])
  const [applied, setApplied] = useState<ServiceAppliedTemplate | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showApply, setShowApply] = useState(false)
  const [pendingApply, setPendingApply] = useState<ToolTemplate | null>(null)
  const [showSaveAs, setShowSaveAs] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')
  const [templateMenuId, setTemplateMenuId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('service_schedule_items').select('*')
      .eq('service_id', service.id).eq('team_tool_id', teamToolId).order('sort_order')
    setItems(data || [])
    setLoading(false)
  }, [service.id, teamToolId])

  const loadTemplates = useCallback(async () => {
    const { data } = await supabase.from('tool_templates').select('*')
      .eq('tool', 'schedule').eq('team_id', teamId).is('archived_at', null).order('name')
    setTemplates(data || [])
  }, [teamId])

  const loadApplied = useCallback(async () => {
    const { data } = await supabase.from('service_applied_templates').select('*')
      .eq('service_id', service.id).eq('tool', 'schedule').eq('team_tool_id', teamToolId).maybeSingle()
    setApplied(data || null)
  }, [service.id, teamToolId])

  useEffect(() => { setLoading(true); load(); loadTemplates(); loadApplied() }, [load, loadTemplates, loadApplied])

  const appliedTemplateName = applied?.template_id ? templates.find(t => t.id === applied.template_id)?.name : undefined

  async function addItem() {
    if (!newTexto.trim()) return
    const nextOrder = items.length ? Math.max(...items.map(i => i.sort_order)) + 1 : 0
    const { data } = await supabase.from('service_schedule_items').insert({
      service_id: service.id, team_id: teamId, team_tool_id: teamToolId, hora: newHora.trim() || null, texto: newTexto.trim(), sort_order: nextOrder,
    }).select().single()
    if (data) setItems(prev => [...prev, data])
    setNewHora(''); setNewTexto('')
  }

  async function updateItem(id: string, updates: Partial<ServiceScheduleItem>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    await supabase.from('service_schedule_items').update(updates).eq('id', id)
  }

  async function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('service_schedule_items').delete().eq('id', id)
  }

  async function reorder(draggedItemId: string, targetId: string) {
    if (draggedItemId === targetId) return
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order)
    const fromIdx = sorted.findIndex(i => i.id === draggedItemId)
    const toIdx = sorted.findIndex(i => i.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const reordered = [...sorted]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    setItems(reordered.map((it, i) => ({ ...it, sort_order: i })))
    await Promise.all(reordered.map((it, i) => supabase.from('service_schedule_items').update({ sort_order: i }).eq('id', it.id)))
  }

  // select-then-insert/update en vez de .upsert(): el índice único de
  // service_applied_templates es parcial y el onConflict de supabase-js
  // no soporta un predicado — no matchea un índice parcial.
  async function upsertApplied(templateId: string | null) {
    const { data: existing } = await supabase.from('service_applied_templates').select('id')
      .eq('service_id', service.id).eq('tool', 'schedule').eq('team_tool_id', teamToolId).maybeSingle()
    if (existing) {
      await supabase.from('service_applied_templates').update({ template_id: templateId, applied_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('service_applied_templates').insert({ service_id: service.id, tool: 'schedule', team_tool_id: teamToolId, template_id: templateId })
    }
    await loadApplied()
  }

  // items de hoy → contenido de plantilla, con offset relativo al inicio
  // del servicio. Filas que no se pueden leer como HH:MM (o si el
  // servicio no tiene hora de inicio) quedan con hora_literal.
  function buildTemplateContent(): { content: ToolTemplateScheduleItem[]; sinHora: number } {
    const inicio = parseHHMM(service.hora_inicio)
    let sinHora = 0
    const content: ToolTemplateScheduleItem[] = items.map(i => {
      const mins = parseHHMM(i.hora)
      if (mins !== null && inicio !== null) return { texto: i.texto, offset_min: mins - inicio }
      sinHora++
      return { texto: i.texto, hora_literal: i.hora || '' }
    })
    return { content, sinHora }
  }

  async function saveAsTemplate() {
    const name = saveAsName.trim()
    if (!name) return
    const { content, sinHora } = buildTemplateContent()
    const { data, error } = await supabase.from('tool_templates').insert({
      organization_id: DEFAULT_ORGANIZATION_ID, team_id: teamId, tool: 'schedule', name, content,
      created_by: viewerMemberId || null,
    }).select().single()
    if (error || !data) { setMsg(error?.message || 'Error al guardar'); return }
    await upsertApplied(data.id)
    await loadTemplates()
    setSaveAsName(''); setShowSaveAs(false)
    setMsg(`✓ Guardada como "${name}"${sinHora > 0 ? ` — ${sinHora} fila${sinHora>1?'s':''} con hora no reconocida se guardaron tal cual` : ''}`)
  }

  async function updateAppliedTemplate() {
    if (!applied?.template_id) return
    const { content, sinHora } = buildTemplateContent()
    await supabase.from('tool_templates').update({ content }).eq('id', applied.template_id)
    await loadTemplates()
    setMsg(`✓ Plantilla actualizada${sinHora > 0 ? ` — ${sinHora} fila${sinHora>1?'s':''} con hora no reconocida se guardaron tal cual` : ''}`)
  }

  async function applyTemplate(template: ToolTemplate, mode: 'reemplazar' | 'agregar') {
    const inicio = parseHHMM(service.hora_inicio)
    let sinInicio = false
    const tItems = (template.content as ToolTemplateScheduleItem[]) || []
    const rows = tItems.map(ti => {
      let hora: string | null
      if (ti.offset_min !== undefined) {
        if (inicio !== null) hora = formatMinutes(inicio + ti.offset_min)
        else { hora = null; sinInicio = true }
      } else {
        hora = ti.hora_literal || null
      }
      return { texto: ti.texto, hora }
    })
    if (mode === 'reemplazar') {
      await supabase.from('service_schedule_items').delete().eq('service_id', service.id).eq('team_tool_id', teamToolId)
      if (rows.length) {
        await supabase.from('service_schedule_items').insert(
          rows.map((r, i) => ({ service_id: service.id, team_id: teamId, team_tool_id: teamToolId, hora: r.hora, texto: r.texto, sort_order: i }))
        )
      }
    } else {
      const nextOrder = items.length ? Math.max(...items.map(i => i.sort_order)) + 1 : 0
      if (rows.length) {
        await supabase.from('service_schedule_items').insert(
          rows.map((r, i) => ({ service_id: service.id, team_id: teamId, team_tool_id: teamToolId, hora: r.hora, texto: r.texto, sort_order: nextOrder + i }))
        )
      }
    }
    await upsertApplied(template.id)
    await load()
    setPendingApply(null); setShowApply(false)
    setMsg(sinInicio ? 'El servicio no tiene hora de inicio — esas filas se aplicaron sin hora.' : '')
  }

  function onPickTemplate(template: ToolTemplate) {
    if (items.length > 0) setPendingApply(template)
    else applyTemplate(template, 'reemplazar')
  }

  async function vaciar() {
    if (!confirm('¿Vaciar este cronograma? Se borran todas las filas de hoy — la plantilla aplicada no se toca.')) return
    await supabase.from('service_schedule_items').delete().eq('service_id', service.id).eq('team_tool_id', teamToolId)
    await load()
    setShowMenu(false)
  }

  async function renameTemplate(id: string) {
    const name = renameValue.trim()
    if (!name) return
    await supabase.from('tool_templates').update({ name }).eq('id', id)
    setRenamingId(null); setRenameValue('')
    await loadTemplates()
  }

  // al archivar, la predeterminada se limpia en el mismo update — una
  // plantilla archivada no puede seguir siendo la que se aplica sola al
  // crear un servicio.
  async function archiveTemplate(id: string) {
    if (!confirm('¿Archivar esta plantilla? No se borra, deja de aparecer para elegir en nuevos servicios.')) return
    await supabase.from('tool_templates').update({ archived_at: new Date().toISOString(), default_for_kind: null }).eq('id', id)
    setTemplateMenuId(null)
    await loadTemplates()
  }

  async function setDefaultForKind(id: string, kind: string) {
    const { error } = await supabase.from('tool_templates').update({ default_for_kind: kind || null }).eq('id', id)
    if (error) { setMsg('Ya hay una plantilla predeterminada para ese tipo — cambiala primero.'); return }
    await loadTemplates()
  }

  const input: React.CSSProperties = { border:`1px solid var(--card-border)`, borderRadius:8, padding:'7px 11px', fontSize:13, fontFamily:'inherit', outline:'none', background:'var(--card-bg)', color:C.txt }
  const btnDark: React.CSSProperties = { background:ACCENT, color:'#F5F0E6', border:'none', borderRadius:8, padding:'8px 14px', fontSize:12, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }

  if (loading) return <div style={{padding:24, textAlign:'center', color:C.muted, fontSize:13}}>Cargando...</div>

  return (
    <div style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, overflow:'hidden'}}>
      <div style={{padding:'10px 16px', borderBottom:'1px solid var(--card-border)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span style={{fontSize:'.875rem', fontWeight:700, color:C.txt}}>Cronograma</span>
        <div style={{position:'relative'}}>
          <button onClick={() => setShowMenu(v => !v)} aria-label="Acciones de Cronograma" className="anc-rowMore" style={{opacity:1}}>
            <MoreHorizontal size={14}/>
          </button>
          {showMenu && (
            <>
              <div onClick={() => setShowMenu(false)} style={{position:'fixed', inset:0, zIndex:29}}/>
              <div className="anc-rowMenu">
                {canManageTemplates && (
                  <>
                    <button onClick={() => { setShowApply(true); setShowMenu(false) }}>Aplicar plantilla…</button>
                    <button onClick={() => { setShowSaveAs(true); setShowMenu(false) }} disabled={items.length===0}>Guardar como plantilla</button>
                    <button onClick={() => { updateAppliedTemplate(); setShowMenu(false) }} disabled={!applied?.template_id}
                      title={!applied?.template_id ? 'No hay ninguna plantilla aplicada' : undefined}>
                      Actualizar {appliedTemplateName ? `«${appliedTemplateName}»` : ''}
                    </button>
                    <div style={{borderTop:`1px solid ${C.cremaDark}`, margin:'4px 0'}}/>
                    <button className="anc-rowMenuDanger" onClick={vaciar} disabled={items.length===0}>Vaciar</button>
                    <div style={{borderTop:`1px solid ${C.cremaDark}`, margin:'4px 0'}}/>
                  </>
                )}
                <button className="anc-rowMenuDanger" onClick={() => { onRemoveTool(); setShowMenu(false) }}>
                  <Trash2 size={13}/> Quitar esta herramienta
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {msg && <p style={{fontSize:11, color:C.muted, padding:'6px 16px 0'}}>{msg}</p>}

      {showApply && (
        <div style={{padding:'12px 16px', borderBottom:'1px solid var(--card-border)', background:C.crema}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
            <p style={{fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.5, margin:0}}>Elegir plantilla</p>
            <button onClick={() => setShowApply(false)} style={{background:'none', border:'none', cursor:'pointer', color:C.muted}}><X size={14}/></button>
          </div>
          {templates.length === 0 && <p style={{fontSize:12, color:C.muted}}>Sin plantillas todavía — guardá una desde "Guardar como plantilla".</p>}
          {templates.map(t => (
            <div key={t.id} style={{display:'flex', alignItems:'center', gap:6, padding:'6px 0'}}>
              {renamingId === t.id ? (
                <>
                  <input autoFocus style={{...input, flex:1, fontSize:12, padding:'5px 8px'}} value={renameValue}
                    onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && renameTemplate(t.id)} />
                  <button onClick={() => renameTemplate(t.id)} style={{...btnDark, padding:'5px 10px', fontSize:11}}>Guardar</button>
                  <button onClick={() => setRenamingId(null)} style={{background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:11}}>Cancelar</button>
                </>
              ) : (
                <>
                  <button onClick={() => onPickTemplate(t)} style={{...input, flex:1, textAlign:'left', cursor:'pointer', background:'var(--card-bg)'}}>
                    {t.name}{t.default_for_kind ? <span style={{color:C.muted, fontSize:11}}> · predeterminada de {KIND_LABEL[t.default_for_kind]}</span> : ''}
                  </button>
                  <div style={{position:'relative'}}>
                    <button onClick={() => setTemplateMenuId(cur => cur === t.id ? null : t.id)} className="anc-rowMore" style={{opacity:1}} aria-label={`Más acciones de ${t.name}`}>
                      <MoreHorizontal size={13}/>
                    </button>
                    {templateMenuId === t.id && (
                      <>
                        <div onClick={() => setTemplateMenuId(null)} style={{position:'fixed', inset:0, zIndex:29}}/>
                        <div className="anc-rowMenu" style={{minWidth:200}}>
                          <button onClick={() => { setRenamingId(t.id); setRenameValue(t.name); setTemplateMenuId(null) }}>Renombrar</button>
                          <div style={{padding:'6px 10px'}}>
                            <label style={{fontSize:10, color:C.muted, display:'block', marginBottom:3}}>Predeterminada para</label>
                            <select value={t.default_for_kind || ''} onChange={e => setDefaultForKind(t.id, e.target.value)}
                              style={{width:'100%', fontSize:12, padding:'4px 6px', borderRadius:6, border:`1px solid ${C.cremaDark}`, background:'var(--card-bg)', color:C.txt, fontFamily:'inherit'}}>
                              <option value="">Ninguna</option>
                              <option value="service">Servicio</option>
                              <option value="rehearsal">Ensayo</option>
                              <option value="other">Otro</option>
                            </select>
                          </div>
                          <button className="anc-rowMenuDanger" onClick={() => archiveTemplate(t.id)}>Archivar</button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          {pendingApply && (
            <div style={{marginTop:10, padding:10, background:'var(--card-bg)', borderRadius:8, border:`1px solid ${C.cremaDark}`}}>
              <p style={{fontSize:12, color:C.txt, marginBottom:8}}>Ya hay filas hoy — ¿qué hacemos con "{pendingApply.name}"?</p>
              <div style={{display:'flex', gap:6}}>
                <button onClick={() => applyTemplate(pendingApply, 'reemplazar')} style={{...btnDark, flex:1}}>Reemplazar</button>
                <button onClick={() => applyTemplate(pendingApply, 'agregar')} style={{...input, flex:1, cursor:'pointer'}}>Agregar al final</button>
                <button onClick={() => setPendingApply(null)} style={{background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:12}}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showSaveAs && (
        <div style={{padding:'12px 16px', borderBottom:'1px solid var(--card-border)', background:C.crema}}>
          <p style={{fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:8}}>Guardar como plantilla</p>
          <div style={{display:'flex', gap:6}}>
            <input autoFocus style={{...input, flex:1}} placeholder="Nombre (ej. Domingo regular)" value={saveAsName}
              onChange={e => setSaveAsName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveAsTemplate()} />
            <button onClick={saveAsTemplate} disabled={!saveAsName.trim()} style={{...btnDark, opacity:saveAsName.trim()?1:0.5}}>Guardar</button>
            <button onClick={() => setShowSaveAs(false)} style={{background:'none', border:'none', cursor:'pointer', color:C.muted}}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{padding:'8px 0'}}>
        {items.length === 0 && <p style={{fontSize:12, color:C.muted, padding:'8px 16px'}}>Sin ítems todavía.</p>}
        {items.map(item => (
          <div key={item.id}
            draggable
            onDragStart={() => setDraggedId(item.id)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => { if (draggedId) reorder(draggedId, item.id); setDraggedId(null) }}
            onDragEnd={() => setDraggedId(null)}
            style={{display:'flex', alignItems:'center', gap:8, padding:'7px 16px', borderBottom:'0.5px solid #E8E0D0', opacity:draggedId===item.id?0.4:1}}>
            <span style={{cursor:'grab', color:C.muted, display:'flex', flexShrink:0}}><GripVertical size={14}/></span>
            <input defaultValue={item.hora || ''} placeholder="Hora" onBlur={e => updateItem(item.id, { hora: e.target.value || undefined })}
              className="anc-input" style={{width:70, flexShrink:0, padding:'6px 8px', fontSize:12, fontWeight:600, textAlign:'center'}} />
            <input defaultValue={item.texto} onBlur={e => updateItem(item.id, { texto: e.target.value })}
              className="anc-input" style={{flex:1, padding:'6px 8px'}} />
            <button onClick={() => removeItem(item.id)} style={{background:'none', border:'none', cursor:'pointer', color:'#B91C1C', flexShrink:0}}><X size={14}/></button>
          </div>
        ))}
        <div style={{display:'flex', gap:8, padding:'10px 16px'}}>
          <input value={newHora} onChange={e => setNewHora(e.target.value)} placeholder="Hora"
            className="anc-input" style={{width:70, flexShrink:0, textAlign:'center'}} />
          <input value={newTexto} onChange={e => setNewTexto(e.target.value)} placeholder="Nuevo ítem del cronograma"
            onKeyDown={e => e.key === 'Enter' && addItem()} className="anc-input" style={{flex:1}} />
          <button onClick={addItem} disabled={!newTexto.trim()} className="anc-btn anc-btn--accent" style={{opacity:newTexto.trim()?1:0.5, flexShrink:0}}><Plus size={13}/></button>
        </div>
      </div>
    </div>
  )
}
