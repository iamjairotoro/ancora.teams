// La tira de días del Home en teléfono (prototipo docs/mockups/index.html): reemplaza al calendario semana/mes de los dos Home. PURAS, sin datos ni servidor; todas las fechas son AAAA-MM-DD del día de Chile
// (quien llama pasa `hoy`, p. ej. hoyEnSantiago()). Aquí viven las reglas: qué días dibuja la tira, qué punto lleva cada día, qué puede hacer cada persona en la tarjeta del día (abrir, bloquear, quitar el
// bloqueo) y, para administración y líderes, quién bloqueó esa fecha (lo recorta lib/teamBlocks.ts: un líder nunca ve más que su equipo). Los bloqueos son los de siempre (date_blocks, por equipo, motivo visible
// para los líderes de ese equipo): este archivo no inventa tablas ni permisos; solo arma el cuerpo que ya recibe /api/portal/bloqueos.
import { dayBlocks, personPhrase, type TeamBlockRow, type Viewer } from '@/lib/teamBlocks'
import { estadoConvocatoria } from '@/lib/convocatoriaEstado'
import { sumarDias, type EntradaMarca } from '@/lib/home/calendario'

export const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
/** Los motivos rápidos de la hoja «Bloquear fecha». */
export const MOTIVOS_RAPIDOS = ['Trabajo', 'Familia', 'Viaje', 'Estudios'] as const
/** Lo mismo que acepta /api/portal/bloqueos (reason: hasta 500 caracteres). */
export const MOTIVO_MAXIMO = 500
/** La tira va de dos semanas atrás a unos cuatro meses adelante (el chip del mes salta a cualquier fecha de ese rango). */
export const DIAS_ATRAS = 14
export const DIAS_ADELANTE = 120

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/
const aMs = (f: string): number => { const m = ISO.exec(f); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], 12) : NaN }
const dow = (f: string): number => new Date(aMs(f)).getUTCDay()

export interface DiaTira { fecha: string; numero: number; dia: string; esHoy: boolean; pasado: boolean; mesNuevo: string | null }

/** Los días de la tira. Cada primero de mes lleva el nombre del mes («Diciembre») para dibujarlo en la tira. */
export function diasDeLaTira(hoy: string, atras = DIAS_ATRAS, adelante = DIAS_ADELANTE): DiaTira[] {
  if (!ISO.test(hoy)) return []
  const out: DiaTira[] = []
  for (let i = -atras; i <= adelante; i++) {
    const f = sumarDias(hoy, i), numero = +f.slice(8)
    out.push({ fecha: f, numero, dia: DIAS_CORTOS[dow(f)], esHoy: f === hoy, pasado: f < hoy, mesNuevo: numero === 1 ? MESES[+f.slice(5, 7) - 1] : null })
  }
  return out
}

/** ¿La fecha cae dentro de lo que dibuja la tira? (el mes completo de la hoja puede mostrar días fuera). */
export const enLaTira = (fecha: string, hoy: string, atras = DIAS_ATRAS, adelante = DIAS_ADELANTE): boolean => ISO.test(fecha) && fecha >= sumarDias(hoy, -atras) && fecha <= sumarDias(hoy, adelante)

/** «Jueves 19 de noviembre». */
export const tituloDelDia = (fecha: string): string => `${DIAS[dow(fecha)]} ${+fecha.slice(8)} de ${MESES[+fecha.slice(5, 7) - 1].toLowerCase()}`
/** «Noviembre» (el chip de arriba a la derecha). */
export const nombreDelMes = (fecha: string): string => MESES[+fecha.slice(5, 7) - 1]
/** «Noviembre 2026» (la hoja del mes completo). */
export const tituloDelMes = (anio: number, mes: number): string => `${MESES[mes - 1]} ${anio}`

export type PuntoDia = 'servicio' | 'bloqueado' | null
/** El punto bajo el número. Una sola marca por día. La persona que mira SU agenda ve primero su bloqueo (ámbar): un servicio bloqueado es lo que hay que hablar con el líder. Administración y líderes miran la agenda
 *  de otros: ahí manda el servicio (azul) y los bloqueos de las personas se leen en la tarjeta. */
