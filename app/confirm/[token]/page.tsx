'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Invitation, Service, Member } from '@/lib/types'

const BG = '#F5F0E6', CARD = '#FFFFFF', DARK = '#1A1A1A', MUTED = '#999', BORDER = '#E0D8C8'

export default function ConfirmPage() {
  const { token } = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const initial = searchParams.get('r') // 'si' o 'no'

  const [inv, setInv] = useState<Invitation | null>(null)
  const [service, setService] = useState<Service | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [status, setStatus] = useState<'confirmado'|'declinado'|null>(null)
  const [comentario, setComentario] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('invitations')
        .select('*, member:members(*), service:services(*)')
        .eq('token', token)
        .single()

      if (!data) { setNotFound(true); setLoading(false); return }
      setInv(data)
      setService(data.service as Service)
      setMember(data.member as Member)
      if (data.status !== 'pendiente') {
        setStatus(data.status)
        setComentario(data.comentario || '')
        setDone(true)
      } else if (initial === 'si') setStatus('confirmado')
      else if (initial === 'no') setStatus('declinado')
      setLoading(false)
    }
    load()
  }, [token, initial])

  async function submit() {
    if (!status || !inv) return
    setSaving(true)
    await supabase.from('invitations').update({
      status, comentario: comentario || null,
      responded_at: new Date().toISOString()
    }).eq('token', token)
    setDone(true)
    setSaving(false)
  }

  function fmt(fecha: string) {
    const d = new Date(fecha + 'T12:00:00')
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:BG}}>
      <div style={{color:MUTED,fontSize:14,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>Cargando...</div>
    </div>
  )

  if (notFound) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:BG,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      <div style={{background:CARD,borderRadius:16,padding:32,textAlign:'center',maxWidth:320,border:`0.5px solid ${BORDER}`}}>
        <p style={{fontSize:36,marginBottom:12}}>🤔</p>
        <h2 style={{fontWeight:700,color:DARK,marginBottom:8,fontSize:16}}>Link no válido</h2>
        <p style={{fontSize:13,color:MUTED}}>Este link de invitación no existe o ya expiró.</p>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:BG,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      <div style={{width:'100%',maxWidth:380}}>
        {/* Header */}
        <div style={{background:DARK,borderRadius:'16px 16px 0 0',padding:'24px 20px',textAlign:'center'}}>
          <img src="/logo-icon-cream.png" alt="Áncora" style={{height:36,width:'auto',objectFit:'contain',margin:'0 auto 8px'}}/>
          <p style={{color:'rgba(245,240,230,0.6)',fontSize:12,margin:0}}>Confirmación de asistencia</p>
        </div>

        <div style={{background:CARD,borderRadius:'0 0 16px 16px',padding:24,border:`0.5px solid ${BORDER}`,borderTop:'none'}}>
          <p style={{color:MUTED,fontSize:13,marginBottom:2}}>Hola,</p>
          <p style={{fontWeight:700,color:DARK,fontSize:18,marginBottom:2}}>{member?.nombre} {member?.apellido}</p>
          {service && <p style={{fontSize:13,color:MUTED,marginBottom:20}}>{fmt(service.fecha)}</p>}

          {done ? (
            <div style={{textAlign:'center',padding:'16px 0'}}>
              <p style={{fontSize:36,marginBottom:12}}>{status === 'confirmado' ? '🎉' : '😔'}</p>
              <p style={{fontWeight:700,color:DARK,marginBottom:4,fontSize:15}}>
                {status === 'confirmado' ? '¡Confirmado!' : 'Entendido'}
              </p>
              <p style={{fontSize:13,color:MUTED}}>
                {status === 'confirmado'
                  ? 'Quedaste anotado para el servicio. ¡Nos vemos!'
                  : 'Gracias por avisar. Ya le notificamos al equipo.'}
              </p>
              {comentario && (
                <div style={{marginTop:16,background:BG,borderRadius:10,padding:12,textAlign:'left',border:`0.5px solid ${BORDER}`}}>
                  <p style={{fontSize:11,color:MUTED,marginBottom:4}}>Tu comentario:</p>
                  <p style={{fontSize:13,color:'#555'}}>"{comentario}"</p>
                </div>
              )}
              {member?.id && (
                <a href={`/portal/member_${member.id}`}
                  style={{display:'block',marginTop:20,background:DARK,color:'#F5F0E6',padding:13,borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:14,textAlign:'center'}}>
                  Ir a mi portal →
                </a>
              )}
              <button onClick={() => setDone(false)}
                style={{marginTop:12,fontSize:12,color:MUTED,background:'none',border:'none',cursor:'pointer',textDecoration:'underline',fontFamily:'inherit'}}>
                Cambiar respuesta
              </button>
            </div>
          ) : (
            <div>
              {/* Toggle si/no */}
              <p style={{fontSize:13,color:'#555',marginBottom:10}}>¿Puedes asistir?</p>
              <div style={{display:'flex',gap:8,marginBottom:16}}>
                <button onClick={() => setStatus('confirmado')}
                  style={{
                    flex:1,padding:'12px 0',borderRadius:10,fontWeight:600,fontSize:13,fontFamily:'inherit',cursor:'pointer',transition:'all .15s',
                    background: status === 'confirmado' ? DARK : '#fff',
                    color: status === 'confirmado' ? '#F5F0E6' : '#555',
                    border: status === 'confirmado' ? `1px solid ${DARK}` : '1px solid #E5E5E5',
                  }}>
                  ✓ Sí, confirmo
                </button>
                <button onClick={() => setStatus('declinado')}
                  style={{
                    flex:1,padding:'12px 0',borderRadius:10,fontWeight:500,fontSize:13,fontFamily:'inherit',cursor:'pointer',transition:'all .15s',
                    background: status === 'declinado' ? '#FDECEC' : '#fff',
                    color: status === 'declinado' ? '#B91C1C' : '#555',
                    border: status === 'declinado' ? '1px solid #FCA5A5' : '1px solid #E5E5E5',
                  }}>
                  ✗ No puedo
                </button>
              </div>

              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,color:MUTED,marginBottom:4,display:'block'}}>Comentario (opcional)</label>
                <textarea
                  style={{width:'100%',resize:'none',height:80,fontSize:13,fontFamily:'inherit',border:'1px solid #E5E5E5',borderRadius:10,padding:10,color:DARK,boxSizing:'border-box'}}
                  placeholder={status === 'declinado' ? 'ej: Tengo otro compromiso ese día' : 'ej: Llego 15 min tarde'}
                  value={comentario}
                  onChange={e => setComentario(e.target.value)} />
              </div>

              <button onClick={submit} disabled={!status || saving}
                style={{
                  width:'100%',padding:13,borderRadius:10,border:'none',fontWeight:700,fontSize:14,fontFamily:'inherit',cursor: (!status||saving) ? 'default' : 'pointer',
                  background: DARK, color:'#F5F0E6', opacity: (!status||saving) ? 0.5 : 1,
                }}>
                {saving ? 'Guardando...' : 'Enviar respuesta'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
