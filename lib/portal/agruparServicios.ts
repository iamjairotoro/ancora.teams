// La lista de Servicios del portal agrupada por DÍA (punto 54, commit 3). Un día = un encabezado, su horario, una nota si hay varios equipos que se cruzan y las tarjetas.
// El cruce replica la regla de la base (migración 037c): MISMO día y horarios que se solapan (nulos = 10:00 y 14:00; solape ESTRICTO: si una termina justo cuando empieza la otra, no
// chocan; una cuyo fin <= inicio no choca con nada); solo entre EQUIPOS distintos (los ensayos no entran). Sin acceso a datos ni a servidor.
import { estadoConvocatoria } from '@/lib/convocatoriaEstado'

export interface ServicioLista { id: string; fecha: string; tipo?: string; titulo?: string; hora_inicio?: string | null; hora_fin?: string | null }
export interface EntradaLista {
  service: ServicioLista
  team?: { id: string; name: string } | null
  invitation: { status: string; declined_reason?: string | null } | null
  cerrada?: boolean
}

const aMinutos = (h: string | null | undefined, porDefecto: number): number => {
  const m = /^(\d{1,2}):(\d{2})/.exec(h || '')
  return m ? +m[1] * 60 + +m[2] : porDefecto
}

/** ¿Chocan dos servicios para una misma persona? (misma regla que `convocatorias_se_solapan`). */
export function seCruzan(a: ServicioLista, b: ServicioLista): boolean {
  if (a.fecha !== b.fecha) return false
  const ai = aMinutos(a.hora_inicio, 600), af = aMinutos(a.hora_fin, 840), bi = aMinutos(b.hora_inicio, 600), bf = aMinutos(b.hora_fin, 840)
  if (af <= ai || bf <= bi) return false
  return ai < bf && bi < af
}

/** «10:00 — 14:00»; solo la hora de inicio si no hay fin; null si no hay horario cargado (no se inventa uno). */
export function horarioTexto(ini?: string | null, fin?: string | null): string | null {
  const i = /^(\d{1,2}:\d{2})/.exec(ini || '')?.[1], f = /^(\d{1,2}:\d{2})/.exec(fin || '')?.[1]
  const p = (h: string) => h.padStart(5, '0')
  return i && f ? `${p(i)} — ${p(f)}` : i ? p(i) : null
}

export type NotaDia =
  | { tipo: 'elegir'; n: number }                 // «3 equipos te convocaron… solo puedes servir en uno»
  | { tipo: 'aceptaste'; equipo: string }         // aceptó en uno y los demás quedaron declinados por conflicto
  | { tipo: 'ya-aceptaste'; equipo: string }      // ya aceptó en uno y llegó otra convocatoria que se cruza (aceptarla lo deja)

export interface GrupoDia<E extends EntradaLista> {
  fecha: string
  /** El horario del día cuando todos sus servicios tienen el mismo; si no, cada tarjeta lleva el suyo (`horaPorTarjeta`). */
  horario: string | null
  horaPorTarjeta: boolean
  /** Las convocatorias de EQUIPO (con invitación), por hora y nombre. */
  tarjetas: E[]
  /** Todo lo demás: ensayos y servicios sin convocatoria para esta persona. */
  otros: E[]
  nota: NotaDia | null
  /** La persona bloqueó este día para TODOS sus equipos. */
  bloqueado: boolean
}

const hora = (e: EntradaLista) => aMinutos(e.service.hora_inicio, 600)

function notaDelDia(tarjetas: (EntradaLista & { team: { id: string; name: string } })[]): NotaDia | null {
  const vivas = tarjetas.filter(t => !t.cerrada)
  const cruzadas = vivas.filter(t => vivas.some(o => o !== t && o.team.id !== t.team.id && seCruzan(o.service, t.service)))
  if (cruzadas.length < 2) return null
  const estado = (e: EntradaLista) => estadoConvocatoria(e.invitation)
  const aceptada = cruzadas.find(t => estado(t) === 'confirmado')
  if (aceptada) {
    if (cruzadas.some(t => estado(t) === 'otro-equipo')) return { tipo: 'aceptaste', equipo: aceptada.team.name }
    if (cruzadas.some(t => estado(t) === 'pendiente')) return { tipo: 'ya-aceptaste', equipo: aceptada.team.name }
    return null
  }
  const pendientes = cruzadas.filter(t => estado(t) === 'pendiente').length
  return pendientes >= 2 ? { tipo: 'elegir', n: pendientes } : null
}

/** Agrupa por día, en orden de fecha. `entradas` trae UNA fila por tarjeta (y una vacía por cada servicio sin convocatoria): el armado de /api/portal/me ya lo entrega así. */
export function agruparPorDia<E extends EntradaLista>(entradas: E[], bloqueados: ReadonlySet<string> = new Set()): GrupoDia<E>[] {
  const porFecha = new Map<string, E[]>()
  for (const e of entradas) { const l = porFecha.get(e.service.fecha); if (l) l.push(e); else porFecha.set(e.service.fecha, [e]) }
  return Array.from(porFecha.keys()).sort().map(fecha => {
    const delDia = porFecha.get(fecha)!
    const esTarjeta = (e: E): e is E & { team: { id: string; name: string } } => !!e.team && !!e.invitation && estadoConvocatoria(e.invitation) !== null
    const tarjetas = delDia.filter(esTarjeta).sort((a, b) => hora(a) - hora(b) || a.team.name.localeCompare(b.team.name, 'es', { sensitivity: 'base' }))
    const otros = delDia.filter(e => !esTarjeta(e)).sort((a, b) => hora(a) - hora(b) || Number(!!b.invitation) - Number(!!a.invitation))
    const horarios = new Map<string, ServicioLista>()
    for (const e of delDia) horarios.set(`${e.service.hora_inicio ?? ''}|${e.service.hora_fin ?? ''}`, e.service)
    const unico = horarios.size === 1 ? Array.from(horarios.values())[0] : null
    return {
      fecha, tarjetas, otros, nota: notaDelDia(tarjetas), bloqueado: bloqueados.has(fecha),
      horario: unico ? horarioTexto(unico.hora_inicio, unico.hora_fin) : null, horaPorTarjeta: horarios.size > 1,
    }
  })
}
