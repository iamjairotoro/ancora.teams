import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { esConvocableAEnsayo } from '@/lib/equipos'
import { sendPushToMember } from '@/lib/push'
import { requireOrgAdmin } from '@/lib/auth/authorize'

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

export async function POST(req: NextRequest) {
  const { serviceId, memberIds } = await req.json()

  const { data: ensayo } = await supabase
    .from('services').select('*').eq('id', serviceId).single()
  if (!ensayo) return NextResponse.json({ error: 'Ensayo no encontrado' }, { status: 404 })

  const auth = await requireOrgAdmin(ensayo.organization_id)
  if (!auth.ok) return auth.response

  const { data: allMembers } = await supabase.from('members').select('*')
  let members = (allMembers||[]).filter(m=>esConvocableAEnsayo(m.instrumentos))
  if (Array.isArray(memberIds) && memberIds.length) {
    members = members.filter(m=>memberIds.includes(m.id))
  }
  if (!members?.length) return NextResponse.json({ error: 'No hay músicos de Banda/Voces seleccionados' }, { status: 400 })

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

  let sent = 0
  const errors: string[] = []

  for (const member of members) {
    if (!member.email) continue

    await supabase
      .from('invitations')
      .upsert({ service_id: serviceId, member_id: member.id, sent_at: new Date().toISOString() },
               { onConflict: 'service_id,member_id' })

    const { data: fullInv } = await supabase
      .from('invitations').select('token').eq('service_id', serviceId).eq('member_id', member.id).single()

    if (!fullInv?.token) continue

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

    try {
      await sendEmail(member.email, `🎸 Ensayo — ${fechaFmt}`, html)
      sent++
    } catch (e: any) {
      errors.push(`${member.nombre}: ${e.message}`)
    }

    try {
      await sendPushToMember(member.id, {
        title: '🎸 Convocatoria a ensayo',
        body: `${fechaFmt} · ${horaFmt}`,
        url: '/portal',
        tag: `ensayo-${serviceId}`,
      })
    } catch (e: any) {
      console.error(`Push notification failed for ${member.nombre}:`, e?.message || e)
    }
  }

  if (errors.length) {
    return NextResponse.json({ message: `${sent} enviado(s). Errores: ${errors.join(', ')}` })
  }
  return NextResponse.json({ message: `✓ ${sent} convocatoria(s) enviada(s)` })
}
