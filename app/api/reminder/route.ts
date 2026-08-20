import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createTransport } from 'nodemailer'
import { sendPushToMember } from '@/lib/push'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function sendEmail(to: string, subject: string, html: string) {
  const transporter = createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD! },
  })
  await transporter.sendMail({
    from: `Ancora Setlist <${process.env.GMAIL_USER}>`,
    to, subject, html,
  })
}

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function fmtFecha(fecha: string) {
  const d = new Date(fecha + 'T12:00:00')
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

// Called daily by a cron job (Vercel cron or external)
export async function GET(req: NextRequest) {
  let sent = 0

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
      .select('posicion, member:members(nombre)')
      .eq('service_id', service.id)

    const { data: setlist } = await supabase
      .from('setlist_items')
      .select('orden, tono, song:songs(nombre), lead:members(nombre)')
      .eq('service_id', service.id)
      .order('orden')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const fechaFmt = fmtFecha(service.fecha)

    const bandaHtml = banda?.map((b: any) =>
      `<tr><td style="padding:6px 8px;color:#888;font-size:13px">${b.posicion}</td><td style="padding:6px 8px;font-size:13px">${b.member?.nombre || '—'}</td></tr>`
    ).join('') || ''

    const setlistHtml = setlist?.map((s: any) =>
      `<tr style="border-bottom:1px solid #eee">
        <td style="padding:6px 8px;color:#888;font-size:13px">${s.orden}</td>
        <td style="padding:6px 8px;font-size:13px;font-weight:500">${s.song?.nombre || '—'}</td>
        <td style="padding:6px 8px;font-size:13px;color:#888">${s.tono || '—'}</td>
        <td style="padding:6px 8px;font-size:13px">${s.lead?.nombre || '—'}</td>
      </tr>`
    ).join('') || ''

    for (const inv of invitations) {
      const member = inv.member as any
      if (!member?.email) continue

      const portalUrl = `${appUrl}/portal/${inv.token}`

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
        <tr style="background:#1F2A44;color:white">
          <th style="padding:7px 8px;text-align:left;font-size:12px">#</th>
          <th style="padding:7px 8px;text-align:left;font-size:12px">Canción</th>
          <th style="padding:7px 8px;text-align:left;font-size:12px">Tono</th>
          <th style="padding:7px 8px;text-align:left;font-size:12px">Lead</th>
        </tr>
        ${setlistHtml}
      </table>

      <a href="${portalUrl}" style="display:block;background:#C9A14A;color:white;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Ver mi portal completo →
      </a>
    </div>
  </div>
</body></html>`

      try {
        await sendEmail(member.email, `⏰ Recordatorio — Servicio Ancora mañana ${fechaFmt}`, html)
        sent++
      } catch (e) { console.error(e) }

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
    .select('*, member:members(*), service:services(*)')
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
      <p style="color:#555;font-size:14px">Te convocamos para el servicio del <b>${fechaFmt}</b> y todavía no nos cuentas si puedes.</p>
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

      try {
        await sendEmail(member.email, `🔔 ¿Puedes el ${fechaFmt}?`, html)
      } catch (e) { console.error(e) }
    }

    try {
      await sendPushToMember(inv.member_id, {
        title: '🔔 ¿Puedes este servicio?',
        body: `Aún no confirmas tu convocatoria del ${fechaFmt} — responde cuando puedas`,
        url: '/portal',
        tag: `pendiente-${service.id}`,
      })
    } catch (e: any) {
      console.error(`Push de recordatorio pendiente falló para ${member?.nombre}:`, e?.message || e)
    }

    await supabase.from('invitations').update({ last_reminder_at: new Date().toISOString() }).eq('id', inv.id)
    remindersSent++
  }

  return NextResponse.json({ message: `${sent} recordatorio(s) de servicio, ${remindersSent} recordatorio(s) de aceptación pendiente` })
}
