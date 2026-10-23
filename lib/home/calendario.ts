// El calendario compartido de los dos Home en teléfono (mockups Home-Usuario-A y Home-Admin-A): vista Semana o Mes, botón «Hoy», el día de hoy con anillo, el día elegido relleno y bajo cada día sus marcas
// (relleno = servicio, anillo = ensayo, raya = bloqueado). Sin tarjeta de detalle: tocar un día con servicio abre ese servicio; un día vacío no hace nada. PURAS, sin datos ni servidor; todas las fechas son
// AAAA-MM-DD del día de Chile (quien llama pasa `hoy`, p. ej. hoyEnSantiago()). Lunes es el primer día.
import type { ServicioResumen } from '@/lib/admin/resumenServicios'
import { equiposVisiblesDelResumen } from '@/lib/admin/equiposDelResumen'
import type { Viewer } from '@/lib/teamBlocks'
import { estadoConvocatoria } from '@/lib/convocatoriaEstado'

export const LETRAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export type TipoMarca = 'servicio' | 'ensayo' | 'bloqueado'
export interface MarcaDia { tipo: TipoMarca; color: string | null; servicioId?: string; equipoId?: string | null }
export interface DiaCal { fecha: string; numero: number; letra: string; delMes: boolean; esHoy: boolean }

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/
const aMs = (f: string): number => { const m = ISO.exec(f); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], 12) : NaN }
const aIso = (ms: number): string => new Date(ms).toISOString().slice(0, 10)
export const sumarDias = (fecha: string, n: number): string => aIso(aMs(fecha) + n * 86400000)
/** 0 = lunes … 6 = domingo. */
const lunes0 = (fecha: string): number => (new Date(aMs(fecha)).getUTCDay() + 6) % 7

/** Los siete días (lunes a domingo) de la semana que contiene `fecha`. */
export function semanaDe(fecha: string, hoy: string = fecha): DiaCal[] {
  if (!ISO.test(fecha)) return []
  const inicio = sumarDias(fecha, -lunes0(fecha))
  return LETRAS_SEMANA.map((letra, i) => { const f = sumarDias(inicio, i); return { fecha: f, numero: +f.slice(8), letra, delMes: f.slice(0, 7) === fecha.slice(0, 7), esHoy: f === hoy } })
}

/** El mes en filas de siete días (semanas completas, lunes a domingo); los días de los meses vecinos van con `delMes: false`. */
export function mesDe(anio: number, mes: number, hoy: string = ''): DiaCal[][] {
  if (mes < 1 || mes > 12) return []
  const primero = `${anio}-${String(mes).padStart(2, '0')}-01`, filas: DiaCal[][] = []
  let cursor = sumarDias(primero, -lunes0(primero))
  do {
    filas.push(LETRAS_SEMANA.map((letra, i) => { const f = sumarDias(cursor, i); return { fecha: f, numero: +f.slice(8), letra, delMes: +f.slice(5, 7) === mes && +f.slice(0, 4) === anio, esHoy: f === hoy } }))
    cursor = sumarDias(cursor, 7)
  } while (+cursor.slice(5, 7) === mes && +cursor.slice(0, 4) === anio)
  return filas
}

/** «Octubre 2026». */
export const tituloMes = (anio: number, mes: number): string => `${MESES[mes - 1]} ${anio}`
/** Mes anterior (−1) o siguiente (+1). */
export const moverMes = (m: { anio: number; mes: number }, n: number): { anio: number; mes: number } => { const t = m.anio * 12 + (m.mes - 1) + n; return { anio: Math.floor(t / 12), mes: (t % 12) + 1 } }

const ORDEN: Record<TipoMarca, number> = { servicio: 0, ensayo: 1, bloqueado: 2 }
const ordenar = (m: Map<string, MarcaDia[]>): Map<string, MarcaDia[]> => { for (const l of Array.from(m.values())) l.sort((a, b) => ORDEN[a.tipo] - ORDEN[b.tipo]); return m }

export interface EntradaMarca {
  service: { id: string; fecha: string; tipo?: string }
  team?: { id: string; color: string | null } | null
  invitation: { status: string; declined_reason?: string | null; sent_at?: string | null } | null
}

/** Marcas del usuario: SOLO sus propias convocatorias y ensayos (enviadas y que siguen en pie: pendientes o confirmadas; con el color de su equipo) y los días que bloqueó. */
export function marcasDeUsuario(entradas: EntradaMarca[], diasBloqueados: Iterable<string> = []): Map<string, MarcaDia[]> {
  const out = new Map<string, MarcaDia[]>(), poner = (f: string, m: MarcaDia) => { const l = out.get(f) ?? []; if (!l.some(x => x.tipo === m.tipo && x.servicioId === m.servicioId && x.equipoId === m.equipoId)) l.push(m); out.set(f, l) }
  for (const e of entradas) {
    if (!e.invitation?.sent_at || !['pendiente', 'confirmado'].includes(estadoConvocatoria(e.invitation) ?? '')) continue
    poner(e.service.fecha, { tipo: e.service.tipo === 'ensayo' ? 'ensayo' : 'servicio', color: e.team?.color ?? null, servicioId: e.service.id, equipoId: e.team?.id ?? null })
  }
  for (const f of Array.from(diasBloqueados)) poner(f, { tipo: 'bloqueado', color: null })
  return ordenar(out)
}

/** Los días que la persona bloqueó en CUALQUIERA de sus equipos (o para todos): a diferencia de diasBloqueadosParaTodos, un solo equipo basta. */
export function diasBloqueadosEnAlguno(filas: { blocked_date?: string | null; service?: { fecha?: string | null } | null }[]): Set<string> {
  const out = new Set<string>(); for (const f of filas) { const d = f.blocked_date || f.service?.fecha; if (d) out.add(d) } return out
}

/** Marcas del admin: por servicio y por equipo que participa (un punto del color del equipo; el ensayo, anillo). Un líder, solo sus equipos. Un servicio sin equipos todavía lleva un punto neutro. */
export function marcasDeAdmin(servicios: ServicioResumen[], v: Viewer): Map<string, MarcaDia[]> {
  const out = new Map<string, MarcaDia[]>()
  for (const s of servicios) {
    const tipo: TipoMarca = s.tipo === 'ensayo' ? 'ensayo' : 'servicio', l = out.get(s.fecha) ?? []
    if (s.equipos.length === 0) l.push({ tipo, color: null, servicioId: s.id, equipoId: null })
    else for (const e of equiposVisiblesDelResumen(s.equipos, v)) l.push({ tipo, color: e.color, servicioId: s.id, equipoId: e.teamId })
    if (l.length) out.set(s.fecha, l)
  }
  return ordenar(out)
}

/** A qué servicio lleva tocar el día: el primero con servicio o ensayo; null si el día no tiene (un día solo bloqueado o vacío no hace nada). */
export const servicioDelDia = (marcas: MarcaDia[] | undefined): { servicioId: string; equipoId: string | null } | null => { const m = (marcas ?? []).find(x => x.servicioId); return m ? { servicioId: m.servicioId!, equipoId: m.equipoId ?? null } : null }

/** Las marcas que se dibujan bajo un día: como mucho tres (servicio, ensayo, bloqueado), cada tipo una vez por equipo distinto. */
export const marcasVisibles = (marcas: MarcaDia[] | undefined, maximo = 3): MarcaDia[] => (marcas ?? []).slice(0, maximo)
