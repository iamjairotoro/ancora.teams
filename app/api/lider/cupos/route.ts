// POST /api/lider/cupos — el líder cambia cuántas personas pide una posición de SU equipo en un servicio. El equipo sale de la POSICIÓN. Escribe SOLO service_position_slots.slots_needed (1 a MAX_CUPOS).
// No deja bajar de los cupos que ya tienen a alguien asignado: primero se quita a la persona.
import { NextRequest } from 'next/server'
import { cerrado, entrar, esId, falloDeBase, listo, MAX_CUPOS, prohibido, puedeEnEquipo, rechazo, registrar, servicioDe } from '@/lib/lider/escritura'
import { ERRORES_LIDER as E } from '@/lib/textos/servicioLider'

export const dynamic = 'force-dynamic'
const CAMPOS = ['servicio', 'posicion', 'cupos'] as const

export async function POST(req: NextRequest) {
  const e = await entrar(req, CAMPOS); if ('fallo' in e) return e.fallo
  const { a, b } = e; const { admin } = a
  if (!esId(b.servicio) || !esId(b.posicion) || !Number.isInteger(b.cupos) || b.cupos < 1 || b.cupos > MAX_CUPOS) return rechazo(400, E.pedido)
  const pos = await admin.from('team_positions').select('id, team_id, archived_at').eq('id', b.posicion).eq('organization_id', a.organizationId).maybeSingle()
  if (pos.error) return falloDeBase()
  const p = pos.data as any
  if (!p || !puedeEnEquipo(a, p.team_id)) return prohibido()
  const sv = await servicioDe(a, b.servicio)
  if (sv === 'error') return falloDeBase()
  if (!sv) return prohibido()
  if (p.archived_at) return rechazo(409, E.posicionArchivada)
  if (cerrado(sv)) return rechazo(409, E.convocatoriaCerrada)
  const asig = await admin.from('banda_assignments').select('slot_index, member_id').eq('service_id', sv.id).eq('team_position_id', p.id)
  if (asig.error) return falloDeBase()
  const ultimo = Math.max(0, ...((asig.data || []) as any[]).filter(x => x.member_id).map(x => x.slot_index ?? 1))
  if (b.cupos < ultimo) return rechazo(409, E.cuposInsuficientes)
  const w = await admin.from('service_position_slots').upsert({ service_id: sv.id, team_position_id: p.id, slots_needed: b.cupos }, { onConflict: 'service_id,team_position_id' })
  if (w.error) return falloDeBase()
  registrar(a, 'cupos', { servicio: sv.id, equipo: p.team_id, posicion: p.id, cupos: b.cupos })
  return listo()
}
