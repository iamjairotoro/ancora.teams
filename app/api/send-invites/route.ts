import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToMember, isVapidReady } from '@/lib/push'
import { LABEL_TECNICA } from '@/lib/equipos'
import { requireOrgAdmin } from '@/lib/auth/authorize'
import { libraryAccessChecker } from '@/lib/auth/libraryAccess'
import { inviteSetlistTable } from '@/lib/emailSetlist'
import { enviarCorreo, limpiarMotivo } from '@/lib/email'
import { crearValidadorCorreo } from '@/lib/emailDominio'
import { CONCURRENCIA_ENVIO, enviarEnLote, procesarDestinatario } from '@/lib/convocatoria'
import { resumir, textoResumen, type EstadoPush, type RespuestaConvocatoria } from '@/lib/convocatoriaTypes'

// Envío con concurrencia limitada (5 a la vez): el tope de la función cubre convocatorias grandes.
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// El error de una petición (no de un destinatario) lleva su código HTTP real y viaja como {error}.
export async function POST(req: NextRequest) {
  try {
    return await convocar(req)
  } catch (e: any) {
    console.error('send-invites falló:', limpiarMotivo(e?.message || e))
    return NextResponse.json({ error: 'No se pudo completar el envío. Revisá el estado de las invitaciones antes de reintentar.' }, { status: 500 })
  }
}

