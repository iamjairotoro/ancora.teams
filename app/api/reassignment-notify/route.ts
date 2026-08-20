import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToMember } from '@/lib/push'
import { LABEL_TECNICA } from '@/lib/equipos'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function sendEmail(to: string, subject: string, html: string) {
  const user = process.env.GMAIL_USER!
  const pass = process.env.GMAIL_APP_PASSWORD!
  const { createTransport } = await import('nodemailer')
  const transporter = createTransport({ service: 'gmail', auth: { user, pass } })
  await transporter.sendMail({ from: `Ancora Setlist <${user}>`, to, subject, html })
}

// Llamado manualmente desde el botón "Reinvitar" del admin — cuando un
// músico ya había confirmado un instrumento distinto al que tiene ahora.
export async function POST(req: NextRequest) {
  const { memberId, serviceId } = await req.json()
  if (!memberId || !serviceId) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const [{ data: member }, { data: service }, { data: posicionesRows }] = await Promise.all([
    supabase.from('members').select('*').eq('id', memberId).single(),
    supabase.from('services').select('*').eq('id', serviceId).single(),
    supabase.from('banda_assignments').select('posicion').eq('service_id', serviceId).eq('member_id', memberId),
  ])

  if (!member || !service) return NextResponse.json({ error: 'Músico o servicio no encontrado' }, { status: 404 })

  const posiciones = (posicionesRows || []).map((p: any) => p.posicion)
  if (!posiciones.length) return NextResponse.json({ error: 'Este músico ya no tiene ninguna posición asignada en este servicio' }, { status: 400 })

  const { data: updatedInv, error: updErr } = await supabase
    .from('invitations')
    .update({
      status: 'pendiente',
      confirmed_posiciones: null,
      needs_reassignment_confirm: false,
      comentario: null,
      responded_at: null,
      sent_at: new Date().toISOString(),
    })
    .eq('service_id', serviceId).eq('member_id', memberId)
    .select('token').single()

  if (updErr || !updatedInv?.token) return NextResponse.json({ error: updErr?.message || 'No se pudo reiniciar la invitación' }, { status: 500 })

  const { data: setlist } = await supabase
    .from('service_blocks')
    .select('orden, tono, song:songs(nombre, artista), lead:members(nombre)')
    .eq('service_id', serviceId).eq('tipo', 'cancion')
    .order('orden')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const d = new Date(service.fecha + 'T12:00:00')
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const fechaFmt = `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`

  const confirmUrl = `${appUrl}/confirm/${updatedInv.token}?r=si`
  const declineUrl = `${appUrl}/confirm/${updatedInv.token}?r=no`

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

    <div style="text-align:center;margin-bottom:20px">
      <div style="display:inline-block;background:#1A1A1A;border-radius:12px;padding:12px 22px">
        <img src="${appUrl}/logo-icon-cream.png" alt="Áncora" width="56" style="display:block;height:auto"/>
      </div>
    </div>

    <div style="background:white;border-radius:16px;overflow:hidden;border:0.5px solid #D6D5D1">
      <div style="background:#1A1A1A;padding:20px 24px">
        <p style="color:rgba(245,240,230,0.55);margin:0 0 4px;font-size:11px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase">Cambio en tu convocatoria</p>
        <h2 style="color:#F5F0E6;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px">${fechaFmt}</h2>
      </div>

      <div style="padding:22px 24px">
        <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0 0 4px">Hola, ${member.nombre} 👋</p>
        <p style="font-size:13px;color:#999;margin:0 0 18px;font-weight:400">Tu rol para este servicio cambió — confírmalo de nuevo cuando puedas.</p>

        <div style="background:#F2F1EE;border-radius:10px;padding:12px 16px;margin-bottom:18px;border:0.5px solid #D6D5D1">
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999">Tu rol este domingo</p>
          <p style="margin:0;font-weight:700;color:#1A1A1A;font-size:16px">${posiciones.map((p: string) => LABEL_TECNICA[p] || p).join(' · ')}</p>
        </div>

        ${setlist?.length ? `
        <p style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;margin:0 0 10px">Setlist</p>
        ${setlistHtml}` : ''}

        <p style="font-size:13px;color:#555;margin:22px 0 12px;font-weight:500">¿Puedes asistir con este nuevo rol?</p>
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

  let emailSent = false
  let emailError = ''
  try {
    await sendEmail(member.email, `🔄 Cambio en tu convocatoria — ${fechaFmt}`, html)
    emailSent = true
  } catch (e: any) {
    emailError = e?.message || String(e)
  }

  try {
    await sendPushToMember(memberId, {
      title: '🔄 Cambio en tu convocatoria',
      body: `Tu rol cambió para el ${fechaFmt} — confirma de nuevo`,
      url: '/portal',
      tag: `reasignacion-${serviceId}`,
    })
  } catch (e: any) {
    console.error(`Push de reasignación falló para ${member.nombre}:`, e?.message || e)
  }

  if (!emailSent) return NextResponse.json({ message: `Se reinició la invitación, pero el email falló: ${emailError}` })
  return NextResponse.json({ message: `✓ Se reinvitó a ${member.nombre}` })
}
