// La lógica del Inicio del portal (punto 54, commit 7). PURA, sin acceso a datos ni a servidor (se prueba aparte):
//   · el SERVICIO DESTACADO es el siguiente servicio (o ensayo) que AÚN NO TERMINÓ —su hora de fin en America/Santiago: lib/servicioTerminado.ts—, aunque las listas lo conserven hasta el cierre del día;
//   · «Lo que viene» son los DOS servicios siguientes, sin repetir el destacado;
//   · cuentan mis convocatorias enviadas que no están declinadas (ni por decisión mía ni por conflicto): pendientes y confirmadas;
//   · «Tienes N convocatorias por responder» no cuenta las cerradas ni las de servicios terminados;
//   · la tira de la semana es la semana (lunes a domingo) de HOY en Chile, con un punto bajo los días en que tengo servicio.
import { estadoConvocatoria } from '@/lib/convocatoriaEstado'
import { servicioTerminado } from '@/lib/servicioTerminado'
import { hoyEnSantiago } from '@/lib/portal/fechas'

export interface EntradaInicio {
  service: { id: string; fecha: string; tipo?: string; titulo?: string; hora_inicio?: string | null; hora_fin?: string | null; lugar?: string }
  team?: { id: string; name: string; color: string | null } | null
  invitation: { status: string; declined_reason?: string | null; sent_at?: string | null; needs_reassignment_confirm?: boolean } | null
  cerrada?: boolean
}
export interface GrupoServicio<E extends EntradaInicio> { service: E['service']; entradas: E[] }

const minutos = (h?: string | null) => { const m = /^(\d{1,2}):(\d{2})/.exec(h || ''); return m ? +m[1] * 60 + +m[2] : 600 }
const orden = (a: EntradaInicio, b: EntradaInicio) => a.service.fecha.localeCompare(b.service.fecha) || minutos(a.service.hora_inicio) - minutos(b.service.hora_inicio) || a.service.id.localeCompare(b.service.id) || (a.team?.name ?? '').localeCompare(b.team?.name ?? '', 'es', { sensitivity: 'base' })

/** Mis convocatorias ENVIADAS que siguen en pie: pendientes o confirmadas (no las declinadas, ni por conflicto). */
export const vigentes = <E extends EntradaInicio>(entradas: E[]): E[] =>
  entradas.filter(e => !!e.invitation?.sent_at && ['pendiente', 'confirmado'].includes(estadoConvocatoria(e.invitation) ?? '')).sort(orden)

const terminado = (e: EntradaInicio, ahora: Date) => servicioTerminado(e.service.fecha, e.service.hora_fin, ahora, e.service.hora_inicio)

/** Lo que aún no terminó, agrupado por servicio (una caja por equipo dentro de cada uno), en orden de fecha y hora. */
export function serviciosPorVenir<E extends EntradaInicio>(entradas: E[], ahora: Date): GrupoServicio<E>[] {
  const grupos = new Map<string, GrupoServicio<E>>()
  for (const e of vigentes(entradas)) {
    if (terminado(e, ahora)) continue
    const g = grupos.get(e.service.id); if (g) g.entradas.push(e); else grupos.set(e.service.id, { service: e.service, entradas: [e] })
  }
  return Array.from(grupos.values())
}

export function proximosServicios<E extends EntradaInicio>(entradas: E[], ahora: Date): { destacado: GrupoServicio<E> | null; siguientes: GrupoServicio<E>[] } {
  const g = serviciosPorVenir(entradas, ahora)
  return { destacado: g[0] ?? null, siguientes: g.slice(1, 3) }
}

/** Convocatorias pendientes de respuesta que se pueden responder aún: enviadas, sin responder, no cerradas y de servicios que no terminaron. */
export function porResponder<E extends EntradaInicio>(entradas: E[], ahora: Date): number {
  return entradas.filter(e => !!e.invitation?.sent_at && estadoConvocatoria(e.invitation) === 'pendiente' && !e.cerrada && !terminado(e, ahora)).length
}

export interface DiaSemana { fecha: string; letra: string; numero: number; esHoy: boolean; pasado: boolean }
const LETRAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
/** Los 7 días (lunes a domingo) de la semana de `hoy` (AAAA-MM-DD, día de Chile). */
export function semanaActual(hoy: string = hoyEnSantiago()): DiaSemana[] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(hoy); if (!m) return []
  const base = Date.UTC(+m[1], +m[2] - 1, +m[3], 12), dow = (new Date(base).getUTCDay() + 6) % 7      // 0 = lunes
  return LETRAS.map((letra, i) => {
    const d = new Date(base + (i - dow) * 86400000), fecha = d.toISOString().slice(0, 10)
    return { fecha, letra, numero: d.getUTCDate(), esHoy: fecha === hoy, pasado: fecha < hoy }
  })
}

export interface PuntoDia { servicioId: string; equipoId: string | null; color: string | null }
/** Por fecha: mis servicios de ese día (un punto del color de su equipo cada uno; un ensayo, sin color), en orden de hora. Cuentan los que ya pasaron este mismo día. */
export function puntosPorFecha(entradas: EntradaInicio[]): Map<string, PuntoDia[]> {
  const out = new Map<string, PuntoDia[]>()
  for (const e of vigentes(entradas)) {
    const l = out.get(e.service.fecha) ?? []
    if (!l.some(p => p.servicioId === e.service.id && p.equipoId === (e.team?.id ?? null))) l.push({ servicioId: e.service.id, equipoId: e.team?.id ?? null, color: e.team?.color ?? null })
    out.set(e.service.fecha, l)
  }
  return out
}

const DIAS3 = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'], MESES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
/** El bloque de fecha de «Lo que viene»: «DOM» · 24 · «oct». */
export function bloqueFecha(fecha: string): { dow: string; dia: number; mes: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha || ''); if (!m) return null
  return { dow: DIAS3[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)).getUTCDay()], dia: +m[3], mes: MESES3[+m[2] - 1] }
}

/** «Hoy» o «5 de octubre» (día y mes, nunca el año) para un cumpleaños. */
export function textoCumple(c: { dia: number; mes: number; enDias: number }): string {
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return c.enDias === 0 ? 'Hoy' : `${c.dia} de ${MESES[c.mes - 1]}`
}
