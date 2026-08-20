import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  if (!memberId) return NextResponse.json({ error: 'memberId requerido' }, { status: 400 })

  const now = new Date().toISOString()

  const [memberRes, servicesRes] = await Promise.all([
    supabase.from('members').select('*').eq('id', memberId).single(),
    supabase.from('services').select('*').order('fecha', { ascending: true }),
  ])

  if (!memberRes.data) return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })

  const member = memberRes.data
  const allServices = servicesRes.data || []

  // Para cada servicio, buscar banda, invitación y setlist
  const services = await Promise.all(
    allServices.map(async (service: any) => {
      const [bandaRes, invRes, blocksRes] = await Promise.all([
        supabase.from('banda_assignments').select('*, member:members(nombre)').eq('service_id', service.id),
        supabase.from('invitations').select('*').eq('service_id', service.id).eq('member_id', memberId).single(),
        supabase.from('service_blocks').select('*, song:songs(*)').eq('service_id', service.id).order('orden'),
      ])

      const banda = bandaRes.data || []
      const posiciones = banda.filter((b: any) => b.member_id === memberId).map((b: any) => b.posicion)

      return {
        service,
        posiciones,
        invitation: invRes.data || null,
        banda,
        setlist: (blocksRes.data || []).map((b: any) => ({
          orden: b.orden,
          tipo: b.tipo,
          titulo: b.titulo,
          duracion_min: b.duracion_min,
          song: b.song,
          tono: b.tono,
          lead: null,
        })),
      }
    })
  )

  // Filtrar solo servicios futuros
  const futureServices = services.filter((s: any) => {
    const endTime = s.service.hora_fin
      ? s.service.fecha + 'T' + s.service.hora_fin
      : s.service.fecha + 'T14:00:00'
    return new Date(endTime) > new Date()
  })

  return NextResponse.json({ member, services: futureServices })
}
