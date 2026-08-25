import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToMember } from '@/lib/push'
import { LABEL_TECNICA } from '@/lib/equipos'
import { requireOrgAdmin } from '@/lib/auth/authorize'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function sendEmail(to: string, subject: string, html: string) {
  const user = process.env.GMAIL_USER!
  const pass = process.env.GMAIL_APP_PASSWORD!

  // Use Gmail SMTP via fetch to smtp2go or direct nodemailer-style
  // We'll use the Gmail API via raw SMTP through a simple approach
  const { createTransport } = await import('nodemailer')
  const transporter = createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
  await transporter.sendMail({
    from: `Ancora Setlist <${user}>`,
    to,
    subject,
    html,
  })
}

export async function POST(req: NextRequest) {
  const { serviceId, force } = await req.json()

  const { data: service } = await supabase
    .from('services').select('*').eq('id', serviceId).single()
  if (!service) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })

  const auth = await requireOrgAdmin(service.organization_id)
  if (!auth.ok) return auth.response

  const { data: assignments } = await supabase
    .from('banda_assignments')
    .select('*, member:members(*)')
    .eq('service_id', serviceId)

  if (!assignments?.length)
    return NextResponse.json({ error: 'No hay músicos asignados' }, { status: 400 })

  type MemberEntry = { member: { nombre: string; email: string; id: string }; posiciones: string[] }
  const allMembers: Record<string, MemberEntry> = {}
  for (const a of assignments) {
    if (!a.member?.email) continue
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

  if (!Object.keys(uniqueMembers).length)
    return NextResponse.json({ message: 'No hay músicos nuevos por invitar — todos los convocados ya recibieron su invitación.' })

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

  let sent = 0
  const errors: string[] = []

  for (const [memberId, { member, posiciones }] of Object.entries(uniqueMembers)) {
    await supabase
      .from('invitations')
      .upsert({ service_id: serviceId, member_id: memberId, sent_at: new Date().toISOString() },
               { onConflict: 'service_id,member_id' })

    const { data: fullInv } = await supabase
      .from('invitations').select('token').eq('service_id', serviceId).eq('member_id', memberId).single()

    if (!fullInv?.token) continue

    const confirmUrl = `${appUrl}/confirm/${fullInv.token}?r=si`
    const declineUrl = `${appUrl}/confirm/${fullInv.token}?r=no`

    const setlistHtml = setlist?.length
      ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
          <tr style="background:#1A1A1A;color:#F5F0E6">
            <th style="padding:8px;text-align:left">#</th>
            <th style="padding:8px;text-align:left">Canción</th>
            <th style="padding:8px;text-align:left">Tono</th>
            <th style="padding:8px;text-align:left">Lead</th>
          </tr>
          ${setlist.map((item: any) => `
            <tr style="border-bottom:1px solid #E4E3DF">
              <td style="padding:8px;color:#888">${item.orden}</td>
              <td style="padding:8px;font-weight:500">${(item.song as any)?.nombre || '—'}</td>
              <td style="padding:8px;color:#888">${item.tono || '—'}</td>
              <td style="padding:8px">${(item.lead as any)?.nombre || '—'}</td>
            </tr>`).join('')}
        </table>`
      : ''

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

    try {
      await sendEmail(member.email, `📅 ${fechaFmt} — Invitación Áncora - Services`, html)
      sent++
    } catch (e: any) {
      errors.push(`${member.nombre}: ${e.message}`)
    }

    try {
      await sendPushToMember(memberId, {
        title: '📅 Nueva nominación',
        body: `Te convocamos para el ${fechaFmt}`,
        url: '/portal',
        tag: `servicio-${serviceId}`,
      })
    } catch (e: any) {
      console.error(`Push notification failed for ${member.nombre}:`, e?.message || e)
    }
  }

  if (errors.length) {
    return NextResponse.json({ message: `${sent} enviado(s). Errores: ${errors.join(', ')}` })
  }
  return NextResponse.json({ message: `✓ ${sent} invitación(es) enviada(s)` })
}