async function convocar(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Petición inválida' }, { status: 400 }) }
  const { serviceId, force, teamPositionNames } = body

  const { data: service } = await supabase
    .from('services').select('*').eq('id', serviceId).single()
  if (!service) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })

  const auth = await requireOrgAdmin(service.organization_id)
  if (!auth.ok) return auth.response

  const { data: allAssignments } = await supabase
    .from('banda_assignments')
    .select('*, member:members(*)')
    .eq('service_id', serviceId)

  // teamPositionNames: si viene, esta convocatoria es de UN equipo puntual
  // (se manda desde su propia pestaña) — solo a quienes tienen una posición
  // de ese equipo. Sin esto, se manda a todos (uso interno/histórico).
  const assignments = Array.isArray(teamPositionNames) && teamPositionNames.length
    ? (allAssignments || []).filter((a: any) => teamPositionNames.includes(a.posicion))
    : allAssignments

  if (!assignments?.length)
    return NextResponse.json({ error: 'No hay músicos asignados' }, { status: 400 })

  // Quien no tiene correo cargado también entra: sale como «omitido» con su motivo (antes se descartaba sin decir nada).
  type MemberEntry = { member: { nombre: string; email: string | null; id: string }; posiciones: string[] }
  const allMembers: Record<string, MemberEntry> = {}
  for (const a of assignments) {
    if (!a.member) continue
    if (!allMembers[a.member_id]) {
      allMembers[a.member_id] = { member: a.member, posiciones: [] }
    }
    allMembers[a.member_id].posiciones.push(a.posicion)
  }

  // Por defecto, solo se manda a quienes aún no tienen invitación enviada
  // (evita re-notificar a todo el equipo cada vez que se agrega a alguien nuevo).
  // Con force:true se puede reenviar a todos igual (ej. botón "Reenviar a todos").
  let uniqueMembers = allMembers
  if (!force) {
    const { data: existing } = await supabase
      .from('invitations')
      .select('member_id')
      .eq('service_id', serviceId)
      .not('sent_at', 'is', null)
    const alreadyInvited = new Set((existing || []).map((e: any) => e.member_id))
    uniqueMembers = Object.fromEntries(
      Object.entries(allMembers).filter(([memberId]) => !alreadyInvited.has(memberId))
    )
  }

  if (!Object.keys(uniqueMembers).length) {
    const vacio: RespuestaConvocatoria = {
      message: 'No hay músicos nuevos por invitar — todos los convocados ya recibieron su invitación.',
      resumen: { enviados: 0, fallaron: 0, omitidos: 0 }, results: [],
    }
    return NextResponse.json(vacio)
  }

  const { data: setlist } = await supabase
    .from('setlist_items')
    .select('orden, tono, song:songs(nombre, artista), lead:members(nombre)')
    .eq('service_id', serviceId)
    .order('orden')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  const d = new Date(service.fecha + 'T12:00:00')
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const fechaFmt = `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`

  const hasLibrary = libraryAccessChecker()
  const validarCorreo = crearValidadorCorreo()

  // Publica la invitación de UNA persona (sent_at = «publicada para la persona»: Home, portal, conteo de convocados;
  // NO depende de que el correo salga bien) y arma su correo.
  async function preparar(memberId: string, member: MemberEntry['member'], posiciones: string[]) {
    const { error: upErr } = await supabase
      .from('invitations')
      .upsert({ service_id: serviceId, member_id: memberId, sent_at: new Date().toISOString() },
               { onConflict: 'service_id,member_id' })
    if (upErr) return { omitido: `No se pudo crear la invitación: ${limpiarMotivo(upErr.message)}` }

    const { data: fullInv } = await supabase
      .from('invitations').select('token').eq('service_id', serviceId).eq('member_id', memberId).single()

    if (!fullInv?.token) return { omitido: 'No se pudo leer la invitación recién creada (sin token).' }

    const confirmUrl = `${appUrl}/confirm/${fullInv.token}?r=si`
    const declineUrl = `${appUrl}/confirm/${fullInv.token}?r=no`

    // Punto 59: el tono del bloque solo va a quien tiene acceso a la biblioteca (por destinatario; si falla, sin tono).
    const setlistHtml = setlist?.length ? inviteSetlistTable(setlist as any[], await hasLibrary(memberId)) : ''

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;background:#F2F1EE;margin:0;padding:20px">
  <div style="max-width:520px;margin:0 auto">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:20px">
      <div style="display:inline-block;background:#1A1A1A;border-radius:12px;padding:12px 22px">
        <img src="${appUrl}/logo-icon-cream.png" alt="Áncora" width="56" style="display:block;height:auto"/>
      </div>
    </div>

    <!-- Card -->
    <div style="background:white;border-radius:16px;overflow:hidden;border:0.5px solid #D6D5D1">

      <!-- Header oscuro -->
      <div style="background:#1A1A1A;padding:20px 24px">
        <p style="color:rgba(245,240,230,0.55);margin:0 0 4px;font-size:11px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase">Invitación de servicio</p>
        <h2 style="color:#F5F0E6;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px">${fechaFmt}</h2>
      </div>

      <div style="padding:22px 24px">

        <!-- Saludo -->
        <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0 0 4px">Hola, ${member.nombre} 👋</p>
        <p style="font-size:13px;color:#999;margin:0 0 18px;font-weight:400">Te invitamos a servir este domingo en Áncora - Services.</p>

        <!-- Rol -->
        <div style="background:#F2F1EE;border-radius:10px;padding:12px 16px;margin-bottom:18px;border:0.5px solid #D6D5D1">
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999">Tu rol este domingo</p>
          <p style="margin:0;font-weight:700;color:#1A1A1A;font-size:16px">${posiciones.map(p=>LABEL_TECNICA[p]||p).join(' · ')}</p>
        </div>

        <!-- Setlist -->
        ${setlist?.length ? `
        <p style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;margin:0 0 10px">Setlist</p>
        ${setlistHtml}` : ''}

        <!-- RSVP -->
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

    return { subject: `📅 ${fechaFmt} — Invitación Áncora - Services`, html }
  }

  async function pushDe(memberId: string): Promise<EstadoPush> {
    if (!isVapidReady()) return 'no configurado'
    try {
      const r = await sendPushToMember(memberId, {
        title: '📅 Nueva nominación',
        body: `Te convocamos para el ${fechaFmt}`,
        url: '/portal',
        tag: `servicio-${serviceId}`,
      })
      if (!r.subs) return 'sin dispositivo'
      return r.delivered === r.subs ? 'enviado' : r.delivered > 0 ? 'parcial' : 'falló'
    } catch (e: any) {
      console.error(`Push notification failed for ${memberId}:`, limpiarMotivo(e?.message || e))
      return 'falló'
    }
  }

  const results = await enviarEnLote(Object.entries(uniqueMembers), CONCURRENCIA_ENVIO, ([memberId, { member, posiciones }]) =>
    procesarDestinatario({ memberId, nombre: member.nombre, email: member.email }, {
      preparar: () => preparar(memberId, member, posiciones),
      validar: validarCorreo,
      enviar: enviarCorreo,
      push: () => pushDe(memberId),
    }))

  const resumen = resumir(results)
  const respuesta: RespuestaConvocatoria = { message: textoResumen(resumen), resumen, results }
  return NextResponse.json(respuesta)
}
