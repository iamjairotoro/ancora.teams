import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireOrgAdminDeLaSesion } from '@/lib/auth/authorize'
import { leerPorLotes } from '@/lib/admin/lotes'
import { HISTORIAL_MAXIMO, resumenServicios } from '@/lib/admin/resumenServicios'

export const dynamic = 'force-dynamic'

// Resumen de servicios por EQUIPO para la administración en teléfono (lista de Servicios y Home «Hoy»). SOLO LECTURA (solo GET) y SOLO CONTEOS Y ESTADOS: ni correos ni nombres ni ids de personas.
// La organización sale de la SESIÓN del administrador (requireOrgAdminDeLaSesion), nunca de un parámetro: esta ruta no lee la URL. Todo se lee con la llave de servicio, acotado a esa organización.
// Los próximos van completos; del historial, solo los últimos HISTORIAL_MAXIMO servicios. Las reglas (estado de la convocatoria, convocatoria cerrada, servicio terminado) son las compartidas.
const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  const auth = await requireOrgAdminDeLaSesion()
  if (!auth.ok) return auth.response
  const org = auth.organizationId
  try {
    const db = createAdminSupabase()
    const ahora = new Date()
    // «desde»: el día anterior alcanza para que entre lo que terminó hace poco (la partición exacta la hace resumenServicios con la hora real)
    const ayer = new Date(ahora.getTime() - 36 * 3600 * 1000).toISOString().slice(0, 10)
    const cols = 'id, fecha, titulo, hora_inicio, hora_fin, tipo, kind'
    const [recientes, pasados, equipos] = await Promise.all([
      db.from('services').select(cols).eq('organization_id', org).gte('fecha', ayer).order('fecha'),
      db.from('services').select(cols).eq('organization_id', org).lt('fecha', ayer).order('fecha', { ascending: false }).limit(HISTORIAL_MAXIMO),
      db.from('teams').select('id, name, color, sort_order, archived_at').eq('organization_id', org),
    ])
    if (recientes.error || pasados.error || equipos.error) throw new Error('lectura')
    const services = [...(recientes.data ?? []), ...(pasados.data ?? [])] as { id: string }[]
    const ids = services.map(s => s.id), teamIds = (equipos.data ?? []).map(t => t.id as string)
    const [invitations, assignments, slots, positions] = await Promise.all([
      leerPorLotes(ids, lote => db.from('invitations').select('service_id, member_id, team_id, status, declined_reason, sent_at').in('service_id', lote)),
      leerPorLotes(ids, lote => db.from('banda_assignments').select('service_id, team_position_id, member_id, slot_index').in('service_id', lote)),
      leerPorLotes(ids, lote => db.from('service_position_slots').select('service_id, team_position_id, slots_needed').in('service_id', lote)),
      leerPorLotes(teamIds, lote => db.from('team_positions').select('id, team_id').in('team_id', lote).is('archived_at', null)),
    ])
    const servicios = resumenServicios({ services: services as never, invitations: invitations as never, assignments: assignments as never, positions: positions as never, slots: slots as never, teams: (equipos.data ?? []) as never, ahora })
    return NextResponse.json({ servicios, generado: ahora.toISOString() }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el resumen' }, { status: 500, headers: NO_STORE })
  }
}
