// La ficha de una persona asignada en un equipo (estado, texto y bloqueo de la fecha), la misma para la tarjeta de la posición y para la hoja de posición.
import type { Invitation } from '@/lib/types'
import { fichaDePersona, puedeVerRechazos, type FichaDePersona } from '@/lib/admin/servicioMovil'
import { blockedIdsForTeam, type Viewer } from '@/lib/teamBlocks'
import { textoAceptoEn } from '@/lib/convocatoriaEstado'
import type { ServicioAdminProps } from './tipos'

/** La invitación de ESTE equipo a esa persona en el servicio abierto. */
export const invitacionDe = (p: ServicioAdminProps, teamId: string, memberId: string): Invitation | undefined => p.invitations.find(i => i.member_id === memberId && i.team_id === teamId)

/** Una función memberId → ficha, con lo que ese visitante puede ver (quién declinó solo lo ve un administrador o el líder de ese equipo). */
export function fichasDeEquipo(p: ServicioAdminProps, teamId: string, viewer: Viewer): (memberId: string) => FichaDePersona {
  const bloqueados = blockedIdsForTeam(p.dateBlocks, teamId), verRechazos = puedeVerRechazos(viewer, teamId)
  const nombreDeEquipo = (id?: string | null) => p.equipoSections.find(s => s.teamId === id)?.nombre
  return memberId => {
    const inv = invitacionDe(p, teamId, memberId)
    return fichaDePersona({ inv, verRechazos, bloqueados, memberId, aceptoEn: textoAceptoEn(nombreDeEquipo(inv?.superseded_by ? p.equipoDeInvitacion?.[inv.superseded_by] : null)) })
  }
}
