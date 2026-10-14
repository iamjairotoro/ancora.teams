// Quién «aceptó en otro equipo» y ya NO tiene lugar en este (punto 52, commit 4). Cuando alguien usa «Aceptar aquí en su lugar», sus posiciones del equipo
// anterior quedan VACANTES y su invitación allí queda declinada por conflicto. La nómina de ese equipo ya no lo muestra (la posición está libre), así que
// el líder necesita saber QUIÉN se fue y adónde: esta lista alimenta la nómina y «Necesita atención» de Home. Quien fue desplazado SIN salir de sus
// posiciones (confirmó en otro equipo, pero sigue asignado aquí) sigue saliendo en la nómina con el círculo tachado: no entra en esta lista.
// Sin acceso a datos.
import { esDeOtroEquipo } from './convocatoriaEstado'

export interface InvConflicto {
  id: string
  member_id: string
  team_id?: string | null
  status?: string | null
  declined_reason?: string | null
  superseded_by?: string | null
}

export interface VacantePorConflicto {
  invitacion: string
  memberId: string
  /** El equipo que queda con la vacante. */
  teamId: string
  /** El equipo donde la persona aceptó (null si el enlace se perdió o es de otro servicio no cargado). */
  aceptoEnTeamId: string | null
}

/**
 * @param estaAsignado   ¿la persona sigue teniendo alguna posición de ese equipo en este servicio?
 * @param equipoDeInvitacion  id de una invitación → su equipo (para decir adónde se fue)
 * @param equipos        si viene, solo los equipos que quien mira administra (un líder ve solo el suyo)
 */
export function vacantesPorConflicto(
  invs: InvConflicto[],
  estaAsignado: (memberId: string, teamId: string) => boolean,
  equipoDeInvitacion: (invitacionId: string) => string | null | undefined,
  equipos?: Set<string> | null,
): VacantePorConflicto[] {
  const out: VacantePorConflicto[] = []
  for (const i of invs) {
    if (!esDeOtroEquipo(i) || !i.team_id) continue
    if (equipos && !equipos.has(i.team_id)) continue
    if (estaAsignado(i.member_id, i.team_id)) continue
    out.push({ invitacion: i.id, memberId: i.member_id, teamId: i.team_id, aceptoEnTeamId: (i.superseded_by && equipoDeInvitacion(i.superseded_by)) || null })
  }
  return out
}
