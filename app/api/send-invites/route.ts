import { CORREO } from '@/lib/textos/correo'
import { MSG } from '@/lib/textos/mensajes'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { ES_UUID } from '@/lib/auth/pertenencia'
import { sendPushToMember, isVapidReady } from '@/lib/push'
import { LABEL_TECNICA } from '@/lib/equipos'
import { requireOrgAdmin } from '@/lib/auth/authorize'
import { libraryAccessChecker } from '@/lib/auth/libraryAccess'
import { inviteSetlistTable } from '@/lib/emailSetlist'
import { enviarCorreo, limpiarMotivo } from '@/lib/email'
import { crearValidadorCorreo } from '@/lib/emailDominio'
import { CONCURRENCIA_ENVIO, crearGuardadorEstado, enviarEnLote, estadoDePush, procesarDestinatario } from '@/lib/convocatoria'
import { resumir, textoResumen, type EstadoPush, type RespuestaConvocatoria } from '@/lib/convocatoriaTypes'
import { etiquetaDePosicion, equipoDePosicion } from '@/lib/bandaPosicion'
import { escapeHtml } from '@/lib/htmlEscape'

// Envío con concurrencia limitada (5 a la vez): el tope de la función cubre convocatorias grandes.
export const maxDuration = 60

// El error de una petición (no de un destinatario) lleva su código HTTP real y viaja como {error}.
export async function POST(req: NextRequest) {
  try {
    return await convocar(req)
  } catch (e: any) {
    console.error('send-invites falló:', limpiarMotivo(e?.message || e))
    return NextResponse.json({ error: 'No se pudo completar el envío. Revisa el estado de las invitaciones antes de reintentar.' }, { status: 500 })
  }
}

