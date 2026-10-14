// Historial y conteos de una persona (PersonDrawer) — un solo lugar para
// /admin y /home, que antes lo repetían. Regla: una persona con varias
// posiciones en el MISMO servicio y equipo es UNA fila y cuenta 1 servicio
// (Voz 1 + Guitarra acústica no son dos servicios). El equipo y el nombre de
// una asignación salen de su team_position_id (punto 52): renombrar una posición
// o archivarla no cambia nada. Solo las filas heredadas (código viejo tipo "VX1",
// sin id) quedan sin equipo, y se agrupan todas en una sola fila por servicio.

export type HistoryStatus = 'served' | 'declined' | 'pending'

export interface HistoryRaw {
  id: string
  serviceId: string
  fecha: string
  positionName: string   // «Voz 1 · Guitarra acústica»
  serviceName: string
  teamName: string
  status: HistoryStatus
}

export const toHistoryStatus = (raw?: string): HistoryStatus =>
  raw === 'confirmado' ? 'served' : raw === 'declinado' ? 'declined' : 'pending'

export function buildHistoryRaw(a: {
  banda: any[]          // banda_assignments: { id, service_id, team_position_id, posicion?, team_position?:{name,team_id}, service:{fecha,titulo,tipo} }
  invitations: any[]    // invitations: { service_id, status, service:{fecha,titulo,tipo} }
  teamPositions: { id: string; name: string; team_id: string }[]   // las vigentes; las archivadas llegan por el join `team_position` de cada fila
  teams: { id: string; name: string }[]
}): HistoryRaw[] {
  // la invitación es una por (servicio, persona): su estado vale para
  // todas las posiciones de la persona en ese servicio.
  const statusByService = new Map<string, string>()
  for (const inv of a.invitations) if (inv.service_id) statusByService.set(inv.service_id, inv.status)

  const order = new Map(a.teamPositions.map((p, i) => [p.name, i] as [string, number]))
  const byId = new Map(a.teamPositions.map(p => [p.id, p] as [string, { id: string; name: string; team_id: string }]))
  // Nombre y equipo de una fila: primero el join (sirve también para posiciones ARCHIVADAS), luego las vigentes ya cargadas.
  const resolve = (b: any) => {
    const emb = Array.isArray(b.team_position) ? b.team_position[0] : b.team_position
    const cur = b.team_position_id ? byId.get(b.team_position_id) : undefined
    return { name: (emb?.name || cur?.name || b.posicion || '—') as string, teamId: (emb?.team_id || cur?.team_id || '') as string }
  }
  const groups = new Map<string, { serviceId: string; fecha: string; serviceName: string; teamKey: string; teamName: string; positions: string[] }>()
  for (const b of a.banda) {
    if (!b.service || b.service.tipo === 'ensayo') continue
    const { name: posName, teamId: teamKey } = resolve(b)
    const key = `${b.service_id}|${teamKey}`
    let g = groups.get(key)
    if (!g) {
      g = {
        serviceId: b.service_id, fecha: b.service.fecha, serviceName: b.service.titulo || 'Servicio',
        teamKey, teamName: a.teams.find(t => t.id === teamKey)?.name || '', positions: [],
      }
      groups.set(key, g)
    }
    if (!g.positions.includes(posName)) g.positions.push(posName)
  }

  const servicio: HistoryRaw[] = Array.from(groups.values()).map(g => ({
    id: `${g.serviceId}-${g.teamKey || 'sin-equipo'}`,
    serviceId: g.serviceId, fecha: g.fecha, serviceName: g.serviceName, teamName: g.teamName,
    positionName: g.positions
      .sort((x, y) => (order.get(x) ?? 1e6) - (order.get(y) ?? 1e6) || x.localeCompare(y, 'es'))
      .join(' · '),
    status: toHistoryStatus(statusByService.get(g.serviceId)),
  }))

  // EnsayoPanel no usa banda_assignments: la asistencia a un ensayo vive solo
  // en invitations — una fila por ensayo.
  const ensayo: HistoryRaw[] = a.invitations
    .filter(inv => inv.service?.tipo === 'ensayo')
    .map(inv => ({
      id: `ens-${inv.service_id}`, serviceId: inv.service_id, fecha: inv.service.fecha, positionName: 'Ensayo',
      serviceName: inv.service.titulo || 'Ensayo', teamName: 'Ensayo', status: toHistoryStatus(inv.status),
    }))

  return [...servicio, ...ensayo].sort((x, y) => y.fecha.localeCompare(x.fecha))
}

// Servicios DISTINTOS servidos desde `sinceISO` (no filas ni posiciones).
export function servedServiceCount(entries: HistoryRaw[], sinceISO: string): number {
  return new Set(entries.filter(e => e.status === 'served' && e.fecha >= sinceISO).map(e => e.serviceId)).size
}
