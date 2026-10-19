import { MSG } from '@/lib/textos/mensajes'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { ES_UUID } from '@/lib/auth/pertenencia'
import { esConvocableAEnsayo } from '@/lib/equipos'
import { sendPushToMember, isVapidReady } from '@/lib/push'
import { requireOrgAdmin } from '@/lib/auth/authorize'
import { enviarCorreo, limpiarMotivo } from '@/lib/email'
import { crearValidadorCorreo } from '@/lib/emailDominio'
import { CONCURRENCIA_ENVIO, crearGuardadorEstado, enviarEnLote, estadoDePush, procesarDestinatario } from '@/lib/convocatoria'
import { resumir, textoResumen, type EstadoPush, type RespuestaConvocatoria } from '@/lib/convocatoriaTypes'

// Envío con concurrencia limitada (5 a la vez), como send-invites (punto 61).
export const maxDuration = 60

// Mismo contrato que /api/send-invites: un resultado por destinatario, el código HTTP real en los errores de la petición
// y el estado del correo guardado aparte de sent_at. (Los ensayos están en pausa como funcionalidad; la ruta se arregló igual.)
export async function POST(req: NextRequest) {
  try {
    return await convocarEnsayo(req)
  } catch (e: any) {
    console.error('send-ensayo-invites falló:', limpiarMotivo(e?.message || e))
    return NextResponse.json({ error: 'No se pudo completar el envío. Revisá el estado de las invitaciones antes de reintentar.' }, { status: 500 })
  }
}

