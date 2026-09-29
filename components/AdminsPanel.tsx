'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'

const LIGHT_C = { crema:'#F2F1EE', cremaDark:'#D6D5D1', txt:'#1A1A1A', muted:'#AAAAAA', card:'#FFFFFF' }
const DARK_C  = { crema:'rgba(255,255,255,0.06)', cremaDark:'rgba(255,255,255,0.08)', txt:'#F5F0E6', muted:'rgba(255,255,255,0.45)', card:'rgba(255,255,255,0.06)' }
const ACCENT = '#1A1A1A' // fijo — badges/botones sólidos, mismo color en ambos modos

type Role = 'owner'|'admin'
interface OrgMember { email: string; role: Role; created_at: string }
interface Props { darkMode?: boolean }

// Punto 14 — la distinción Owner/Admin: el Owner es quien puede nombrar y
// quitar admins (y, a futuro, borrar la organización); un Admin no puede
// tocar esta pantalla. Este panel solo administra el rol 'admin' — el
// rol 'owner' no se transfiere ni se quita desde acá (ver migrations/023,
// PASO 2: los owners de hoy vienen de los admins globales que ya existían,
// no hay flujo para nombrar un owner nuevo todavía).
export default function AdminsPanel({ darkMode }: Props) {
  const C = darkMode ? DARK_C : LIGHT_C
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function load() {
    const { data } = await supabase
      .from('organization_members')
      .select('role, created_at, member:members(email)')
      .eq('organization_id', DEFAULT_ORGANIZATION_ID)
      .in('role', ['owner','admin'])
      .order('created_at')
    setMembers(
      (data || [])
        .filter((a: any) => a.member?.email)
        .map((a: any) => ({ email: a.member.email, role: a.role, created_at: a.created_at }))
    )
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const owners = members.filter(m => m.role === 'owner')
  const admins = members.filter(m => m.role === 'admin')

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

    const { error } = await supabase.from('organization_members').insert({
      organization_id: DEFAULT_ORGANIZATION_ID, person_id: member.id, role: 'admin',
    })
    if (error) {
      setErr(error.code === '23505' ? 'Ese email ya tiene un rol en la organización.' : error.message)
    } else {
      setMsg(`✓ ${newEmail} agregado como administrador`)
      setNewEmail('')
      load()
    }
    setAdding(false)
  }

  async function removeAdmin(email: string) {
    if (!confirm(`¿Quitar a ${email} como administrador?`)) return
    const { data: member } = await supabase.from('members').select('id').eq('email', email).single()
    if (member) {
      await supabase.from('organization_members').delete()
        .eq('person_id', member.id).eq('organization_id', DEFAULT_ORGANIZATION_ID).eq('role', 'admin')
    }
    setMsg(`${email} ya no es administrador`)
    load()
  }

  const input: React.CSSProperties = { border:`0.5px solid ${C.cremaDark}`,borderRadius:8,padding:'9px 12px',fontSize:13,fontFamily:'inherit',outline:'none',color:C.txt,background:C.card,flex:1 }
  const btnDark: React.CSSProperties = { background:ACCENT,color:'#F5F0E6',border:'none',borderRadius:8,padding:'9px 16px',fontSize:12,fontWeight:600,fontFamily:'inherit',cursor:'pointer' }
  const btnRed: React.CSSProperties = { background:'#FEE2E2',color:'#B91C1C',border:'none',borderRadius:6,padding:'5px 10px',fontSize:11,fontWeight:600,fontFamily:'inherit',cursor:'pointer' }

  return (
    <div style={{maxWidth:560,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden',marginBottom:16}}>
        <div style={{padding:'14px 16px',borderBottom:`0.5px solid ${C.cremaDark}`,background:C.crema}}>
          <h2 style={{fontSize:13,fontWeight:700,color:C.txt,letterSpacing:0.5,textTransform:'uppercase',marginBottom:2}}>Owners</h2>
          <p style={{fontSize:11,color:C.muted}}>Acceso total, incluido nombrar admins. No se administra desde acá.</p>
        </div>
        <div>
          {owners.map(a => (
            <div key={a.email} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:`0.5px solid ${C.crema}`}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:ACCENT,color:'#F5F0E6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0}}>
                {a.email[0].toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:600,color:C.txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.email}</p>
                <p style={{fontSize:10,color:C.muted,marginTop:1}}>Owner</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'14px 16px',borderBottom:`0.5px solid ${C.cremaDark}`,background:C.crema}}>
          <h2 style={{fontSize:13,fontWeight:700,color:C.txt,letterSpacing:0.5,textTransform:'uppercase',marginBottom:2}}>Administradores</h2>
          <p style={{fontSize:11,color:C.muted}}>Crean y editan servicios, y administran cualquier equipo.</p>
        </div>

        {loading ? (
          <div style={{padding:32,textAlign:'center',color:C.muted,fontSize:13}}>Cargando...</div>
        ) : (
          <div>
            {admins.length === 0 && (
              <div style={{padding:'20px 16px',textAlign:'center'}}>
                <p style={{fontSize:12,color:C.muted}}>Todavía no hay administradores con este rol.</p>
              </div>
            )}
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