export function puntoDelDia(a: { servicio: boolean; bloqueado: boolean; prioridad: 'bloqueo' | 'servicio' }): PuntoDia {
  if (a.prioridad === 'bloqueo') return a.bloqueado ? 'bloqueado' : a.servicio ? 'servicio' : null
  return a.servicio ? 'servicio' : a.bloqueado ? 'bloqueado' : null
}

// ── la agenda de la persona (Home de usuario) ──
/** Las convocatorias y ensayos de la persona que cuentan en el calendario: enviadas y todavía en pie (pendientes o confirmadas). El mismo criterio de marcasDeUsuario. */
export function entradasVigentesPorDia<T extends EntradaMarca>(entradas: T[]): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const e of entradas) {
    if (!e.invitation?.sent_at || !['pendiente', 'confirmado'].includes(estadoConvocatoria(e.invitation) ?? '')) continue
    const l = out.get(e.service.fecha) ?? []; l.push(e); out.set(e.service.fecha, l)
  }
  return out
}

export interface FilaBloqueo { blocked_date?: string | null; team_id?: string | null; reason?: string | null; service?: { fecha?: string | null } | null }
export interface BloqueoDelDia { motivo: string; /** null = todos sus equipos. */ equipoIds: string[] | null; parcial: boolean }

/** El bloqueo propio de UNA fecha a partir de las filas de /api/portal/bloqueos: una fila sin equipo = todos; si no, una fila por equipo. `parcial` = solo algunos (hay más de un equipo y no están todos). */
export function bloqueoDeLaFecha(filas: FilaBloqueo[], fecha: string, totalEquipos: number): BloqueoDelDia | null {
  const rows = filas.filter(f => (f.blocked_date || f.service?.fecha) === fecha)
  if (!rows.length) return null
  const todos = rows.some(r => r.team_id == null)
  const ids = todos ? null : Array.from(new Set(rows.map(r => r.team_id as string)))
  return { motivo: rows.map(r => r.reason).find(Boolean) || '', equipoIds: ids, parcial: !!ids && totalEquipos > 1 && ids.length < totalEquipos }
}

/** Los días con algún bloqueo propio (en cualquiera de sus equipos). */
export function diasConBloqueo(filas: FilaBloqueo[]): Set<string> {
  const out = new Set<string>(); for (const f of filas) { const d = f.blocked_date || f.service?.fecha; if (d) out.add(d) } return out
}

/** Las filas de bloqueos con lo que quedó en la base para esa fecha (`nuevas`; [] = la fecha quedó libre) en lugar de lo que había. Lo mismo que hace Disponibilidad (reemplazarFecha). */
export const reemplazarFecha = <T extends FilaBloqueo>(filas: T[], fecha: string, nuevas: T[]): T[] => filas.filter(r => (r.blocked_date || r.service?.fecha) !== fecha).concat(nuevas)

/** El motivo que se guarda: lo escrito pesa más que el chip; recortado y sin pasar de 500. Vacío = sin motivo (la base guarda null). */
export const motivoFinal = (chip: string, texto: string): string => (texto.trim() || chip).slice(0, MOTIVO_MAXIMO)

/** El cuerpo del POST a /api/portal/bloqueos para bloquear UN día: sin `teamIds` = todos sus equipos (así queda cubierto también un equipo que se sume después). Los rangos siguen en Disponibilidad. */
export const cuerpoDeBloqueo = (fecha: string, motivo: string): { date: string; reason: string } => ({ date: fecha, reason: motivo.slice(0, MOTIVO_MAXIMO) })
/** El cuerpo del DELETE: quita la fecha completa (todos sus equipos), como el botón «Quitar» de Disponibilidad. */
export const cuerpoDeQuitar = (fecha: string): { date: string } => ({ date: fecha })

