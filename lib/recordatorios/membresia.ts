// El cron de recordatorios (app/api/reminder/route.ts) solo le escribe a quien SIGUE en el equipo de la invitación: una invitación con equipo se conserva únicamente si existe la fila (member_id, team_id) en team_members.
// Las de ensayo (team_id nulo) no tienen equipo y se dejan como estaban. Esto SOLO REDUCE los envíos: se agrega un filtro, nunca un destinatario, un mensaje ni una escritura.
// Si la consulta de pertenencia falla, NO se envía nada de ese bloque (se omite el día y el error queda muy visible en los registros): nunca «se manda como hoy».
import { contar } from '@/lib/textos/plural'

export interface ConEquipo { member_id: string; team_id: string | null }
const TROZO = 50      // personas por consulta: la URL de PostgREST y el tope de 1000 filas

export const claveDeMembresia = (memberId: string, teamId: string): string => `${memberId}:${teamId}`

/** Pura: las invitaciones que se conservan (sin equipo, o con la persona en ese equipo). */
export function conservarPorMembresia<T extends ConEquipo>(invs: readonly T[], claves: ReadonlySet<string>): T[] {
  return invs.filter(i => i.team_id == null || claves.has(claveDeMembresia(i.member_id, i.team_id)))
}

export type ResultadoMembresia<T> = { falla: false; invs: T[]; omitidas: number } | { falla: true; invs: []; omitidas: number }

/** Lee de una vez los pares persona-equipo que hacen falta y filtra. `que` solo se usa para el mensaje de error de los registros. */
export async function filtrarPorMembresia<T extends ConEquipo>(admin: any, invs: readonly T[], que: string): Promise<ResultadoMembresia<T>> {
  const conEquipo = invs.filter(i => i.team_id)
  if (conEquipo.length === 0) return { falla: false, invs: [...invs], omitidas: 0 }
  const personas = Array.from(new Set(conEquipo.map(i => i.member_id)))
  const equipos = Array.from(new Set(conEquipo.map(i => i.team_id as string)))
  const claves = new Set<string>()
  for (let i = 0; i < personas.length; i += TROZO) {
    const r = await admin.from('team_members').select('member_id, team_id').in('member_id', personas.slice(i, i + TROZO)).in('team_id', equipos)
    if (r.error) {
      console.error(`[recordatorios] ¡ERROR! No se pudo comprobar a qué equipos pertenece cada persona (${r.error.message || 'sin detalle'}). Se OMITEN hoy los recordatorios de «${que}» (${contar(invs.length, 'invitación', 'invitaciones')}): NO se envía nada. Revisar la base y el cron.`)
      return { falla: true, invs: [], omitidas: invs.length }
    }
    for (const f of (r.data || []) as { member_id: string; team_id: string }[]) claves.add(claveDeMembresia(f.member_id, f.team_id))
  }
  const quedan = conservarPorMembresia(invs, claves)
  return { falla: false, invs: quedan, omitidas: invs.length - quedan.length }
}
