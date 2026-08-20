import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { token, respuesta, comentario } = await req.json()
  const status = respuesta === 'si' ? 'confirmado' : 'declinado'

  // No dejar responder una convocatoria que el admin todavía no envió
  // explícitamente (aunque ya exista la fila en invitations) — sin esto,
  // alguien podría llamar este endpoint directo sin pasar por el botón.
  const { data: inv } = await supabase
    .from('invitations').select('sent_at').eq('token', token).single()
  if (!inv) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
  if (!inv.sent_at) return NextResponse.json({ error: 'Esta convocatoria aún no ha sido enviada' }, { status: 403 })

  const { error } = await supabase
    .from('invitations')
    .update({ status, comentario: comentario || null })
    .eq('token', token)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
