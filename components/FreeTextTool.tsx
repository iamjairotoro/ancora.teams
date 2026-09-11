'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Service } from '@/lib/types'

interface Props { teamId: string; service: Service }

const C = { txt:'var(--ancora-txt)', muted:'var(--ancora-muted)' }

export default function FreeTextTool({ teamId, service }: Props) {
  const [noteId, setNoteId] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(true)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('service_notes').select('*')
      .eq('service_id', service.id).eq('team_id', teamId).maybeSingle()
    setNoteId(data?.id || null)
    setTexto(data?.texto || '')
    setLoading(false)
  }, [service.id, teamId])

  useEffect(() => { setLoading(true); load() }, [load])

  function onChange(value: string) {
    setTexto(value)
    setSaved(false)
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => save(value), 600)
  }

  async function save(value: string) {
    if (noteId) {
      await supabase.from('service_notes').update({ texto: value, updated_at: new Date().toISOString() }).eq('id', noteId)
    } else {
      const { data } = await supabase.from('service_notes').insert({
        service_id: service.id, team_id: teamId, texto: value,
      }).select().single()
      if (data) setNoteId(data.id)
    }
    setSaved(true)
  }

  if (loading) return <div style={{padding:24, textAlign:'center', color:C.muted, fontSize:13}}>Cargando...</div>

  return (
    <div style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, overflow:'hidden'}}>
      <div style={{padding:'10px 16px', borderBottom:'1px solid var(--card-border)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span style={{fontSize:12, fontWeight:700, letterSpacing:1, textTransform:'uppercase', color:C.txt}}>Notas</span>
        <span style={{fontSize:10, color:C.muted}}>{saved ? 'Guardado' : 'Guardando...'}</span>
      </div>
      <textarea value={texto} onChange={e => onChange(e.target.value)} placeholder="Escribí acá cualquier nota para este servicio..."
        rows={6}
        style={{width:'100%', border:'none', outline:'none', resize:'vertical', padding:'12px 16px', fontSize:13, fontFamily:'inherit', color:C.txt, background:'var(--card-bg)', minHeight:120, boxSizing:'border-box'}} />
    </div>
  )
}
