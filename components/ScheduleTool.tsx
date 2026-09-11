'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, X, GripVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Service, ServiceScheduleItem } from '@/lib/types'

interface Props { teamId: string; teamToolId: string; service: Service }

const C = { crema:'var(--crema)', txt:'var(--ancora-txt)', muted:'var(--ancora-muted)' }
const ACCENT = '#1A1A1A'

export default function ScheduleTool({ teamId, teamToolId, service }: Props) {
  const [items, setItems] = useState<ServiceScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newHora, setNewHora] = useState('')
  const [newTexto, setNewTexto] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('service_schedule_items').select('*')
      .eq('service_id', service.id).eq('team_tool_id', teamToolId).order('sort_order')
    setItems(data || [])
    setLoading(false)
  }, [service.id, teamToolId])

  useEffect(() => { setLoading(true); load() }, [load])

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

  const input: React.CSSProperties = { border:`1px solid var(--card-border)`, borderRadius:8, padding:'7px 11px', fontSize:13, fontFamily:'inherit', outline:'none', background:'var(--card-bg)', color:C.txt }
  const btnDark: React.CSSProperties = { background:ACCENT, color:'#F5F0E6', border:'none', borderRadius:8, padding:'8px 14px', fontSize:12, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }

  if (loading) return <div style={{padding:24, textAlign:'center', color:C.muted, fontSize:13}}>Cargando...</div>

  return (
    <div style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, overflow:'hidden'}}>
      <div style={{padding:'10px 16px', borderBottom:'1px solid var(--card-border)'}}>
        <span style={{fontSize:12, fontWeight:700, letterSpacing:1, textTransform:'uppercase', color:C.txt}}>Cronograma</span>
      </div>
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
              style={{...input, width:70, flexShrink:0, padding:'6px 8px', fontSize:12, fontWeight:600, textAlign:'center'}} />
            <input defaultValue={item.texto} onBlur={e => updateItem(item.id, { texto: e.target.value })}
              style={{...input, flex:1, padding:'6px 8px'}} />
            <button onClick={() => removeItem(item.id)} style={{background:'none', border:'none', cursor:'pointer', color:'#B91C1C', flexShrink:0}}><X size={14}/></button>
          </div>
        ))}
        <div style={{display:'flex', gap:8, padding:'10px 16px'}}>
          <input value={newHora} onChange={e => setNewHora(e.target.value)} placeholder="Hora"
            style={{...input, width:70, flexShrink:0, textAlign:'center'}} />
          <input value={newTexto} onChange={e => setNewTexto(e.target.value)} placeholder="Nuevo ítem del cronograma"
            onKeyDown={e => e.key === 'Enter' && addItem()} style={{...input, flex:1}} />
          <button onClick={addItem} disabled={!newTexto.trim()} style={{...btnDark, opacity:newTexto.trim()?1:0.5, flexShrink:0}}><Plus size={13}/></button>
        </div>
      </div>
    </div>
  )
}
