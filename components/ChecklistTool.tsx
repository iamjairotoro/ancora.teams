'use client'
/* ════════════════════════════════════════════════════════════════════════
   ChecklistTool — punto 25 de docs/PENDIENTES-code.md.

   Las plantillas ya no viven en checklist_templates/checklist_template_items
   (sistema propio, previo a este punto) — todo pasa por tool_templates
   (tool='checklist') y service_applied_templates. Las tablas viejas quedan
   en la base sin tocar (ver migrations/026-checklist-templates-backfill.sql)
   pero este componente ya no las lee ni las escribe.

   service_checklists.template_id queda intacto para las filas que ya
   existían (apunta a checklist_templates, cuyo id se conservó al copiar a
   tool_templates — por eso el valor sigue siendo válido como referencia,
   aunque la FK original no cambió). Filas NUEVAS ya no escriben ese
   campo: la relación "de qué plantilla vino" se registra en
   service_applied_templates exclusivamente.

   Solo owner/admin administra plantillas (crea, aplica, actualiza,
   archiva) — canManageTemplates lo oculta en la interfaz, no solo RLS.
   ════════════════════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback } from 'react'
import { Plus, X, MoreHorizontal, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Service, Member, ToolTemplate, ToolTemplateChecklistItem, ServiceAppliedTemplate, ServiceChecklist, ServiceChecklistItem } from '@/lib/types'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'
import { applyChecklistTemplate, upsertAppliedTemplate } from '@/lib/toolTemplates'

interface Props {
  teamId: string
  teamToolId: string
  service: Service
  assignedMembers: Member[]
  darkMode?: boolean
  onRemoveTool: () => void
  canManageTemplates: boolean
  viewerMemberId?: string
}

const C = { crema:'var(--crema)', cremaDark:'var(--crema-dark)', txt:'var(--ancora-txt)', muted:'var(--ancora-muted)' }
const ACCENT = '#1A1A1A'

const KIND_LABEL: Record<string,string> = { service:'Servicio', rehearsal:'Ensayo', other:'Otro' }

export default function ChecklistTool({ teamId, teamToolId, service, assignedMembers, onRemoveTool, canManageTemplates, viewerMemberId }: Props) {
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<ToolTemplate[]>([])
  const [applied, setApplied] = useState<ServiceAppliedTemplate | null>(null)
  const [checklist, setChecklist] = useState<ServiceChecklist | null>(null)
  const [items, setItems] = useState<ServiceChecklistItem[]>([])
  const [newItemText, setNewItemText] = useState('')

  const [showMenu, setShowMenu] = useState(false)
  const [showApply, setShowApply] = useState(false)
  const [pendingApply, setPendingApply] = useState<ToolTemplate | null>(null) // preguntar reemplazar/agregar
  const [showSaveAs, setShowSaveAs] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')
  const [templateMenuId, setTemplateMenuId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [msg, setMsg] = useState('')

  const loadTemplates = useCallback(async () => {
    const { data } = await supabase.from('tool_templates').select('*')
      .eq('tool', 'checklist').eq('team_id', teamId).is('archived_at', null).order('name')
    setTemplates(data || [])
  }, [teamId])

  const loadApplied = useCallback(async () => {
    const { data } = await supabase.from('service_applied_templates').select('*')
      .eq('service_id', service.id).eq('tool', 'checklist').eq('team_tool_id', teamToolId).maybeSingle()
    setApplied(data || null)
  }, [service.id, teamToolId])

  const loadChecklist = useCallback(async () => {
    const { data: cl } = await supabase.from('service_checklists').select('*')
      .eq('service_id', service.id).eq('team_tool_id', teamToolId).maybeSingle()
    setChecklist(cl || null)
    if (cl) {
      const { data: its } = await supabase.from('service_checklist_items').select('*')
        .eq('service_checklist_id', cl.id).order('sort_order')
      setItems(its || [])
    } else {
      setItems([])
    }
    setLoading(false)
  }, [service.id, teamToolId])

  useEffect(() => { setLoading(true); loadTemplates(); loadChecklist(); loadApplied() }, [loadTemplates, loadChecklist, loadApplied])

  const appliedTemplateName = applied?.template_id ? templates.find(t => t.id === applied.template_id)?.name : undefined

  // aplicar (con o sin checklist ya existente — applyChecklistTemplate
  // crea la fila si hace falta) y empezar en blanco comparten la misma
  // función de lib/toolTemplates.ts que usan las predeterminadas al
  // crear un servicio (app/admin/page.tsx) — una sola fuente de verdad.
  async function applyTemplate(template: ToolTemplate, mode: 'reemplazar' | 'agregar') {
    await applyChecklistTemplate(supabase, { serviceId: service.id, teamId, teamToolId, template, mode })
    await loadChecklist(); await loadApplied()
    setPendingApply(null); setShowApply(false)
  }
  async function startChecklist(template: ToolTemplate | null) {
    if (template) { await applyTemplate(template, 'reemplazar'); return }
    await supabase.from('service_checklists').insert({ service_id: service.id, team_id: teamId, team_tool_id: teamToolId })
    await loadChecklist()
  }

  function onPickTemplate(template: ToolTemplate) {
    if (items.length > 0) setPendingApply(template)
    else applyTemplate(template, 'reemplazar')
  }

  async function saveAsTemplate() {
    const name = saveAsName.trim()
    if (!name) return
    const content: ToolTemplateChecklistItem[] = items.map(i => ({ texto: i.texto }))
    const { data, error } = await supabase.from('tool_templates').insert({
      organization_id: DEFAULT_ORGANIZATION_ID, team_id: teamId, tool: 'checklist', name, content,
      created_by: viewerMemberId || null,
    }).select().single()
    if (error || !data) { setMsg(error?.message || 'Error al guardar'); return }
    await upsertAppliedTemplate(supabase, { serviceId: service.id, tool: 'checklist', teamToolId, templateId: data.id })
    await loadApplied()
    await loadTemplates()
    setSaveAsName(''); setShowSaveAs(false); setMsg(`✓ Guardada como "${name}"`)
  }

  async function updateAppliedTemplate() {
    if (!applied?.template_id) return
    const content: ToolTemplateChecklistItem[] = items.map(i => ({ texto: i.texto }))
    await supabase.from('tool_templates').update({ content }).eq('id', applied.template_id)
    await loadTemplates()
    setMsg('✓ Plantilla actualizada')
  }

  async function vaciar() {
    if (!checklist) return
    if (!confirm('¿Vaciar este checklist? Se borran todos los ítems de hoy — la plantilla aplicada no se toca.')) return
    await supabase.from('service_checklist_items').delete().eq('service_checklist_id', checklist.id)
    await loadChecklist()
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

  async function toggleItem(item: ServiceChecklistItem) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i))
    await supabase.from('service_checklist_items').update({ checked: !item.checked }).eq('id', item.id)
  }

  async function assignItem(item: ServiceChecklistItem, memberId: string) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, assigned_member_id: memberId || undefined } : i))
    await supabase.from('service_checklist_items').update({ assigned_member_id: memberId || null }).eq('id', item.id)
  }

  async function addItem() {
    if (!checklist || !newItemText.trim()) return
    const nextOrder = items.length ? Math.max(...items.map(i => i.sort_order)) + 1 : 0
    const { data } = await supabase.from('service_checklist_items').insert({
      service_checklist_id: checklist.id, texto: newItemText.trim(), sort_order: nextOrder,
    }).select().single()
    if (data) setItems(prev => [...prev, data])
    setNewItemText('')
  }

  async function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('service_checklist_items').delete().eq('id', id)
  }

  const input: React.CSSProperties = { border:`1px solid var(--card-border)`, borderRadius:8, padding:'7px 11px', fontSize:13, fontFamily:'inherit', outline:'none', background:'var(--card-bg)', color:C.txt }
  const btnDark: React.CSSProperties = { background:ACCENT, color:'#F5F0E6', border:'none', borderRadius:8, padding:'8px 14px', fontSize:12, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }

  if (loading) return <div style={{padding:24, textAlign:'center', color:C.muted, fontSize:13}}>Cargando...</div>

  return (
    <div style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, overflow:'hidden'}}>
      <div style={{padding:'10px 16px', borderBottom:'1px solid var(--card-border)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span style={{fontSize:'.875rem', fontWeight:700, color:C.txt}}>Checklist</span>
        <div style={{position:'relative'}}>
          <button onClick={() => setShowMenu(v => !v)} aria-label="Acciones de Checklist" className="anc-rowMore" style={{opacity:1}}>
            <MoreHorizontal size={14}/>
          </button>
          {showMenu && (
            <>
              <div onClick={() => setShowMenu(false)} style={{position:'fixed', inset:0, zIndex:29}}/>
              <div className="anc-rowMenu">
                {canManageTemplates && (
                  <>
                    <button onClick={() => { setShowApply(true); setShowMenu(false) }}>Aplicar plantilla…</button>
                    <button onClick={() => { setShowSaveAs(true); setShowMenu(false) }} disabled={!checklist || items.length===0}>Guardar como plantilla</button>
                    <button onClick={() => { updateAppliedTemplate(); setShowMenu(false) }} disabled={!applied?.template_id}
                      title={!applied?.template_id ? 'No hay ninguna plantilla aplicada' : undefined}>
                      Actualizar {appliedTemplateName ? `«${appliedTemplateName}»` : ''}
                    </button>
                    <div style={{borderTop:`1px solid ${C.cremaDark}`, margin:'4px 0'}}/>
                    <button className="anc-rowMenuDanger" onClick={vaciar} disabled={!checklist || items.length===0}>Vaciar</button>
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

      {/* ── Aplicar plantilla — selector ── */}
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
              <p style={{fontSize:12, color:C.txt, marginBottom:8}}>Ya hay ítems hoy — ¿qué hacemos con "{pendingApply.name}"?</p>
              <div style={{display:'flex', gap:6}}>
                <button onClick={() => applyTemplate(pendingApply, 'reemplazar')} style={{...btnDark, flex:1}}>Reemplazar</button>
                <button onClick={() => applyTemplate(pendingApply, 'agregar')} style={{...input, flex:1, cursor:'pointer'}}>Agregar al final</button>
                <button onClick={() => setPendingApply(null)} style={{background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:12}}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Guardar como plantilla ── */}
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

      {!checklist ? (
        <div style={{padding:'16px'}}>
          <p style={{fontSize:12, color:C.muted, marginBottom:10}}>Este servicio todavía no tiene checklist — elegí una plantilla o empezá en blanco.</p>
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            {templates.map(t => (
              <button key={t.id} onClick={() => startChecklist(t)} style={{...input, textAlign:'left', cursor:'pointer'}}>{t.name}</button>
            ))}
            <button onClick={() => startChecklist(null)} style={{...btnDark, marginTop:4}}>Empezar en blanco</button>
          </div>
        </div>
      ) : (
        <div style={{padding:'12px 16px'}}>
          {items.length === 0 && <p style={{fontSize:12, color:C.muted, marginBottom:10}}>Sin ítems todavía.</p>}
          {items.map(item => (
            <div key={item.id} style={{display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'0.5px solid #E8E0D0', flexWrap:'wrap'}}>
              <input type="checkbox" checked={item.checked} onChange={() => toggleItem(item)} style={{width:16, height:16, cursor:'pointer', flexShrink:0}} />
              <span style={{fontSize:13, color:C.txt, flex:1, minWidth:120, textDecoration:item.checked?'line-through':'none', opacity:item.checked?0.5:1}}>{item.texto}</span>
              <select value={item.assigned_member_id || ''} onChange={e => assignItem(item, e.target.value)}
                title="Encargado"
                style={{fontSize:11, padding:'4px 8px', border:'1px solid var(--card-border)', borderRadius:6, fontFamily:'inherit', background:'var(--card-bg)', color:item.assigned_member_id?C.txt:C.muted, cursor:'pointer'}}>
                <option value="">— Sin encargado —</option>
                {assignedMembers.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
              <button onClick={() => removeItem(item.id)} style={{background:'none', border:'none', cursor:'pointer', color:'#B91C1C'}}><X size={13}/></button>
            </div>
          ))}
          <div style={{display:'flex', gap:6, marginTop:10}}>
            <input style={{...input, flex:1}} placeholder="Nuevo ítem para hoy" value={newItemText}
              onChange={e => setNewItemText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} />
            <button onClick={addItem} disabled={!newItemText.trim()} style={{...btnDark, opacity:newItemText.trim()?1:0.5}}><Plus size={13}/></button>
          </div>
        </div>
      )}
    </div>
  )
}