export interface AccionesDelDia {
  /** «Abrir servicio»: hay servicio ese día y existe un destino. */
  abrir: boolean
  /** «Bloquear esta fecha»: solo la persona misma, un día que no pasó y que aún no bloqueó. */
  bloquear: boolean
  /** «Quitar bloqueo»: solo la persona misma y solo si el día está bloqueado (también uno pasado). */
  quitar: boolean
  /** Hay servicio y la fecha está bloqueada: hay que hablar con el líder. */
  avisoLider: boolean
  /** «No hay servicio este día» (y, si es de usted, la invitación a bloquear). */
  sinServicio: boolean
}
export function accionesDelDia(a: { hayServicio: boolean; pasado: boolean; bloqueado: boolean; esPropio: boolean; hayDestino: boolean }): AccionesDelDia {
  return {
    abrir: a.hayServicio && a.hayDestino,
    bloquear: a.esPropio && !a.pasado && !a.bloqueado,
    quitar: a.esPropio && a.bloqueado,
    avisoLider: a.esPropio && a.hayServicio && a.bloqueado,
    sinServicio: !a.hayServicio,
  }
}

// ── administración y líderes: quién bloqueó esa fecha ──
export interface QuienBloqueo { memberId: string; nombre: string; frase: string; motivos: string[] }
export interface PersonaMini { id: string; nombre: string; apellido?: string | null }
export interface EquipoMini { id: string; name: string }

/** Las personas que bloquearon la fecha, con la frase de siempre del panel «Por persona» (personPhrase): el líder lee «Bloqueó {su equipo}» y solo ve filas de los equipos que lidera; la administración ve todos
 *  los equipos y «Disponible en…». Con los datos que ya carga el Home (team_blocks_in_range filtra primero en la base; aquí se vuelve a recortar). Orden por nombre. */
export function quienBloqueo(a: { filas: TeamBlockRow[]; fecha: string; viewer: Viewer; personas: PersonaMini[]; equipos: EquipoMini[]; equiposDe?: (memberId: string) => string[] }): QuienBloqueo[] {
  const { viewer } = a, esAdmin = viewer.kind === 'admin'
  const visibles = a.equipos.filter(t => esAdmin || (viewer.kind === 'leader' && viewer.teamIds.has(t.id)))
  const nombreEquipo = new Map(visibles.map(t => [t.id, t.name] as [string, string])), orden = (t: string) => visibles.findIndex(x => x.id === t)
  const persona = new Map(a.personas.map(p => [p.id, p] as [string, PersonaMini]))
  const nombreDe = (id: string) => { const p = persona.get(id); return (p ? `${p.nombre} ${p.apellido || ''}`.trim() : '') || 'Persona' }
  const dia = dayBlocks(a.filas, a.fecha, viewer)
  return dia.people.map(p => {
    const bloqueados = p.teamIds.filter(t => nombreEquipo.has(t)).sort((x, y) => orden(x) - orden(y))
    const propios = esAdmin && a.equiposDe ? a.equiposDe(p.memberId).filter(t => nombreEquipo.has(t)).sort((x, y) => orden(x) - orden(y)) : []
    const libres = propios.filter(t => !bloqueados.includes(t))
    const frase = personPhrase({ viewer, blockedNames: bloqueados.map(t => nombreEquipo.get(t)!), availableNames: libres.map(t => nombreEquipo.get(t)!), allBlocked: propios.length > 0 && libres.length === 0, onlyTeam: propios.length === 1, noTeam: p.noTeam })
    return { memberId: p.memberId, nombre: nombreDe(p.memberId), frase, motivos: p.reasons }
  }).sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'))
}

/** Las fechas en las que alguien bloqueó, tal como las ve quien mira (para el punto ámbar de administración y líderes). */
export function fechasConBloqueoVisible(filas: TeamBlockRow[], viewer: Viewer): Set<string> {
  const out = new Set<string>()
  for (const r of filas) { if (viewer.kind === 'leader' && (!r.team_id || !viewer.teamIds.has(r.team_id))) continue; out.add(r.blocked_date) }
  return out
}
