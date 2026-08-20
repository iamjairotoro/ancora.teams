import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { serviceId, newFecha } = await req.json()

  // Get original service
  const { data: original } = await supabase
    .from('services').select('*').eq('id', serviceId).single()
  if (!original) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Create new service
  const d = new Date(newFecha + 'T12:00:00')
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const titulo = `Servicio Ancora — ${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`

  const { data: newSvc } = await supabase
    .from('services').insert({ fecha: newFecha, titulo }).select().single()
  if (!newSvc) return NextResponse.json({ error: 'Error creando servicio' }, { status: 500 })

  // Copy banda assignments
  const { data: banda } = await supabase
    .from('banda_assignments').select('*').eq('service_id', serviceId)
  if (banda?.length) {
    await supabase.from('banda_assignments').insert(
      banda.map(b => ({ service_id: newSvc.id, posicion: b.posicion, member_id: b.member_id }))
    )
  }

  // Copy setlist items
  const { data: setlist } = await supabase
    .from('setlist_items').select('*').eq('service_id', serviceId).order('orden')
  if (setlist?.length) {
    await supabase.from('setlist_items').insert(
      setlist.map(s => ({
        service_id: newSvc.id, orden: s.orden,
        song_id: s.song_id, tono: s.tono,
        lead_id: s.lead_id, link: s.link
      }))
    )
  }

  return NextResponse.json({ serviceId: newSvc.id })
}
