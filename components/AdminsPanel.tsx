'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'

const LIGHT_C = { crema:'#F2F1EE', cremaDark:'#D6D5D1', txt:'#1A1A1A', muted:'#AAAAAA', card:'#FFFFFF' }
const DARK_C  = { crema:'rgba(255,255,255,0.06)', cremaDark:'rgba(255,255,255,0.08)', txt:'#F5F0E6', muted:'rgba(255,255,255,0.45)', card:'rgba(255,255,255,0.06)' }
const ACCENT = '#1A1A1A' // fijo — badges/botones sólidos, mismo color en ambos modos

interface AdminEmail { email: string; created_at: string }
interface Props { darkMode?: boolean }

export default function AdminsPanel({ darkMode }: Props) {
  const C = darkMode ? DARK_C : LIGHT_C
  const [admins, setAdmins] = useState<AdminEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function load() {
    // team_admins con team_id null = admin global de la organización
    // (reemplaza a la vieja admin_emails).
    const { data } = await supabase
      .from('team_admins')
      .select('created_at, member:members(email)')
      .is('team_id', null)
      .eq('organization_id', DEFAULT_ORGANIZATION_ID)
      .order('created_at')
    setAdmins(
      (data || [])
        .filter((a: any) => a.member?.email)
        .map((a: any) => ({ email: a.member.email, created_at: a.created_at }))
    )
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addAdmin() {
    if (!newEmail.trim()) return
    setAdding(true); setErr(''); setMsg('')
    const email = newEmail.trim().toLowerCase()

    const { data: member } = await supabase.from('members').select('id').eq('email', email).single()
    if (!member) {
      setErr('Ese correo no corresponde a ningún miembro registrado. Agrégalo primero en Equipo.')
      setAdding(false)
      return
    }

    const { error } = await supabase.from('team_admins').insert({
      member_id: member.id, team_id: null, organization_id: DEFAULT_ORGANIZATION_ID,
    })
    if (error) {
      setErr(error.code === '23505' ? 'Ese email ya es administrador.' : error.message)
    } else {
      setMsg(`✓ ${newEmail} agregado como administrador`)
      setNewEmail('')
      load()
    }
    setAdding(false)
  }

  async function removeAdmin(email: string) {
    if (admins.length <= 1) { setErr('Debe haber al menos un administrador.'); return }
    if (!confirm(`¿Quitar a ${email} como administrador?`)) return
    const { data: member } = await supabase.from('members').select('id').eq('email', email).single()
    if (member) {
      await supabase.from('team_admins').delete()
        .eq('member_id', member.id).is('team_id', null).eq('organization_id', DEFAULT_ORGANIZATION_ID)
    }
    setMsg(`${email} ya no es administrador`)
    load()
  }

  const input: React.CSSProperties = { border:`0.5px solid ${C.cremaDark}`,borderRadius:8,padding:'9px 12px',fontSize:13,fontFamily:'inherit',outline:'none',color:C.txt,background:C.card,flex:1 }
  const btnDark: React.CSSProperties = { background:ACCENT,color:'#F5F0E6',border:'none',borderRadius:8,padding:'9px 16px',fontSize:12,fontWeight:600,fontFamily:'inherit',cursor:'pointer' }
  const btnRed: React.CSSProperties = { background:'#FEE2E2',color:'#B91C1C',border:'none',borderRadius:6,padding:'5px 10px',fontSize:11,fontWeight:600,fontFamily:'inherit',cursor:'pointer' }

  return (
    <div style={{maxWidth:560,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'14px 16px',borderBottom:`0.5px solid ${C.cremaDark}`,background:C.crema}}>
          <h2 style={{fontSize:13,fontWeight:700,color:C.txt,letterSpacing:0.5,textTransform:'uppercase',marginBottom:2}}>Administradores</h2>
          <p style={{fontSize:11,color:C.muted}}>Solo estos correos pueden acceder al panel de administración.</p>
        </div>

        {/* Lista de admins */}
        {loading ? (
          <div style={{padding:32,textAlign:'center',color:C.muted,fontSize:13}}>Cargando...</div>
        ) : (
          <div>
            {admins.map(a => (
              <div key={a.email} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:`0.5px solid ${C.crema}`}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:ACCENT,color:'#F5F0E6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0}}>
                  {a.email[0].toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:600,color:C.txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.email}</p>
                  <p style={{fontSize:10,color:C.muted,marginTop:1}}>
                    Desde {new Date(a.created_at).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'})}
                  </p>
                </div>
                <button onClick={() => removeAdmin(a.email)} style={btnRed}>
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Agregar admin */}
        <div style={{padding:'14px 16px',borderTop:`0.5px solid ${C.cremaDark}`,background:C.crema}}>
          {msg && <p style={{fontSize:12,color:'#1B4332',background:'#D8F3DC',padding:'6px 10px',borderRadius:6,marginBottom:10,fontWeight:500}}>{msg}</p>}
          {err && <p style={{fontSize:12,color:'#B91C1C',background:'#FEE2E2',padding:'6px 10px',borderRadius:6,marginBottom:10,fontWeight:500}}>{err}</p>}
          <p style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Agregar administrador</p>
          <div style={{display:'flex',gap:8}}>
            <input
              style={input}
              type="email"
              placeholder="correo@gmail.com"
              value={newEmail}
              onChange={e => { setNewEmail(e.target.value); setErr(''); setMsg('') }}
              onKeyDown={e => e.key === 'Enter' && addAdmin()}
            />
            <button onClick={addAdmin} disabled={adding || !newEmail.trim()} style={{...btnDark,opacity:adding||!newEmail.trim()?0.5:1}}>
              {adding ? '...' : '+ Agregar'}
            </button>
          </div>
          <p style={{fontSize:10,color:C.muted,marginTop:8}}>⚠️ El correo debe tener una cuenta Google para poder iniciar sesión.</p>
        </div>
      </div>
    </div>
  )
}