async function convocar(req: NextRequest) {
  // Punto 50, paso 0a: llave de servicio (la política abierta de la base se va a cerrar). La seguridad la da `requireOrgAdmin` MÁS ABAJO, antes de
  // escribir o enviar nada: solo un administrador/owner de la organización DEL SERVICIO convoca, y todo lo que se lee o escribe sale de ese servicio.
  const supabase = createAdminSupabase()
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: MSG.peticionInvalida }, { status: 400 }) }
  // reintentarCorreoDe: id de UNA persona (con teamId: el equipo de esa convocatoria); reintenta solo su correo (no toca sent_at ni manda push). Sin él, es una convocatoria.
  const { serviceId, force, teamId, reintentarCorreoDe } = body
  const reintento: string | null = typeof reintentarCorreoDe === 'string' && reintentarCorreoDe ? reintentarCorreoDe : null
  if (typeof serviceId !== 'string' || !ES_UUID.test(serviceId)) return NextResponse.json({ error: MSG.servicioNoValido }, { status: 400 })

  const { data: service } = await supabase
    .from('services').select('*').eq('id', serviceId).single()
  if (!service) return NextResponse.json({ error: MSG.servicioNoEncontrado }, { status: 404 })

  const auth = await requireOrgAdmin(service.organization_id)
  if (!auth.ok) return auth.response

  const { data: allAssignments } = await supabase
    .from('banda_assignments')
    .select('*, member:members(*), team_position:team_positions(name, team_id)')
    .eq('service_id', serviceId)

  // teamId: si viene, esta convocatoria es de UN equipo puntual (se manda desde su propia pestaña) — solo a quienes tienen una posición de ese
  // equipo (la posición de cada asignación se resuelve por id: renombrarla no cambia nada). Sin esto, se manda a todos (uso interno/histórico).
  // Solo personas de la organización del servicio (un dato cruzado en la base no puede convocar a alguien de otra organización).
  const deLaOrg = (allAssignments || []).filter((a: any) => a.member?.organization_id === service.organization_id)
  const assignments = typeof teamId === 'string' && teamId
    ? deLaOrg.filter((a: any) => equipoDePosicion(a)?.teamId === teamId)
    : deLaOrg

  if (!assignments?.length)
    return NextResponse.json({ error: MSG.noHayMusicosAsignados }, { status: 400 })

  // Punto 52: UNA convocatoria por (persona, EQUIPO): varias posiciones del mismo equipo = un correo, un push, una aceptación; dos equipos = dos.
  // Quien no tiene correo cargado también entra: sale como «omitido» con su motivo. Una asignación heredada (sin id de posición) no pertenece a
  // ningún equipo: no se convoca a nadie por ella.
  type MemberEntry = { member: { nombre: string; email: string | null; id: string }; teamId: string; teamName: string; posiciones: string[] }
  const llave = (memberId: string, equipoId: string) => `${memberId}|${equipoId}`
  const allEntries: Record<string, MemberEntry> = {}
  for (const a of assignments) {
    if (!a.member) continue
    const eq = equipoDePosicion(a)
    if (!eq) continue
    const k = llave(a.member_id, eq.teamId)
    if (!allEntries[k]) allEntries[k] = { member: a.member, teamId: eq.teamId, teamName: eq.teamName, posiciones: [] }
    allEntries[k].posiciones.push(etiquetaDePosicion(a))
  }
  if (!Object.keys(allEntries).length)
    return NextResponse.json({ error: MSG.noHayMusicosAsignados }, { status: 400 })

  // Por defecto, solo se manda a quienes aún no tienen invitación enviada DE ESE EQUIPO
  // (evita re-notificar a todo el equipo cada vez que se agrega a alguien nuevo).
  // Con force:true se puede reenviar a todos igual (ej. botón "Reenviar a todos").
  let uniqueEntries = allEntries
  if (reintento) {
    if (typeof teamId !== 'string' || !teamId) return NextResponse.json({ error: 'Falta el equipo de la convocatoria' }, { status: 400 })
    const k = llave(reintento, teamId)
    if (!allEntries[k]) return NextResponse.json({ error: 'Esa persona no está asignada a este servicio en ese equipo' }, { status: 404 })
    const { data: inv } = await supabase.from('invitations').select('token, sent_at')
      .eq('service_id', serviceId).eq('member_id', reintento).eq('team_id', teamId).maybeSingle()
    if (!inv?.sent_at || !inv.token)
      return NextResponse.json({ error: 'Esa persona todavía no tiene la invitación publicada: usa «Notificar».' }, { status: 409 })
    uniqueEntries = { [k]: allEntries[k] }
  } else if (!force) {
    const { data: existing } = await supabase
      .from('invitations')
      .select('member_id, team_id')
      .eq('service_id', serviceId)
      .not('sent_at', 'is', null)
    const alreadyInvited = new Set((existing || []).filter((e: any) => e.team_id).map((e: any) => llave(e.member_id, e.team_id)))
    uniqueEntries = Object.fromEntries(Object.entries(allEntries).filter(([k]) => !alreadyInvited.has(k)))
  }

  if (!Object.keys(uniqueEntries).length) {
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
  async function preparar(memberId: string, entry: MemberEntry) {
    const { member, posiciones, teamId: equipoId, teamName } = entry
    // En un reintento la invitación ya está publicada: no se vuelve a escribir (sent_at no se toca).
    if (!reintento) {
      const { error: upErr } = await supabase
        .from('invitations')
        .upsert({ service_id: serviceId, member_id: memberId, team_id: equipoId, sent_at: new Date().toISOString() },
                 { onConflict: 'service_id,member_id,team_id' })
      if (upErr) { console.error('[send-invites] no se pudo crear la invitación:', limpiarMotivo(upErr.message)); return { omitido: CORREO.noSePudoCrearLaInvitacion } }
    }

    const { data: fullInv } = await supabase
      .from('invitations').select('token').eq('service_id', serviceId).eq('member_id', memberId).eq('team_id', equipoId).single()

    if (!fullInv?.token) { console.error('[send-invites] la invitación recién creada no trae token'); return { omitido: CORREO.noSePudoLeerLaInvitacion } }

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
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999">Tu rol este domingo${teamName ? ' · ' + escapeHtml(teamName) : ''}</p>
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

    return { subject: `📅 ${fechaFmt}${teamName ? ' — ' + teamName : ''} — Invitación Áncora - Services`, html }
  }

  async function pushDe(memberId: string, equipoId: string, teamName: string): Promise<EstadoPush> {
    if (reintento) return 'no aplica'   // el reintento es solo del correo
    if (!isVapidReady()) return 'no configurado'
    try {
      const r = await sendPushToMember(memberId, {
        title: '📅 Nueva nominación',
        body: `Te convocamos para el ${fechaFmt}${teamName ? ' · ' + teamName : ''}`,
        url: '/portal',
        tag: `servicio-${serviceId}-${equipoId}`,      // una notificación por equipo: no se pisan entre sí
      })
      return estadoDePush(r)
    } catch (e: any) {
      console.error(`Push notification failed for ${memberId}:`, limpiarMotivo(e?.message || e))
      return 'falló'
    }
  }

  // El resultado del correo se guarda APARTE de sent_at (migración 035); si falla el guardado, el envío sigue (ver el helper).
  const guardarEstado = crearGuardadorEstado(supabase, serviceId, 'send-invites')

  const results = await enviarEnLote(Object.values(uniqueEntries), CONCURRENCIA_ENVIO, async (entry) => {
    const memberId = entry.member.id
    const r = await procesarDestinatario({ memberId, teamId: entry.teamId, nombre: entry.member.nombre, email: entry.member.email }, {
      preparar: () => preparar(memberId, entry),
      validar: validarCorreo,
      enviar: enviarCorreo,
      push: () => pushDe(memberId, entry.teamId, entry.teamName),
    })
    await guardarEstado(memberId, r, entry.teamId)
    return r
  })

  const resumen = resumir(results)
  const respuesta: RespuestaConvocatoria = { message: textoResumen(resumen), resumen, results }
  return NextResponse.json(respuesta)
}
