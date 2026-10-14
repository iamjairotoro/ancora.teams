// Qué tarjetas ve una persona en el portal por cada servicio (punto 52): UNA por equipo que la convocó (varias posiciones del mismo equipo = una
// tarjeta, una aceptación). Sin acceso a datos ni a servidor: la usan /api/portal/me y /api/member-portal, y se prueba aparte.
import { equipoDePosicion, etiquetaDePosicion, type FilaConPosicion } from '@/lib/bandaPosicion'

export interface InvitacionDePersona {
  service_id: string | null
  team_id: string | null
  sent_at?: string | null
  team?: { id?: string; name?: string | null } | { id?: string; name?: string | null }[] | null
  [k: string]: unknown
}
export interface EntradaServicio<I extends InvitacionDePersona> {
  /** El equipo de esta tarjeta; null en un ensayo o si todavía no hay ninguna convocatoria enviada. */
  team: { id: string; name: string } | null
  /** Las posiciones de la persona EN ESE equipo (nombre actual). */
  posiciones: string[]
  invitation: I | null
}

const uno = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null))

/**
 * @param esEnsayo       el servicio es un ensayo (se convoca a toda la banda, sin posiciones ni equipo)
 * @param invitaciones   las invitaciones de la persona para ESTE servicio (ya filtradas por servicio)
 * @param asignaciones   las asignaciones de la persona en ESTE servicio, con el join de su posición (BANDA_POSICION_EMBED)
 * Una convocatoria que el admin todavía no envió (sent_at vacío) NO existe para la persona.
 */
export function entradasDeServicio<I extends InvitacionDePersona, A extends FilaConPosicion>(
  esEnsayo: boolean, invitaciones: I[], asignaciones: A[],
): EntradaServicio<I>[] {
  const enviadas = invitaciones.filter(i => !!i.sent_at)
  if (esEnsayo) {
    const inv = enviadas.find(i => !i.team_id) ?? null
    return [{ team: null, posiciones: [], invitation: inv }]
  }
  const porEquipo = enviadas.filter(i => i.team_id)
  if (!porEquipo.length) return [{ team: null, posiciones: [], invitation: null }]
  const out = porEquipo.map(inv => {
    const t = uno(inv.team)
    const mias = asignaciones.filter(a => equipoDePosicion(a)?.teamId === inv.team_id)
    return { team: { id: inv.team_id as string, name: t?.name || '' }, posiciones: mias.map(etiquetaDePosicion), invitation: inv }
  })
  return out.sort((a, b) => a.team!.name.localeCompare(b.team!.name, 'es', { sensitivity: 'base' }))
}
