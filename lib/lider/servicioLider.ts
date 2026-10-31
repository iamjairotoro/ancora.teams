// Los servicios del LÍDER (Home → Servicios, teléfono): lo que el servidor le devuelve a quien lidera un equipo y no es administrador. PURAS, sobre filas ya leídas con la llave de servicio.
// Cada objeto se arma CAMPO POR CAMPO, nunca copiando una fila: lo que no se nombra aquí no sale (la prueba tests/auth/lider-servicios.test.js tiene su propia lista y falla si aparece un campo nuevo).
// De los equipos AJENOS: nombre del equipo, nombre de la posición, nombre de la persona y «Confirmó» / «Sin responder». Nunca teléfono, correo, nacimiento, motivos, bloqueos ni ids de personas o invitaciones.
// «Declinó» solo lo ve el líder de ESE equipo, en el suyo. Los motivos no salen en ningún caso.
import { rangoDeHoras } from '@/lib/admin/servicioMovil'

export type EstadoAjeno = 'confirmo' | 'sin-responder'
export type EstadoPropio = EstadoAjeno | 'declino'
export interface PersonaAjena { nombre: string; apellido: string; posicion: string; estado: EstadoAjeno }
export interface PersonaPropia { nombre: string; apellido: string; posicion: string; estado: EstadoPropio }
export interface EquipoAjeno { id: string; nombre: string; color: string | null; tuEquipo: false; personas: PersonaAjena[] }
export interface EquipoPropio { id: string; nombre: string; color: string | null; tuEquipo: true; personas: PersonaPropia[]; checklists: { id: string; nombre: string }[] }
export type EquipoLider = EquipoPropio | EquipoAjeno
export interface ServicioDeLista { id: string; fecha: string; titulo: string; kind: string | null; horas: string }
export interface ServicioLider { servicio: ServicioDeLista; equipos: EquipoLider[] }

export interface FilasServicio {
  teams: { id: string; name: string; color: string | null; sort_order: number | null }[]
  positions: { id: string; name: string; team_id: string; sort_order: number | null }[]
  asignaciones: { member_id: string | null; team_position_id: string | null }[]
  invitaciones: { member_id: string | null; team_id: string | null; status: string | null }[]
  miembros: { id: string; nombre: string | null; apellido: string | null }[]
  herramientas: { id: string; team_id: string; tool_type: string | null; label?: string | null }[]
}

export const tituloSinFecha = (titulo?: string | null): string => (titulo || 'Servicio').split(' — ')[0].trim() || 'Servicio'

export function servicioDeLista(s: { id: string; fecha: string; titulo?: string | null; kind?: string | null; hora_inicio?: string | null; hora_fin?: string | null }): ServicioDeLista {
  return { id: s.id, fecha: s.fecha, titulo: tituloSinFecha(s.titulo), kind: s.kind ?? null, horas: rangoDeHoras(s.hora_inicio, s.hora_fin) }
}

const porOrden = (a: { sort_order: number | null; name: string }, b: { sort_order: number | null; name: string }) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'es')

/** Los equipos del servicio: primero los que lidera (con todo lo que ve el líder de su equipo), después los demás con lo mínimo. */
export function armarEquipos(f: FilasServicio, lideradosIds: ReadonlySet<string>): EquipoLider[] {
  const nombreDe = new Map(f.miembros.map(m => [m.id, m] as const))
  const posicion = new Map(f.positions.map(p => [p.id, p] as const))
  const inv = (memberId: string, teamId: string) => f.invitaciones.find(i => i.member_id === memberId && i.team_id === teamId)
  const equipos = f.teams.slice().sort((a, b) => porOrden({ sort_order: a.sort_order, name: a.name }, { sort_order: b.sort_order, name: b.name }))
  const armar = (t: FilasServicio['teams'][number]): EquipoLider => {
    const propio = lideradosIds.has(t.id)
    const filas = f.asignaciones
      .filter(a => a.member_id && a.team_position_id && posicion.get(a.team_position_id)?.team_id === t.id)
      .map(a => ({ pos: posicion.get(a.team_position_id as string)!, persona: nombreDe.get(a.member_id as string), memberId: a.member_id as string }))
      .filter(x => x.persona)
      .sort((a, b) => porOrden(a.pos, b.pos) || (a.persona!.nombre || '').localeCompare(b.persona!.nombre || '', 'es'))
    if (propio) {
      const personas: PersonaPropia[] = filas.map(x => {
        const st = inv(x.memberId, t.id)?.status
        const estado: EstadoPropio = st === 'confirmado' ? 'confirmo' : st === 'declinado' ? 'declino' : 'sin-responder'
        return { nombre: x.persona!.nombre || '', apellido: x.persona!.apellido || '', posicion: x.pos.name, estado }
      })
      const checklists = f.herramientas.filter(h => h.team_id === t.id && h.tool_type === 'checklist').map(h => ({ id: h.id, nombre: (h.label || '').trim() || 'Checklist' }))
      return { id: t.id, nombre: t.name, color: t.color ?? null, tuEquipo: true, personas, checklists }
    }
    const personas: PersonaAjena[] = filas.map(x => ({
      nombre: x.persona!.nombre || '', apellido: x.persona!.apellido || '', posicion: x.pos.name,
      estado: inv(x.memberId, t.id)?.status === 'confirmado' ? 'confirmo' : 'sin-responder',
    }))
    return { id: t.id, nombre: t.name, color: t.color ?? null, tuEquipo: false, personas }
  }
  const todos = equipos.map(armar)
  return [...todos.filter(e => e.tuEquipo), ...todos.filter(e => !e.tuEquipo)]
}
