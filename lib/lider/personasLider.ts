// Las PERSONAS del líder (Home → Personas, teléfono): lo que el servidor le devuelve a quien lidera un equipo y no es administrador. PURAS, sobre filas ya leídas con la llave de servicio.
// Cada objeto se arma CAMPO POR CAMPO, nunca copiando una fila (la prueba tests/auth/lider-personas.test.js tiene su propia lista y falla si aparece un campo nuevo).
//  · De SU equipo: nombre, apellido, posiciones (id y nombre), si es líder, si es uno mismo, teléfono y correo, y el id de la fila del integrante (lo necesita /api/lider/equipo para quitar o cambiar posiciones).
//  · De los demás equipos: nombre del equipo, y por persona nombre, apellido y los NOMBRES de sus posiciones. Nunca teléfono, correo, nacimiento, bloqueos, foto ni ids de personas o posiciones.
//  · Nunca la foto (avatar_url) en ningún bloque: la pantalla dibuja iniciales.
export interface PosicionDePersona { id: string; nombre: string }
export interface PersonaPropiaDeEquipo { integrante: string; nombre: string; apellido: string; telefono: string | null; email: string | null; esLider: boolean; esYo: boolean; posiciones: PosicionDePersona[] }
export interface PersonaAjenaDeEquipo { nombre: string; apellido: string; posiciones: string[] }
export interface EquipoPersonasPropio { id: string; nombre: string; color: string | null; tuEquipo: true; catalogo: PosicionDePersona[]; personas: PersonaPropiaDeEquipo[] }
export interface EquipoPersonasAjeno { id: string; nombre: string; color: string | null; tuEquipo: false; personas: PersonaAjenaDeEquipo[] }
export type EquipoPersonas = EquipoPersonasPropio | EquipoPersonasAjeno
export interface BusquedaPersona { id: string; nombre: string; apellido: string }

export interface FilasPersonas {
  teams: { id: string; name: string; color: string | null; sort_order: number | null }[]
  positions: { id: string; name: string; team_id: string; sort_order: number | null; archived_at?: string | null }[]
  membresias: { id: string; member_id: string; team_id: string; is_leader: boolean | null }[]
  enlaces: { team_member_id: string; team_position_id: string }[]
  /** Con teléfono y correo SOLO las personas de los equipos que lidera. */
  contactos: { id: string; nombre: string | null; apellido: string | null; telefono: string | null; email: string | null }[]
  /** Nombre y apellido de TODAS las personas de los equipos (una persona puede ser de un equipo suyo y de uno ajeno). */
  nombres: { id: string; nombre: string | null; apellido: string | null }[]
}

const porNombre = (a: { nombre: string; apellido: string }, b: { nombre: string; apellido: string }) => a.nombre.localeCompare(b.nombre, 'es') || a.apellido.localeCompare(b.apellido, 'es')
const porOrden = (a: { sort_order: number | null; name: string }, b: { sort_order: number | null; name: string }) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'es')

export function armarPersonas(f: FilasPersonas, lideradosIds: ReadonlySet<string>, miId: string): EquipoPersonas[] {
  const contacto = new Map(f.contactos.map(c => [c.id, c] as const)), nombre = new Map(f.nombres.map(n => [n.id, n] as const))
  const posicion = new Map(f.positions.map(p => [p.id, p] as const))
  const equipos = f.teams.slice().sort((a, b) => porOrden({ sort_order: a.sort_order, name: a.name }, { sort_order: b.sort_order, name: b.name }))
  const posicionesDe = (membresiaId: string) => f.enlaces.filter(e => e.team_member_id === membresiaId).map(e => posicion.get(e.team_position_id)).filter((p): p is NonNullable<typeof p> => !!p && !p.archived_at).sort(porOrden)
  const armar = (t: FilasPersonas['teams'][number]): EquipoPersonas => {
    const filas = f.membresias.filter(m => m.team_id === t.id)
    if (lideradosIds.has(t.id)) {
      const personas: PersonaPropiaDeEquipo[] = filas.map(m => ({ m, c: contacto.get(m.member_id) })).filter(x => x.c).map(({ m, c }) => ({
        integrante: m.id, nombre: c!.nombre || '', apellido: c!.apellido || '', telefono: c!.telefono || null, email: c!.email || null, esLider: !!m.is_leader, esYo: m.member_id === miId,
        posiciones: posicionesDe(m.id).map(p => ({ id: p.id, nombre: p.name })),
      })).sort(porNombre)
      const catalogo = f.positions.filter(p => p.team_id === t.id && !p.archived_at).sort(porOrden).map(p => ({ id: p.id, nombre: p.name }))
      return { id: t.id, nombre: t.name, color: t.color ?? null, tuEquipo: true, catalogo, personas }
    }
    const personas: PersonaAjenaDeEquipo[] = filas.map(m => ({ m, n: nombre.get(m.member_id) })).filter(x => x.n).map(({ m, n }) => ({ nombre: n!.nombre || '', apellido: n!.apellido || '', posiciones: posicionesDe(m.id).map(p => p.name) })).sort(porNombre)
    return { id: t.id, nombre: t.name, color: t.color ?? null, tuEquipo: false, personas }
  }
  const todos = equipos.map(armar)
  return [...todos.filter(e => e.tuEquipo), ...todos.filter(e => !e.tuEquipo)]
}
