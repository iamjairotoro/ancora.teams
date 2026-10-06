'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'
import { setOrgRole, syncAdminNotices, type SetOrgRoleResult } from '@/lib/setOrgRole'
import { findMemberByEmail } from '@/lib/findMemberByEmail'

const LIGHT_C = { crema:'#F2F1EE', cremaDark:'#D6D5D1', txt:'#1A1A1A', muted:'#AAAAAA', card:'#FFFFFF' }
const DARK_C  = { crema:'rgba(255,255,255,0.06)', cremaDark:'rgba(255,255,255,0.08)', txt:'#F5F0E6', muted:'rgba(255,255,255,0.45)', card:'rgba(255,255,255,0.06)' }
const ACCENT = '#1A1A1A' // fijo — badges/botones sólidos, mismo color en ambos modos

type Role = 'owner'|'admin'
interface OrgMember { personId: string; email: string; role: Role; created_at: string }
interface Props {
  darkMode?: boolean
  // PersonasPanel (quien monta esto ahora, como tercera pestaña) registra
  // acá cómo "dar de alta" un admin: el formulario de correo de más abajo
  // sigue siempre visible, sin tocarlo — la acción solo hace scroll hasta
  // el campo y le da foco.
  onRequestNew?: (trigger: () => void) => void
}

