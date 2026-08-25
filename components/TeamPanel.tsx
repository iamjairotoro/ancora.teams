'use client'
import { useState, useEffect, useCallback } from 'react'
import { Crown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Member, Instrument } from '@/lib/types'
import AvatarUpload from './AvatarUpload'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'

const ALL_INSTRUMENTOS: Instrument[] = [
  'Guitarra Acustica','Guitarra Electrica','Piano',
  'MD (Direccion Musical en vivo)','Bajo','Bateria','Voz','Sonido','Montaje','Perc menores'
]
const SHORT: Record<string, string> = {
  'Guitarra Acustica': 'AG', 'Guitarra Electrica': 'EG',
  'MD (Direccion Musical en vivo)': 'MD', 'Perc menores': 'Perc',
  'Piano': 'Piano', 'Bajo': 'Bass',
  'Bateria': 'Drums', 'Voz': 'Voz', 'Sonido': 'Sonido', 'Montaje': 'Montaje',
}

interface Props { members: Member[]; onRefresh: () => void }

const newEmpty = () => ({ nombre:'', apellido:'', email:'', telefono:'', instrumentos:[] as Instrument[] })

export default function TeamPanel({ members, onRefresh }: Props) {
  const [editing, setEditing] = useState<Partial<Member> | null>(null)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const [adminEmails, setAdminEmails] = useState<Set<string>>(new Set())
  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null)
  const [selectedMobileMember, setSelectedMobileMember] = useState<Member | null>(null)

  const loadAdmins = useCallback(async () => {
    // team_admins con team_id null = admin global de la organización
    // (reemplaza a la vieja admin_emails). Se mantiene el shape de
    // Set<email> para no tocar el resto del componente.
    const { data } = await supabase
      .from('team_admins')
      .select('member:members(email)')
      .is('team_id', null)
      .eq('organization_id', DEFAULT_ORGANIZATION_ID)
    setAdminEmails(new Set(
      (data || []).map((a: any) => a.member?.email?.toLowerCase()).filter(Boolean)
    ))
  }, [])

  useEffect(() => { loadAdmins() }, [loadAdmins])

  async function toggleAdmin(member: Member) {
    if (!member.email) return
    const email = member.email.toLowerCase()
    setTogglingAdmin(member.id)
    if (adminEmails.has(email)) {
      if (adminEmails.size <= 1) { alert('Debe haber al menos un administrador.'); setTogglingAdmin(null); return }
      if (!confirm(`¿Quitar a ${member.nombre} como administrador?`)) { setTogglingAdmin(null); return }
      await supabase.from('team_admins').delete()
        .eq('member_id', member.id).is('team_id', null).eq('organization_id', DEFAULT_ORGANIZATION_ID)
    } else {
      if (!confirm(`¿Hacer a ${member.nombre} administrador? Podrá entrar a este panel con su cuenta Google.`)) { setTogglingAdmin(null); return }
      await supabase.from('team_admins').insert({
        member_id: member.id, team_id: null, organization_id: DEFAULT_ORGANIZATION_ID,
      })
    }
    await loadAdmins()
    setTogglingAdmin(null)
  }

  function toggleInstr(instr: Instrument) {
    if (!editing) return
    const cur = editing.instrumentos || []
    setEditing({ ...editing, instrumentos: cur.includes(instr) ? cur.filter(i => i !== instr) : [...cur, instr] })
  }

  async function save() {
    if (!editing) return
    if (!editing.nombre || !editing.email) { setErr('Nombre y email son obligatorios'); return }
    setSaving(true); setErr('')
    const payload = {
      nombre: editing.nombre,
      apellido: editing.apellido || '',
      email: editing.email,
      telefono: editing.telefono || '',
      instrumentos: editing.instrumentos || [],
      fecha_nacimiento: editing.fecha_nacimiento || null,
    }
    if (editing.id) {
      await supabase.from('members').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('members').insert(payload)
    }
    setSaving(false)
    setEditing(null)
    onRefresh()
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar este integrante?')) return
    await supabase.from('members').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500 dark:text-white/40">
          {members.length} integrante{members.length !== 1 ? 's' : ''}
          <span className="text-gray-300 dark:text-white/20"> · </span>
          <span title="Detectado cuando abren la app desde el ícono agregado a su pantalla de inicio">
            📲 {members.filter(m=>m.instalado_pwa_at).length} con la app instalada
          </span>
        </p>
        <button onClick={() => setEditing(newEmpty())} className="btn-primary text-sm">+ Agregar</button>
      </div>

      {/* Edit / Add form */}
      {editing && (
        <div className="card p-4 border-navy dark:border-white/10 border">
          <h3 className="font-semibold text-navy dark:text-[#F5F0E6] mb-4">{editing.id ? 'Editar' : 'Nuevo'} integrante</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block">Nombre *</label>
              <input className="input" value={editing.nombre || ''}
                onChange={e => setEditing({...editing, nombre: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block">Apellido</label>
              <input className="input" value={editing.apellido || ''}
                onChange={e => setEditing({...editing, apellido: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block">Email *</label>
              <input className="input" type="email" value={editing.email || ''}
                onChange={e => setEditing({...editing, email: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block">Teléfono</label>
              <input className="input" value={editing.telefono || ''}
                onChange={e => setEditing({...editing, telefono: e.target.value})} />
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block mt-2">Fecha de nacimiento</label>
              <input type="date" className="input" value={editing.fecha_nacimiento || ''}
                onChange={e => setEditing({...editing, fecha_nacimiento: e.target.value})} />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-sm text-gray-500 dark:text-white/40 mb-2 block">Instrumentos</label>
            <div className="flex flex-wrap gap-2">
              {ALL_INSTRUMENTOS.map(instr => {
                const active = (editing.instrumentos || []).includes(instr)
                return (
                  <button key={instr} type="button" onClick={() => toggleInstr(instr)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      active ? 'bg-[#1A1A1A] text-[#F5F0E6] border-[#1A1A1A]' : 'bg-white dark:bg-white/5 text-[#1A1A1A] dark:text-[#F5F0E6] border-black/15 dark:border-white/10 hover:border-[#1A1A1A] dark:hover:border-white/30'
                    }`}>
                    {SHORT[instr] || instr}
                  </button>
                )
              })}
            </div>
          </div>
          {err && <p className="text-red-500 text-sm mb-2">{err}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => { setEditing(null); setErr('') }} className="btn-secondary text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Members table */}
      <div className="card overflow-hidden">
        {members.length === 0 && (
          <p className="p-4 text-sm text-gray-400 dark:text-white/30">Sin integrantes. Agrega el primero.</p>
        )}
        {members.length > 0 && (
          <>
            {/* Header — solo desktop */}
            <div className="hidden md:grid md:grid-cols-[2.2fr_1.4fr_1.2fr_0.6fr_0.9fr] gap-3 px-4 py-2 border-b border-gray-100 dark:border-white/5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30">Participante</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30">Instrumentos</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30">Última conexión</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 text-center">Admin</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 text-right">Acciones</span>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {members.map(m => {
                const isAdmin = !!m.email && adminEmails.has(m.email.toLowerCase())
                const avatar = (
                  <div style={{width:32,height:32,borderRadius:'50%',background:'#1A1A1A',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {m.avatar_url
                      ? <img src={m.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={m.nombre}/>
                      : <span style={{fontFamily:'inherit',fontWeight:700,fontSize:11,color:'#F5F0E6'}}>{m.nombre?.[0]}{m.apellido?.[0]||''}</span>
                    }
                  </div>
                )
                const instrumentBadges = (m.instrumentos || []).length > 0 ? (m.instrumentos || []).map(i => (
                  <span key={i} className="text-[10px] bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20 px-1.5 py-0.5 rounded">
                    {SHORT[i] || i}
                  </span>
                )) : <span className="text-[10px] text-gray-300 dark:text-white/20">—</span>
                const lastSeen = m.last_seen ? (
                  <p className="text-[11px] text-gray-500 dark:text-white/40 flex items-center gap-1.5">
                    <span style={{width:6,height:6,borderRadius:'50%',background:'#52B788',flexShrink:0}}/>
                    {new Date(m.last_seen).toLocaleDateString('es-CL',{day:'numeric',month:'short'})} · {new Date(m.last_seen).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}
                    {m.instalado_pwa_at && <span title="Tiene la app instalada en su celular">📲</span>}
                  </p>
                ) : <p className="text-[11px] text-gray-300 dark:text-white/20">Sin conexión aún</p>
                const adminBtn = (
                  <button type="button" onClick={() => toggleAdmin(m)} disabled={togglingAdmin===m.id || !m.email}
                    title={isAdmin ? 'Quitar como administrador' : 'Hacer administrador'}
                    className={isAdmin ? 'text-[#1A1A1A] dark:text-[#F5F0E6]' : 'text-gray-300 dark:text-white/20'}
                    style={{background:'none',border:'none',cursor:m.email?'pointer':'default',opacity:togglingAdmin===m.id?0.4:1,lineHeight:1,display:'flex'}}>
                    <Crown size={16} strokeWidth={1.8} color="currentColor" fill={isAdmin?'currentColor':'none'}/>
                  </button>
                )
                const actions = (
                  <div className="flex gap-2.5 items-center">
                    <a href={`/portal/member_${m.id}`} target="_blank" rel="noopener noreferrer" title="Portal" style={{fontSize:15,textDecoration:'none'}}>🔗</a>
                    <button type="button" onClick={() => { setErr(''); setEditing({...m}) }} title="Editar" style={{fontSize:15,background:'none',border:'none',cursor:'pointer'}}>✏️</button>
                    <button type="button" onClick={() => del(m.id)} title="Eliminar" style={{fontSize:15,background:'none',border:'none',cursor:'pointer'}}>🗑️</button>
                  </div>
                )

                return (
                  <div key={m.id}>
                    {/* Desktop row */}
                    <div className="hidden md:grid md:grid-cols-[2.2fr_1.4fr_1.2fr_0.6fr_0.9fr] gap-3 items-center px-4 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {avatar}
                        <div className="min-w-0">
                          <p className="font-medium text-[13px] dark:text-[#F5F0E6] truncate">{m.nombre} {m.apellido}</p>
                          <p className="text-[11px] text-gray-500 dark:text-white/40 truncate">{m.email}</p>
                          {m.fecha_nacimiento && (
                            <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">
                              Nac. {new Date(m.fecha_nacimiento+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'short',year:'numeric'})}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">{instrumentBadges}</div>
                      <div>{lastSeen}</div>
                      <div className="flex justify-center">{adminBtn}</div>
                      <div className="flex justify-end">{actions}</div>
                    </div>

                    {/* Mobile row — solo avatar + nombre, toca para ver el resto */}
                    <button type="button" onClick={()=>setSelectedMobileMember(m)}
                      className="md:hidden w-full flex items-center gap-2.5 px-4 py-3 text-left" style={{background:'none',border:'none'}}>
                      {avatar}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[13px] dark:text-[#F5F0E6] truncate">{m.nombre} {m.apellido}</p>
                      </div>
                      {isAdmin && <Crown size={13} strokeWidth={1.8} color="currentColor" fill="currentColor" className="text-[#1A1A1A] dark:text-[#F5F0E6] flex-shrink-0"/>}
                      <span className="text-gray-300 dark:text-white/20 flex-shrink-0" style={{fontSize:14}}>›</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal mobile con el detalle completo del integrante */}
      {selectedMobileMember && (() => {
        const m = selectedMobileMember
        const isAdmin = !!m.email && adminEmails.has(m.email.toLowerCase())
        return (
          <div className="md:hidden" style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'flex-end'}}>
            <div onClick={()=>setSelectedMobileMember(null)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)'}}/>
            <div className="dark:bg-[#161616]" style={{position:'relative',width:'100%',background:'#fff',borderRadius:'16px 16px 0 0',padding:'20px 20px 28px',maxHeight:'85vh',overflowY:'auto'}}>
              <div style={{width:36,height:4,borderRadius:2,background:'rgba(0,0,0,0.15)',margin:'0 auto 16px'}} className="dark:bg-white/15"/>

              <div className="flex items-center gap-3 mb-4">
                <div style={{width:48,height:48,borderRadius:'50%',background:'#1A1A1A',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {m.avatar_url
                    ? <img src={m.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={m.nombre}/>
                    : <span style={{fontFamily:'inherit',fontWeight:700,fontSize:16,color:'#F5F0E6'}}>{m.nombre?.[0]}{m.apellido?.[0]||''}</span>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[15px] dark:text-[#F5F0E6] truncate">{m.nombre} {m.apellido}</p>
                  <p className="text-[12px] text-gray-500 dark:text-white/40 truncate">{m.email}</p>
                </div>
                <button type="button" onClick={() => toggleAdmin(m)} disabled={togglingAdmin===m.id || !m.email}
                  title={isAdmin ? 'Quitar como administrador' : 'Hacer administrador'}
                  className={isAdmin ? 'text-[#1A1A1A] dark:text-[#F5F0E6]' : 'text-gray-300 dark:text-white/20'}
                  style={{background:'none',border:'none',opacity:togglingAdmin===m.id?0.4:1,flexShrink:0}}>
                  <Crown size={20} strokeWidth={1.8} color="currentColor" fill={isAdmin?'currentColor':'none'}/>
                </button>
              </div>

              {m.fecha_nacimiento && (
                <p className="text-[12px] text-gray-400 dark:text-white/30 mb-3">
                  🎂 Nac. {new Date(m.fecha_nacimiento+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'})}
                </p>
              )}

              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 mb-1.5">Instrumentos</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(m.instrumentos || []).length > 0 ? (m.instrumentos || []).map(i => (
                  <span key={i} className="text-[11px] bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20 px-2 py-0.5 rounded">
                    {SHORT[i] || i}
                  </span>
                )) : <span className="text-[11px] text-gray-300 dark:text-white/20">Sin instrumentos</span>}
              </div>

              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 mb-1.5">Última conexión</p>
              <div className="mb-5">
                {m.last_seen ? (
                  <p className="text-[12px] text-gray-500 dark:text-white/40 flex items-center gap-1.5">
                    <span style={{width:6,height:6,borderRadius:'50%',background:'#52B788',flexShrink:0}}/>
                    {new Date(m.last_seen).toLocaleDateString('es-CL',{day:'numeric',month:'short'})} · {new Date(m.last_seen).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}
                  </p>
                ) : <p className="text-[12px] text-gray-300 dark:text-white/20">Sin conexión aún</p>}
              </div>

              <div className="flex gap-2">
                <a href={`/portal/member_${m.id}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-center" style={{fontSize:20,padding:'10px 0',borderRadius:10,background:'rgba(0,0,0,0.04)',textDecoration:'none'}}>🔗</a>
                <button type="button" onClick={() => { setErr(''); setEditing({...m}); setSelectedMobileMember(null) }}
                  className="flex-1" style={{fontSize:20,padding:'10px 0',borderRadius:10,background:'rgba(0,0,0,0.04)',border:'none'}}>✏️</button>
                <button type="button" onClick={() => { setSelectedMobileMember(null); del(m.id) }}
                  className="flex-1" style={{fontSize:20,padding:'10px 0',borderRadius:10,background:'rgba(0,0,0,0.04)',border:'none'}}>🗑️</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
