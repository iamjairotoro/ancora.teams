// Qué ve cada quien en el Home (teléfono y escritorio): el administrador ve todo; un LÍDER que no es administrador solo ve lo de SU(S) equipo(s) — nada de la respuesta ni de la carga de equipos ajenos, ni
// los cumpleaños de personas de otros equipos. PURAS, sobre listas ya cargadas. Para el administrador devuelven la MISMA lista (sin copiarla): el Home de escritorio del administrador no cambia.
// OJO: esto es solo de PANTALLA. Mientras el Home siga leyendo invitations y banda_assignments desde el navegador, un líder aún puede recibir esos datos por la API; se cierra moviéndolos a una ruta del servidor.
import type { Viewer } from '@/lib/teamBlocks'

/** Personas que están en alguno de los equipos dados. */
export function personasDeEquipos(teamMembers: { member_id: string; team_id: string }[], teamIds: ReadonlySet<string>): Set<string> {
  const out = new Set<string>()
  for (const tm of teamMembers) if (teamIds.has(tm.team_id)) out.add(tm.member_id)
  return out
}

export function respuestasVisibles<T extends { teamId: string }>(respuestas: T[], viewer: Viewer): T[] {
  return viewer.kind === 'admin' ? respuestas : respuestas.filter(r => viewer.teamIds.has(r.teamId))
}

/** La carga de un líder: solo las personas de sus equipos. La escala (`maxCount`) es la del grupo que se ve. */
export function cargaVisible<T extends { personId: string; count: number; maxCount: number }>(carga: T[], viewer: Viewer, personasDeSusEquipos: ReadonlySet<string>): T[] {
  if (viewer.kind === 'admin') return carga
  const visibles = carga.filter(c => personasDeSusEquipos.has(c.personId))
  const max = Math.max(1, ...visibles.map(c => c.count))
  return visibles.map(c => ({ ...c, maxCount: max }))
}

export function personasVisibles<T extends { id: string }>(personas: T[], viewer: Viewer, personasDeSusEquipos: ReadonlySet<string>): T[] {
  return viewer.kind === 'admin' ? personas : personas.filter(p => personasDeSusEquipos.has(p.id))
}
