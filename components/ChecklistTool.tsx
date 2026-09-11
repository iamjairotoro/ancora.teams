'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Settings, Archive } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Service, Member, ChecklistTemplate, ChecklistTemplateItem, ServiceChecklist, ServiceChecklistItem } from '@/lib/types'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'

interface Props { teamId: string; teamToolId: string; service: Service; assignedMembers: Member[]; darkMode?: boolean }

const C = { crema:'var(--crema)', cremaDark:'var(--crema-dark)', txt:'var(--ancora-txt)', muted:'var(--ancora-muted)' }
const ACCENT = '#1A1A1A'

export default function ChecklistTool({ teamId, teamToolId, service, assignedMembers }: Props) {
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [checklist, setChecklist] = useState<ServiceChecklist | null>(null)
  const [items, setItems] = useState<ServiceChecklistItem[]>([])
  const [newItemText, setNewItemText] = useState('')
  const [showManage, setShowManage] = useState(false)

  // Administrar plantillas
  const [newTemplateName, setNewTemplateName] = useState('')
  const [templateItemsByTemplate, setTemplateItemsByTemplate] = useState<Record<string, ChecklistTemplateItem[]>>({})
  const [newTemplateItemText, setNewTemplateItemText] = useState<Record<string, string>>({})

  const loadTemplates = useCallback(async () => {
    const { data } = await supabase.from('checklist_templates').select('*')
      .eq('team_id', teamId).is('archived_at', null).order('sort_order')
    setTemplates(data || [])
  }, [teamId])

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

  useEffect(() => { setLoading(true); loadTemplates(); loadChecklist() }, [loadTemplates, loadChecklist])

  async function startChecklist(templateId: string | null) {
    const { data: cl, error } = await supabase.from('service_checklists').insert({
      service_id: service.id, team_id: teamId, team_tool_id: teamToolId, template_id: templateId,
    }).select().single()
    if (error || !cl) return
    if (templateId) {
      const { data: templateItems } = await supabase.from('checklist_template_items').select('*')
        .eq('template_id', templateId).order('sort_order')
      if (templateItems?.length) {
        await supabase.from('service_checklist_items').insert(
          templateItems.map(ti => ({ service_checklist_id: cl.id, texto: ti.texto, sort_order: ti.sort_order, checked: false }))
        )
      }
    }
    await loadChecklist()
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

  async function createTemplate() {
    if (!newTemplateName.trim()) return
    const nextOrder = templates.length ? Math.max(...templates.map(t => t.sort_order)) + 1 : 0
    await supabase.from('checklist_templates').insert({
      organization_id: DEFAULT_ORGANIZATION_ID, team_id: teamId, name: newTemplateName.trim(), sort_order: nextOrder,
    })
    setNewTemplateName('')
    await loadTemplates()
  }

  async function archiveTemplate(id: string) {
    if (!confirm('¿Archivar esta plantilla? No se borra, deja de aparecer para elegir en nuevos servicios.')) return
    await supabase.from('checklist_templates').update({ archived_at: new Date().toISOString() }).eq('id', id)
    await loadTemplates()
  }

  async function loadTemplateItems(templateId: string) {
    const { data } = await supabase.from('checklist_template_items').select('*').eq('template_id', templateId).order('sort_order')
    setTemplateItemsByTemplate(prev => ({ ...prev, [templateId]: data || [] }))
  }

  async function addTemplateItem(templateId: string) {
    const texto = (newTemplateItemText[templateId] || '').trim()
    if (!texto) return
    const existing = templateItemsByTemplate[templateId] || []
    const nextOrder = existing.length ? Math.max(...existing.map(i => i.sort_order)) + 1 : 0
    await supabase.from('checklist_template_items').insert({ template_id: templateId, texto, sort_order: nextOrder })
    setNewTemplateItemText(prev => ({ ...prev, [templateId]: '' }))
    await loadTemplateItems(templateId)
  }

  async function removeTemplateItem(templateId: string, itemId: string) {
    await supabase.from('checklist_template_items').delete().eq('id', itemId)
    await loadTemplateItems(templateId)
  }

  const input: React.CSSProperties = { border:`1px solid var(--card-border)`, borderRadius:8, padding:'7px 11px', fontSize:13, fontFamily:'inherit', outline:'none', background:'var(--card-bg)', color:C.txt }
  const btnDark: React.CSSProperties = { background:ACCENT, color:'#F5F0E6', border:'none', borderRadius:8, padding:'8px 14px', fontSize:12, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }

  if (loading) return <div style={{padding:24, textAlign:'center', color:C.muted, fontSize:13}}>Cargando...</div>

  return (
    <div style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, overflow:'hidden'}}>
      <div style={{padding:'10px 16px', borderBottom:'1px solid var(--card-border)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span style={{fontSize:12, fontWeight:700, letterSpacing:1, textTransform:'uppercase', color:C.txt}}>Checklist</span>
        <button onClick={() => setShowManage(v => !v)} title="Administrar plantillas"
          style={{background:'none', border:'none', cursor:'pointer', color:C.muted, display:'flex', alignItems:'center', gap:4, fontSize:11, fontFamily:'inherit'}}>
          <Settings size={13}/> Plantillas
        </button>
      </div>

      {showManage && (
        <div style={{padding:'12px 16px', borderBottom:'1px solid var(--card-border)', background:C.crema}}>
          <p style={{fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:8}}>Administrar plantillas</p>
          <div style={{display:'flex', gap:6, marginBottom:10}}>
            <input style={{...input, flex:1}} placeholder="Nueva plantilla (ej. Domingo regular)" value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createTemplate()} />
            <button onClick={createTemplate} disabled={!newTemplateName.trim()} style={{...btnDark, opacity:newTemplateName.trim()?1:0.5}}><Plus size={13}/></button>
          </div>
          {templates.length === 0 && <p style={{fontSize:12, color:C.muted}}>Sin plantillas todavía.</p>}
          {templates.map(t => {
            const tItems = templateItemsByTemplate[t.id]
            return (
              <div key={t.id} style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:8, padding:10, marginBottom:8}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6}}>
                  <button onClick={() => tItems ? setTemplateItemsByTemplate(prev => { const n = {...prev}; delete n[t.id]; return n }) : loadTemplateItems(t.id)}
                    style={{background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:C.txt, fontFamily:'inherit', padding:0}}>
                    {t.name}
                  </button>
                  <button onClick={() => archiveTemplate(t.id)} title="Archivar" style={{background:'none', border:'none', cursor:'pointer', color:C.muted}}><Archive size={13}/></button>
                </div>
                {tItems && (
                  <div>
                    {tItems.map(ti => (
                      <div key={ti.id} style={{display:'flex', alignItems:'center', gap:6, padding:'3px 0'}}>
                        <span style={{fontSize:12, color:C.txt, flex:1}}>{ti.texto}</span>
                        <button onClick={() => removeTemplateItem(t.id, ti.id)} style={{background:'none', border:'none', cursor:'pointer', color:'#B91C1C'}}><X size={12}/></button>
                      </div>
                    ))}
                    <div style={{display:'flex', gap:6, marginTop:6}}>
                      <input style={{...input, flex:1, fontSize:12, padding:'5px 8px'}} placeholder="Nuevo ítem"
                        value={newTemplateItemText[t.id] || ''} onChange={e => setNewTemplateItemText(prev => ({...prev, [t.id]: e.target.value}))}
                        onKeyDown={e => e.key === 'Enter' && addTemplateItem(t.id)} />
                      <button onClick={() => addTemplateItem(t.id)} style={{...btnDark, padding:'5px 10px', fontSize:11}}>+</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!checklist ? (
        <div style={{padding:'16px'}}>
          <p style={{fontSize:12, color:C.muted, marginBottom:10}}>Este servicio todavía no tiene checklist — elegí una plantilla o empezá en blanco.</p>
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            {templates.map(t => (
              <button key={t.id} onClick={() => startChecklist(t.id)} style={{...input, textAlign:'left', cursor:'pointer'}}>{t.name}</button>
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
