'use client'
import ErrorDeCarga from './ErrorDeCarga'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Service } from '@/lib/types'

interface Props { teamId: string; teamToolId: string; service: Service; menu?: React.ReactNode }

const C = { txt:'var(--ancora-txt)', muted:'var(--ancora-muted)' }

export default function FreeTextTool({ teamId, teamToolId, service, menu }: Props) {
  const [noteId, setNoteId] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(true)
  const [falla, setFalla] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    // Si no cargó la nota, se dice («Reintentar») y NO se deja escribir: guardar sobre una nota que no se pudo leer la pisaría o la duplicaría.
    const { data, error } = await supabase.from('service_notes').select('*')
      .eq('service_id', service.id).eq('team_tool_id', teamToolId).maybeSingle()
    if (error) { console.error('[notas] no se pudo cargar:', error.message); setFalla(true); setLoading(false); return }
    setFalla(false)
    setNoteId(data?.id || null)
    setTexto(data?.texto || '')
    setLoading(false)
  }, [service.id, teamToolId])

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
        service_id: service.id, team_id: teamId, team_tool_id: teamToolId, texto: value,
      }).select().single()
      if (data) setNoteId(data.id)
    }
    setSaved(true)
  }

  if (loading) return <div style={{padding:24, textAlign:'center', color:C.muted, fontSize:13}}>Cargando...</div>
  if (falla) return <ErrorDeCarga compacto titulo="No se pudieron cargar las notas" onReintentar={() => { setLoading(true); load() }} />

  return (
    <div style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, overflow:'hidden'}}>
      <div style={{padding:'10px 16px', borderBottom:'1px solid var(--card-border)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span style={{fontSize:'.875rem', fontWeight:700, color:C.txt}}>Notas</span>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <span style={{fontSize:10, color:C.muted}}>{saved ? 'Guardado' : 'Guardando...'}</span>
          {menu}
        </div>
      </div>
      <textarea value={texto} onChange={e => onChange(e.target.value)} placeholder="Escribe aquí cualquier nota para este servicio..."
        rows={6}
        style={{width:'100%', border:'none', outline:'none', resize:'vertical', padding:'12px 16px', fontSize:13, fontFamily:'inherit', color:C.txt, background:'var(--card-bg)', minHeight:120, boxSizing:'border-box'}} />
    </div>
  )
}
