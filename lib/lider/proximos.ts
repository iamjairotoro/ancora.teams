// «Servicios próximos» de una persona en UN equipo: lo que impide quitarla del equipo (/api/lider/equipo, acción «quitar»). Cuenta como próximo un servicio de la organización con la convocatoria ABIERTA (lib/convocatoriaCerrada.ts:
// no ha pasado el día del servicio en hora de Chile) donde la persona tiene una asignación en una posición de ESE equipo o una convocatoria de ESE equipo. El equipo sale de la fila del integrante, nunca del pedido; lo de otros
// equipos, lo de otras organizaciones y lo pasado no cuenta. Solo LEE.
import { convocatoriaCerrada, hoyEnSantiago } from '@/lib/convocatoriaCerrada'
import { fechaCorta } from '@/lib/admin/servicioMovil'
import { contar } from '@/lib/textos/plural'
import { tituloSinFecha } from '@/lib/lider/servicioLider'

export interface ProximosDe { asignaciones: number; convocatorias: number; servicios: { id: string; fecha: string; titulo: string }[] }
const MAX_EN_MENSAJE = 5

export async function proximosDe(admin: any, organizationId: string, memberId: string, teamId: string): Promise<ProximosDe | 'error'> {
  const sv = await admin.from('services').select('id, fecha, titulo').eq('organization_id', organizationId).gte('fecha', hoyEnSantiago()).order('fecha', { ascending: true })
  if (sv.error) return 'error'
  const abiertos = ((sv.data || []) as any[]).filter(s => !convocatoriaCerrada(s.fecha))
  const vacio: ProximosDe = { asignaciones: 0, convocatorias: 0, servicios: [] }
  if (abiertos.length === 0) return vacio
  const ids = abiertos.map(s => s.id as string)
  const [pos, bda, inv] = await Promise.all([
    admin.from('team_positions').select('id').eq('team_id', teamId),
    admin.from('banda_assignments').select('service_id, team_position_id').eq('member_id', memberId).in('service_id', ids),
    admin.from('invitations').select('service_id').eq('member_id', memberId).eq('team_id', teamId).in('service_id', ids),
  ])
  if (pos.error || bda.error || inv.error) return 'error'
  const delEquipo = new Set(((pos.data || []) as any[]).map(p => p.id as string))
  const asig = ((bda.data || []) as any[]).filter(r => r.team_position_id && delEquipo.has(r.team_position_id))
  const conv = (inv.data || []) as any[]
  const involucrados = new Set<string>([...asig.map(r => r.service_id as string), ...conv.map(r => r.service_id as string)])
  return { asignaciones: asig.length, convocatorias: conv.length, servicios: abiertos.filter(s => involucrados.has(s.id)).map(s => ({ id: s.id, fecha: s.fecha, titulo: tituloSinFecha(s.titulo) })) }
}

/** El mensaje del 409: cuántas y en qué servicios (fecha y título), y a quién pedir que lo resuelva. */
export function mensajeProximos(p: ProximosDe): string {
  const partes: string[] = []
  if (p.asignaciones > 0) partes.push(contar(p.asignaciones, 'asignación', 'asignaciones'))
  if (p.convocatorias > 0) partes.push(contar(p.convocatorias, 'convocatoria', 'convocatorias'))
  const lista = p.servicios.slice(0, MAX_EN_MENSAJE).map(s => `${fechaCorta(s.fecha)} (${s.titulo})`).join(', ') + (p.servicios.length > MAX_EN_MENSAJE ? ` y ${p.servicios.length - MAX_EN_MENSAJE} más` : '')
  return `No se puede quitar a esta persona del equipo: tiene ${partes.join(' y ')} en servicios próximos: ${lista}. Pide a quien administra que lo resuelva.`
}