async function convocarEnsayo(req: NextRequest) {
  // Punto 50, paso 0a: llave de servicio; la seguridad la da `requireOrgAdmin` (administrador/owner de la organización del ensayo) antes de escribir o enviar,
  // y las personas convocables salen SOLO de esa organización (antes se leían todas las de la base).
  const supabase = createAdminSupabase()
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: MSG.peticionInvalida }, { status: 400 }) }
  // reintentarCorreoDe: id de UNA persona; reintenta solo su correo (no toca sent_at ni manda push).
  const { serviceId, memberIds, reintentarCorreoDe } = body
  const reintento: string | null = typeof reintentarCorreoDe === 'string' && reintentarCorreoDe ? reintentarCorreoDe : null
  if (typeof serviceId !== 'string' || !ES_UUID.test(serviceId)) return NextResponse.json({ error: 'Ensayo no válido' }, { status: 400 })

  const { data: ensayo } = await supabase
    .from('services').select('*').eq('id', serviceId).single()
  if (!ensayo) return NextResponse.json({ error: 'Ensayo no encontrado' }, { status: 404 })

  const auth = await requireOrgAdmin(ensayo.organization_id)
  if (!auth.ok) return auth.response

  const { data: allMembers } = await supabase.from('members').select('*').eq('organization_id', ensayo.organization_id)
  let members = (allMembers||[]).filter(m=>esConvocableAEnsayo(m.instrumentos))
  if (reintento) {
    members = members.filter(m=>m.id === reintento)
    if (!members.length) return NextResponse.json({ error: 'Esa persona no es convocable a este ensayo' }, { status: 404 })
    const { data: inv } = await supabase.from('invitations').select('token, sent_at')
      .eq('service_id', serviceId).eq('member_id', reintento).is('team_id', null).maybeSingle()
    if (!inv?.sent_at || !inv.token)
      return NextResponse.json({ error: 'Esa persona todavía no tiene la convocatoria publicada: usá «Enviar».' }, { status: 409 })
  } else if (Array.isArray(memberIds) && memberIds.length) {
    members = members.filter(m=>memberIds.includes(m.id))
  }
  if (!members?.length) return NextResponse.json({ error: 'No hay músicos de Banda/Voces seleccionados' }, { status: 400 })

  // Punto 59: este correo solo lleva nombre y artista de las canciones (nunca el tono del bloque): nada que omitir por destinatario.
  const { data: canciones } = await supabase
    .from('service_blocks')
    .select('orden, song:songs(nombre, artista)')
    .eq('service_id', serviceId).eq('tipo', 'cancion')
    .order('orden')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const d = new Date(ensayo.fecha + 'T12:00:00')
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const fechaFmt = `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`
  const horaFmt = `${(ensayo.hora_inicio||'').slice(0,5)} — ${(ensayo.hora_fin||'').slice(0,5)}`

  const validarCorreo = crearValidadorCorreo()
  const guardarEstado = crearGuardadorEstado(supabase, serviceId, 'send-ensayo-invites')

  // Publica la convocatoria de UNA persona (sent_at; NO depende de que el correo salga bien) y arma su correo.
  async function preparar(member: any) {
    // En un reintento la convocatoria ya está publicada: no se vuelve a escribir (sent_at no se toca).
    if (!reintento) {
      const { error: upErr } = await supabase
        .from('invitations')
        .upsert({ service_id: serviceId, member_id: member.id, team_id: null, sent_at: new Date().toISOString() },
                 { onConflict: 'service_id,member_id,team_id' })      // los ensayos no llevan equipo (team_id NULL); NULLS NOT DISTINCT los mantiene únicos
      if (upErr) return { omitido: `No se pudo crear la convocatoria: ${limpiarMotivo(upErr.message)}` }
    }

    const { data: fullInv } = await supabase
      .from('invitations').select('token').eq('service_id', serviceId).eq('member_id', member.id).is('team_id', null).single()

    if (!fullInv?.token) return { omitido: 'No se pudo leer la convocatoria recién creada (sin token).' }

    const confirmUrl = `${appUrl}/confirm/${fullInv.token}?r=si`
    const declineUrl = `${appUrl}/confirm/${fullInv.token}?r=no`

    const cancionesHtml = canciones?.length
      ? `<ul style="margin:0;padding-left:18px;font-size:13px;color:#1A1A1A">
          ${canciones.map((c: any) => `<li style="padding:3px 0">${c.song?.nombre || '—'}${c.song?.artista ? ` <span style="color:#999">— ${c.song.artista}</span>` : ''}</li>`).join('')}
        </ul>`
      : '<p style="color:#999;font-size:13px;margin:0">Aún no hay canciones para repasar.</p>'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;background:#F2F1EE;margin:0;padding:20px">
  <div style="max-width:520px;margin:0 auto">
    <div style="text-align:center;margin-bottom:20px">
      <div style="display:inline-block;background:#1A1A1A;border-radius:12px;padding:12px 22px">
        <img src="${appUrl}/logo-icon-cream.png" alt="Áncora" width="56" style="display:block;height:auto"/>
      </div>
    </div>
    <div style="background:white;border-radius:16px;overflow:hidden;border:0.5px solid rgba(0,0,0,0.1)">
      <div style="background:#1A1A1A;padding:20px 24px">
        <p style="color:#F0A93B;margin:0 0 4px;font-size:11px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase">Convocatoria de ensayo</p>
        <h2 style="color:#F5F0E6;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px">${fechaFmt}</h2>
      </div>
      <div style="padding:22px 24px">
        <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0 0 4px">Hola, ${member.nombre} 👋</p>
        <p style="font-size:13px;color:#999;margin:0 0 18px;font-weight:400">Te convocamos al ensayo de la banda. ${ensayo.titulo || ''}</p>
        <div style="background:#F2F1EE;border-radius:10px;padding:12px 16px;margin-bottom:18px;border:0.5px solid #D6D5D1">
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999">Horario</p>
          <p style="margin:0;font-weight:700;color:#1A1A1A;font-size:16px">${horaFmt}${ensayo.lugar ? ` · ${ensayo.lugar}` : ''}</p>
        </div>
        <p style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;margin:0 0 10px">Canciones a repasar</p>
        ${cancionesHtml}
        <p style="font-size:13px;color:#555;margin:22px 0 12px;font-weight:500">¿Puedes asistir?</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
          <tr>
            <td width="48%" style="padding-right:6px">
              <a href="${confirmUrl}" style="display:block;background:#1A1A1A;color:#F5F0E6;text-align:center;padding:13px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">✓ Confirmo</a>
            </td>
            <td width="4%"></td>
            <td width="48%" style="padding-left:6px">
              <a href="${declineUrl}" style="display:block;background:white;color:#B91C1C;text-align:center;padding:13px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;border:0.5px solid #FCA5A5">✗ No puedo</a>
            </td>
          </tr>
        </table>
        <p style="color:#BBB;font-size:11px;text-align:center;margin:0">También puedes responder desde tu portal en cualquier momento.</p>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#AAA;margin-top:16px">Áncora - Services · Mi espacio Áncora</p>
  </div>
</body>
</html>`

    return { subject: `🎸 Ensayo — ${fechaFmt}`, html }
  }

  async function pushDe(memberId: string): Promise<EstadoPush> {
    if (reintento) return 'no aplica'   // el reintento es solo del correo
    if (!isVapidReady()) return 'no configurado'
    try {
      return estadoDePush(await sendPushToMember(memberId, {
        title: '🎸 Convocatoria a ensayo',
        body: `${fechaFmt} · ${horaFmt}`,
        url: '/portal',
        tag: `ensayo-${serviceId}`,
      }))
    } catch (e: any) {
      console.error(`Push notification failed for ${memberId}:`, limpiarMotivo(e?.message || e))
      return 'falló'
    }
  }

  const results = await enviarEnLote(members, CONCURRENCIA_ENVIO, async member => {
    const r = await procesarDestinatario({ memberId: member.id, nombre: member.nombre, email: member.email }, {
      preparar: () => preparar(member),
      validar: validarCorreo,
      enviar: enviarCorreo,
      push: () => pushDe(member.id),
    })
    await guardarEstado(member.id, r)
    return r
  })

  const resumen = resumir(results)
  const respuesta: RespuestaConvocatoria = { message: textoResumen(resumen), resumen, results }
  return NextResponse.json(respuesta)
}