// Punto 14 — la distinción Owner/Admin: el Owner es quien puede nombrar y
// quitar admins (y, a futuro, borrar la organización); un Admin no puede
// tocar esta pantalla. Este panel solo administra el rol 'admin' — el
// rol 'owner' no se transfiere ni se quita desde acá (ver migrations/023,
// PASO 2: los owners de hoy vienen de los admins globales que ya existían,
// no hay flujo para nombrar un owner nuevo todavía).
export default function AdminsPanel({ darkMode, onRequestNew }: Props) {
  const C = darkMode ? DARK_C : LIGHT_C
  const emailInputRef = useRef<HTMLInputElement>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  // El rol se aplicó pero team_admins (los avisos de RSVP) no se pudo sincronizar:
  // aviso PERSISTENTE, nunca un mensaje que se va solo, con «Reintentar avisos».
  const [syncFail, setSyncFail] = useState<{ personId: string; email: string; admin: boolean; detail: string } | null>(null)
  const [retrying, setRetrying] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('organization_members')
      .select('role, person_id, created_at, member:members(email)')
      .eq('organization_id', DEFAULT_ORGANIZATION_ID)
      .in('role', ['owner','admin'])
      .order('created_at')
    setMembers(
      (data || [])
        .filter((a: any) => a.member?.email)
        .map((a: any) => ({ personId: a.person_id, email: a.member.email, role: a.role, created_at: a.created_at }))
    )
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    onRequestNew?.(() => {
      emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      emailInputRef.current?.focus()
    })
  }, [onRequestNew])

  const owners = members.filter(m => m.role === 'owner')
  const admins = members.filter(m => m.role === 'admin')

  // Esta pestaña es una pieza DELGADA: busca a la persona y llama a setOrgRole
  // (lib/setOrgRole.ts), que escribe el rol y sincroniza team_admins. Retirarla
  // es borrar este archivo y su pestaña.
  function showResult(res: SetOrgRoleResult, person: { id: string; email: string }, admin: boolean, okMsg: string, sameMsg: string) {
    if (res.status === 'ok') { setMsg(okMsg); setSyncFail(null) }
    else if (res.status === 'unchanged') setMsg(sameMsg)
    else if (res.status === 'rejected' || res.status === 'error') setErr(res.message)
    else {
      setMsg(okMsg)
      setSyncFail({ personId: person.id, email: person.email, admin, detail: res.message })
    }
    load()
  }

  async function addAdmin() {
    if (!newEmail.trim()) return
    setAdding(true); setErr(''); setMsg('')
    const found = await findMemberByEmail(newEmail)
    if (found.status === 'not-found') setErr('Ese correo no corresponde a ninguna persona registrada. Agrégalo primero en Personas.')
    else if (found.status === 'ambiguous') setErr('Hay dos personas con ese correo (solo cambian las mayúsculas). Corrige una en Personas.')
    else if (found.status === 'error') setErr(found.message)
    else {
      const res = await setOrgRole(found.id, 'admin')
      showResult(res, { id: found.id, email: found.email }, true,
        `✓ ${found.email} agregado como administrador`, `${found.email} ya es administrador`)
      if (res.status === 'ok' || res.status === 'unchanged' || res.status === 'sync-failed') setNewEmail('')
    }
    setAdding(false)
  }

  async function removeAdmin(a: OrgMember) {
    if (!confirm(`¿Quitar a ${a.email} como administrador?`)) return
    setErr(''); setMsg('')
    const res = await setOrgRole(a.personId, 'member')
    showResult(res, { id: a.personId, email: a.email }, false,
      `${a.email} ya no es administrador`, `${a.email} ya no tenía el rol de administrador`)
  }

  // «Sincronizar avisos»: deja team_admins igual que organization_members para TODOS
  // los administradores actuales (owners y admins). Idempotente: no cambia ningún
  // rol y lo ya sincronizado no se vuelve a escribir. Informa el resultado.
  const [syncingAll, setSyncingAll] = useState(false)
  async function syncAll() {
    if (syncingAll || members.length === 0) return
    setSyncingAll(true); setErr(''); setMsg('')
    let changed = 0, already = 0
    const failed: { email: string; message: string }[] = []
    for (const m of members) {
      const res = await syncAdminNotices(m.personId, true)
      if (!res.ok) failed.push({ email: m.email, message: res.message })
      else if (res.changed) changed++
      else already++
    }
    setSyncingAll(false)
    if (failed.length === 0) {
      setMsg(`✓ Avisos sincronizados: ${changed} agregado${changed !== 1 ? 's' : ''}, ${already} ya estaba${already !== 1 ? 'n' : ''} (${members.length} administradores).`)
    } else {
      setErr(`No se pudo sincronizar a ${failed.map(f => f.email).join(', ')}: ${failed[0].message}${changed || already ? ` (${changed} agregado${changed !== 1 ? 's' : ''}, ${already} ya estaba${already !== 1 ? 'n' : ''}.)` : ''}`)
    }
  }

  // Idempotente: solo repite la sincronización de team_admins, no toca el rol.
  async function retrySync() {
    if (!syncFail || retrying) return
    setRetrying(true)
    const res = await syncAdminNotices(syncFail.personId, syncFail.admin)
    setRetrying(false)
    if (res.ok) { setSyncFail(null); setMsg(`✓ Avisos sincronizados para ${syncFail.email}`) }
    else setSyncFail({ ...syncFail, detail: res.message })
  }

  const input: React.CSSProperties = { border:`0.5px solid ${C.cremaDark}`,borderRadius:8,padding:'9px 12px',fontSize:13,fontFamily:'inherit',outline:'none',color:C.txt,background:C.card,flex:1 }
  const btnDark: React.CSSProperties = { background:ACCENT,color:'#F5F0E6',border:'none',borderRadius:8,padding:'9px 16px',fontSize:12,fontWeight:600,fontFamily:'inherit',cursor:'pointer' }
  const btnRed: React.CSSProperties = { background:'#FEE2E2',color:'#B91C1C',border:'none',borderRadius:6,padding:'5px 10px',fontSize:11,fontWeight:600,fontFamily:'inherit',cursor:'pointer' }

  return (
    <div style={{maxWidth:560,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      {syncFail && (
        <div role="alert" style={{background:'var(--anc-pe-bg)',border:'1px solid var(--anc-pe)',borderRadius:10,padding:'10px 14px',marginBottom:16,display:'flex',gap:12,alignItems:'flex-start'}}>
          <p style={{flex:1,fontSize:12,color:'var(--anc-ink)',fontWeight:500}}>
            El rol se aplicó, pero no se sincronizaron los avisos de {syncFail.email}. {syncFail.detail}
          </p>
          <button onClick={retrySync} disabled={retrying} style={{...btnDark,padding:'6px 12px',fontSize:11,opacity:retrying?0.6:1,flexShrink:0}}>
            {retrying ? 'Reintentando…' : 'Reintentar avisos'}
          </button>
        </div>
      )}
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
          <div style={{display:'flex',alignItems:'baseline',gap:10}}>
            <h2 style={{flex:1,fontSize:13,fontWeight:700,color:C.txt,letterSpacing:0.5,textTransform:'uppercase',marginBottom:2}}>Administradores</h2>
            <button onClick={syncAll} disabled={syncingAll || loading || members.length === 0}
              title="Deja la lista de avisos de RSVP igual que los administradores actuales. No cambia ningún rol."
              style={{background:'none',border:'none',padding:0,fontFamily:'inherit',fontSize:11,fontWeight:600,color:C.muted,textDecoration:'underline',cursor:syncingAll?'progress':'pointer',opacity:syncingAll?0.6:1}}>
              {syncingAll ? 'Sincronizando…' : 'Sincronizar avisos'}
            </button>
          </div>
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
                <button onClick={() => removeAdmin(a)} style={btnRed}>
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
              ref={emailInputRef}
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
