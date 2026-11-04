// POST /api/lider/asignar — el líder asigna (o quita) a una persona en una posición de SU equipo en un servicio. El equipo sale de la POSICIÓN (team_positions.team_id), nunca del pedido.
// Escribe SOLO banda_assignments: service_id, team_position_id, slot_index, member_id (null = quitar). Valida: posición activa de un equipo que lidera, servicio de la organización con la convocatoria abierta,
// cupo existente y persona del equipo. No envía nada (los avisos son de quien administra).
import { NextRequest } from 'next/server'
import { cerrado, entrar, equipoDeLaPersona, esId, falloDeBase, listo, MAX_CUPOS, prohibido, puedeEnEquipo, rechazo, registrar, servicioDe } from '@/lib/lider/escritura'
import { ERRORES_LIDER as E } from '@/lib/textos/servicioLider'

export const dynamic = 'force-dynamic'
const CAMPOS = ['servicio', 'posicion', 'slot', 'persona'] as const

export async function POST(req: NextRequest) {
  const e = await entrar(req, CAMPOS); if ('fallo' in e) return e.fallo
  const { a, b } = e; const { admin } = a
  if (!esId(b.servicio) || !esId(b.posicion) || !Number.isInteger(b.slot) || b.slot < 1 || b.slot > MAX_CUPOS || !(b.persona === null || esId(b.persona))) return rechazo(400, E.pedido)

  const pos = await admin.from('team_positions').select('id, team_id, archived_at').eq('id', b.posicion).eq('organization_id', a.organizationId).maybeSingle()
  if (pos.error) return falloDeBase()
  const p = pos.data as any
  if (!p || !puedeEnEquipo(a, p.team_id)) return prohibido()
  const sv = await servicioDe(a, b.servicio)
  if (sv === 'error') return falloDeBase()
  if (!sv) return prohibido()
  if (p.archived_at) return rechazo(409, E.posicionArchivada)
  if (cerrado(sv)) return rechazo(409, E.convocatoriaCerrada)

  const c = await admin.from('service_position_slots').select('slots_needed').eq('service_id', sv.id).eq('team_position_id', p.id).maybeSingle()
  if (c.error) return falloDeBase()
  if (b.slot > Math.max(1, (c.data as any)?.slots_needed ?? 1)) return rechazo(400, E.pedido)
  if (b.persona !== null) {
    const m = await admin.from('team_members').select('id').eq('member_id', b.persona).eq('team_id', p.team_id).eq('organization_id', a.organizationId).maybeSingle()
    if (m.error) return falloDeBase()
    if (!m.data) return rechazo(409, E.personaNoEsDelEquipo)
  }
  const w = await admin.from('banda_assignments').upsert({ service_id: sv.id, team_position_id: p.id, member_id: b.persona, slot_index: b.slot }, { onConflict: 'service_id,team_position_id,slot_index' })
  if (w.error) return falloDeBase()
  registrar(a, 'asignar', { servicio: sv.id, equipo: p.team_id, posicion: p.id, slot: b.slot, persona: b.persona })
  return listo()
}
