import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarCorreo } from '@/lib/email'
import { sendPushToMember } from '@/lib/push'
import { requireCronSecret } from '@/lib/auth/cronAuth'
import { libraryAccessChecker } from '@/lib/auth/libraryAccess'
import { reminderSetlist } from '@/lib/emailSetlist'
import { etiquetaDePosicion } from '@/lib/bandaPosicion'
import { escapeHtml } from '@/lib/htmlEscape'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function fmtFecha(fecha: string) {
  const d = new Date(fecha + 'T12:00:00')
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

// Lo invoca el cron de Vercel (vercel.json) y SOLO con `Authorization: Bearer <CRON_SECRET>`:
// sin la cabecera correcta, o sin CRON_SECRET definida (salvo en `next dev`), responde 401
// y no envía nada. Ver lib/auth/cronAuth.ts.
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req)
  if (denied) return denied
  const hasLibrary = libraryAccessChecker()
  let sent = 0
  let correosFallidos = 0

  // ── Recordatorio 24hrs antes (email + push) — solo confirmados ──
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const fechaTomorrow = tomorrow.toISOString().split('T')[0]

  const { data: services } = await supabase
    .from('services').select('*').eq('fecha', fechaTomorrow)

  for (const service of services || []) {
    // Get confirmed invitations
    const { data: invitations } = await supabase
      .from('invitations')
      .select('*, member:members(*)')
      .eq('service_id', service.id)
      .eq('status', 'confirmado')

    if (!invitations?.length) continue

    // Get full service info
    const { data: banda } = await supabase
      .from('banda_assignments')
      .select('posicion, team_position:team_positions(name), member:members(nombre)')
      .eq('service_id', service.id)

    const { data: setlist } = await supabase
      .from('setlist_items')
      .select('orden, tono, song:songs(nombre), lead:members(nombre)')
      .eq('service_id', service.id)
      .order('orden')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const fechaFmt = fmtFecha(service.fecha)

    const bandaHtml = banda?.map((b: any) =>
      `<tr><td style="padding:6px 8px;color:#888;font-size:13px">${etiquetaDePosicion(b)}</td><td style="padding:6px 8px;font-size:13px">${b.member?.nombre || '—'}</td></tr>`
    ).join('') || ''

    // Punto 59: el tono del bloque solo va a quien tiene acceso a la biblioteca; se arma por destinatario (más abajo).

    // Punto 52: puede haber una convocatoria confirmada por equipo; el recordatorio del servicio es UNO por persona.
    const yaRecordados = new Set<string>()
    for (const inv of invitations) {
      const member = inv.member as any
      if (yaRecordados.has(inv.member_id)) continue
      yaRecordados.add(inv.member_id)
      if (!member?.email) continue

      const portalUrl = `${appUrl}/portal/${inv.token}`
      const { head: setlistHead, rows: setlistHtml } = reminderSetlist((setlist || []) as any[], await hasLibrary(inv.member_id))

      const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1F2A44;padding:24px 28px">
      <h1 style="color:#C9A14A;margin:0;font-size:20px">Ancora</h1>
      <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Recordatorio — mañana es el servicio</p>
    </div>
    <div style="padding:28px">
      <h2 style="color:#1F2A44;margin:0 0 8px;font-size:18px">Hola, ${member.nombre} 👋</h2>
      <p style="color:#555;font-size:14px">Te recordamos que mañana es el servicio:</p>
      <p style="color:#1F2A44;font-weight:700;font-size:17px;margin:8px 0 20px">${fechaFmt}</p>

      <p style="font-size:13px;font-weight:600;color:#1F2A44;margin:0 0 8px">🎸 Banda del día:</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;background:#f8f8f8;border-radius:8px">
        ${bandaHtml}
      </table>

      <p style="font-size:13px;font-weight:600;color:#1F2A44;margin:0 0 8px">📋 Setlist:</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        ${setlistHead}
        ${setlistHtml}
      </table>

      <a href="${portalUrl}" style="display:block;background:#C9A14A;color:white;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Ver mi portal completo →
      </a>
    </div>
  </div>
</body></html>`

      const envio = await enviarCorreo({ to: member.email, subject: `⏰ Recordatorio — Servicio Ancora mañana ${fechaFmt}`, html })
      if (envio.ok) sent++
      else { correosFallidos++; console.error(`Recordatorio: correo no enviado a ${member.nombre}: ${envio.motivo}`) }

      try {
        await sendPushToMember(inv.member_id, {
          title: '⏰ Recordatorio',
          body: `Mañana es tu servicio — ${fechaFmt}`,
          url: '/portal',
          tag: `recordatorio-${service.id}`,
        })
      } catch (e: any) {
        console.error(`Push de recordatorio falló para ${member.nombre}:`, e?.message || e)
      }
    }
  }

  // ── Punto 5: recordatorio de aceptación pendiente, cada 24hrs hasta que
  // acepte o decline (deja de aparecer en este query en cuanto cambia de
  // 'pendiente' a otro estado — no hace falta lógica extra para detenerlo) ──
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const todayStr = new Date().toISOString().split('T')[0]
  const now = Date.now()

  const { data: pendientes } = await supabase
    .from('invitations')
    .select('*, member:members(*), service:services(*), team:teams(name)')
    .eq('status', 'pendiente')
    .not('sent_at', 'is', null)

  let remindersSent = 0
  for (const inv of pendientes || []) {
    const member = inv.member as any
    const service = inv.service as any
    if (!service || service.fecha < todayStr) continue // servicio ya pasó

    if (inv.last_reminder_at) {
      const elapsedHrs = (now - new Date(inv.last_reminder_at).getTime()) / (1000 * 60 * 60)
      if (elapsedHrs < 23) continue // aún no toca — se manda cada ~24hrs
    }

    const fechaFmt = fmtFecha(service.fecha)
    const portalUrl = `${appUrl}/portal/${inv.token}`
    // Punto 52: una convocatoria por EQUIPO; el recordatorio dice de cuál es (los ensayos no llevan equipo).
    const teamName = ((Array.isArray(inv.team) ? inv.team[0]?.name : (inv.team as any)?.name) as string | undefined) || ''

    if (member?.email) {
      const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1F2A44;padding:24px 28px">
      <h1 style="color:#C9A14A;margin:0;font-size:20px">Ancora</h1>
      <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Aún no respondes tu convocatoria</p>
    </div>
    <div style="padding:28px">
      <h2 style="color:#1F2A44;margin:0 0 8px;font-size:18px">Hola, ${member.nombre} 👋</h2>
      <p style="color:#555;font-size:14px">Te convocamos para el servicio del <b>${fechaFmt}</b>${teamName ? ` en el equipo <b>${escapeHtml(teamName)}</b>` : ''} y todavía no nos cuentas si puedes.</p>
      <p style="color:#555;font-size:14px">Responde cuando puedas para que el equipo pueda organizarse a tiempo.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">
        <tr>
          <td width="48%" style="padding-right:6px">
            <a href="${appUrl}/confirm/${inv.token}?r=si" style="display:block;background:#1A1A1A;color:#F5F0E6;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">✓ Confirmo</a>
          </td>
          <td width="4%"></td>
          <td width="48%" style="padding-left:6px">
            <a href="${appUrl}/confirm/${inv.token}?r=no" style="display:block;background:white;color:#B91C1C;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;border:0.5px solid #FCA5A5">✗ No puedo</a>
          </td>
        </tr>
      </table>
      <a href="${portalUrl}" style="display:block;background:#C9A14A;color:white;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Ver mi portal completo →
      </a>
    </div>
  </div>
</body></html>`

      const envio = await enviarCorreo({ to: member.email, subject: `🔔 ¿Puedes el ${fechaFmt}?${teamName ? ' · ' + teamName : ''}`, html })
      if (!envio.ok) { correosFallidos++; console.error(`Recordatorio pendiente: correo no enviado a ${member.nombre}: ${envio.motivo}`) }
    }

    try {
      await sendPushToMember(inv.member_id, {
        title: '🔔 ¿Puedes este servicio?',
        body: `Aún no confirmas tu convocatoria del ${fechaFmt}${teamName ? ' en ' + teamName : ''} — responde cuando puedas`,
        url: '/portal',
        tag: `pendiente-${service.id}-${inv.team_id ?? 'ensayo'}`,
      })
    } catch (e: any) {
      console.error(`Push de recordatorio pendiente falló para ${member?.nombre}:`, e?.message || e)
    }

    await supabase.from('invitations').update({ last_reminder_at: new Date().toISOString() }).eq('id', inv.id)
    remindersSent++
  }

  return NextResponse.json({ message: `${sent} recordatorio(s) de servicio, ${remindersSent} recordatorio(s) de aceptación pendiente${correosFallidos ? `, ${correosFallidos} correo(s) no enviado(s) (ver el log)` : ''}` })
}
