import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function sendEmail(to: string, subject: string, html: string) {
  const { createTransport } = await import('nodemailer')
  const transporter = createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD! },
  })
  await transporter.sendMail({
    from: `Ancora - Services <${process.env.GMAIL_USER}>`,
    to, subject, html,
  })
}

// GET — disponibilidad de todos los miembros para un conjunto de servicios
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const serviceIds = searchParams.get('serviceIds')?.split(',') || []

  const [membersRes, availRes] = await Promise.all([
    supabase.from('members').select('id,nombre,apellido,instrumentos').order('nombre'),
    supabase.from('availability').select('*').in('service_id', serviceIds),
  ])

  return NextResponse.json({
    members: membersRes.data || [],
    availability: availRes.data || [],
  })
}

// POST — toggle disponibilidad de un miembro para un servicio
export async function POST(req: NextRequest) {
  const body = await req.json()

  // Modo: toggle de disponibilidad
  if (body.action === 'toggle') {
    const { member_id, service_id, status } = body
    const { data, error } = await supabase
      .from('availability')
      .upsert({ member_id, service_id, status, updated_at: new Date().toISOString() },
               { onConflict: 'member_id,service_id' })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ availability: data })
  }

  // Modo: enviar email de consulta de disponibilidad
  if (body.action === 'send-availability-email') {
    const { serviceIds } = body

    const { data: services } = await supabase
      .from('services').select('*').in('id', serviceIds).order('fecha')
    const { data: members } = await supabase
      .from('members').select('*').order('nombre')
    const { data: invitations } = await supabase
      .from('invitations').select('token,member_id,service_id')

    if (!services?.length || !members?.length)
      return NextResponse.json({ error: 'Sin datos' }, { status: 400 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    const fmtFecha = (fecha: string) => {
      const d = new Date(fecha + 'T12:00:00')
      const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
      const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
      return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`
    }

    let sent = 0
    const errors: string[] = []

    for (const member of members) {
      if (!member.email) continue

      // Buscar un token de invitación existente para este miembro (cualquier servicio reciente)
      const inv = invitations?.find(i => i.member_id === member.id)
      const portalToken = inv?.token

      if (!portalToken) continue // sin token no podemos enviar

      const portalUrl = `${appUrl}/portal/${portalToken}`

      const serviciosHtml = services.map(s => `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #E4E3DF;font-size:14px;font-weight:500;color:#1A1A1A">${fmtFecha(s.fecha)}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #E4E3DF;text-align:center">
            <span style="font-size:12px;color:#999">Indicar en el portal →</span>
          </td>
        </tr>
      `).join('')

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;background:#F2F1EE;margin:0;padding:20px">
  <div style="max-width:520px;margin:0 auto">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:20px">
      <div style="display:inline-block;background:#1A1A1A;border-radius:12px;padding:12px 20px">
        <img src="${appUrl}/logo-icon-cream.png" alt="Áncora" width="52" style="display:block;height:auto"/>
      </div>
    </div>

    <!-- Card -->
    <div style="background:white;border-radius:16px;overflow:hidden;border:0.5px solid #D6D5D1">
      <div style="background:#1A1A1A;padding:20px 24px">
        <h2 style="color:#F5F0E6;margin:0;font-size:17px;font-weight:600">📅 Consulta de disponibilidad</h2>
        <p style="color:rgba(245,240,230,0.6);margin:4px 0 0;font-size:13px">Hola, ${member.nombre} — necesitamos saber cuándo puedes servir</p>
      </div>

      <div style="padding:20px 24px">
        <p style="font-size:14px;color:#555;margin:0 0 16px">Estos son los próximos servicios del mes. Por favor indica tu disponibilidad desde tu portal:</p>

        <table style="width:100%;border-collapse:collapse;border:0.5px solid #D6D5D1;border-radius:10px;overflow:hidden;margin-bottom:20px">
          <thead>
            <tr style="background:#F2F1EE">
              <th style="padding:8px 16px;text-align:left;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#999">Fecha</th>
              <th style="padding:8px 16px;text-align:center;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#999">Estado</th>
            </tr>
          </thead>
          <tbody>${serviciosHtml}</tbody>
        </table>

        <a href="${portalUrl}" style="display:block;background:#1A1A1A;color:#F5F0E6;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:16px">
          📅 Ir a Mis domingos
        </a>

        <p style="font-size:11px;color:#BBB;text-align:center;margin:0">En el portal puedes marcar ✓ disponible o ✗ no puedo para cada domingo</p>
      </div>
    </div>

    <p style="text-align:center;font-size:11px;color:#AAA;margin-top:16px">Ancora - Services · Mi espacio Áncora</p>
  </div>
</body>
</html>`

      try {
        await sendEmail(member.email, `📅 Disponibilidad julio — Ancora - Services`, html)
        sent++
      } catch (e: any) {
        errors.push(`${member.nombre}: ${e.message}`)
      }
    }

    return NextResponse.json({
      message: errors.length
        ? `${sent} enviado(s). Errores: ${errors.join(', ')}`
        : `✓ Consulta enviada a ${sent} músico(s)`
    })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
