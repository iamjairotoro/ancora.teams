// Las cifras del Home del admin en teléfono (mockup Home-Admin-A), armadas del resumen de servicios por equipo (lib/admin/resumenServicios.ts). PURAS. Solo conteos: nunca un porcentaje de una persona.
// Un líder ve todo recortado a sus equipos (citados, cobertura, tarjetas).
import type { EquipoDeServicio, ServicioResumen } from '@/lib/admin/resumenServicios'
import { equiposVisiblesDelResumen } from '@/lib/admin/equiposDelResumen'
import { filasProximas, type FilaServicio } from '@/lib/admin/listaServicios'
import type { Viewer } from '@/lib/teamBlocks'

/** El próximo SERVICIO (no ensayo) que no terminó y que el visitante puede ver (uno sin equipos todavía también se ve). */
export function proximoServicio(servicios: ServicioResumen[], v: Viewer): ServicioResumen | null {
  return servicios.find(s => !s.terminado && s.tipo === 'servicio' && (s.equipos.length === 0 || equiposVisiblesDelResumen(s.equipos, v).length > 0)) ?? null
}

export interface Cobertura { teamId: string; nombre: string; color: string | null; inicial: string; cubiertos: number; cupos: number }
const inicial = (n: string) => (n.trim()[0] || '?').toLocaleUpperCase('es')
/** Una barra por equipo: puestos cubiertos de los que necesita (asignados de asignados + vacantes), ej. 2/5. */
export function coberturaDe(s: ServicioResumen, v: Viewer): Cobertura[] {
  return equiposVisiblesDelResumen(s.equipos, v).map(e => ({ teamId: e.teamId, nombre: e.nombre, color: e.color, inicial: inicial(e.nombre), cubiertos: e.asignados, cupos: e.asignados + e.vacantes }))
}

/** «Voluntarios Citados»: la suma de las personas convocadas (invitación enviada) por cada equipo para ese servicio. Quien está en dos equipos cuenta dos veces. */
export const voluntariosCitados = (s: ServicioResumen, v: Viewer): number => equiposVisiblesDelResumen(s.equipos, v).reduce((n, e) => n + e.convocados, 0)

export interface CifrasAdmin { equipos: number; citados: number; conApp: number; deTotal: number }
/** Las tres cifras: equipos (los que ve), voluntarios citados del próximo servicio y «con la app» = personas con la app instalada (instalado_pwa_at) sobre todas las personas que ve. */
export function cifrasAdmin(a: { proximo: ServicioResumen | null; v: Viewer; equipos: number; personas: { instaladaApp: boolean }[] }): CifrasAdmin {
  return { equipos: a.equipos, citados: a.proximo ? voluntariosCitados(a.proximo, a.v) : 0, conApp: a.personas.filter(p => p.instaladaApp).length, deTotal: a.personas.length }
}

export interface TarjetaEquipo { teamId: string; nombre: string; color: string | null; inicial: string; personas: number; /** del próximo servicio; null si el equipo no participa */ cubiertos: number | null; cupos: number | null; confirmados: number | null }
/** Una tarjeta por equipo visible, en el orden dado, con su gente y su estado en el próximo servicio. */
export function tarjetasDeEquipo(a: { equipos: { id: string; name: string; color: string | null }[]; personasPorEquipo: Record<string, number>; proximo: ServicioResumen | null; v: Viewer }): TarjetaEquipo[] {
  const del = new Map<string, EquipoDeServicio>((a.proximo ? equiposVisiblesDelResumen(a.proximo.equipos, a.v) : []).map(e => [e.teamId, e]))
  return a.equipos.filter(t => a.v.kind === 'admin' || a.v.teamIds.has(t.id)).map(t => { const e = del.get(t.id)
    return { teamId: t.id, nombre: t.name, color: t.color, inicial: inicial(t.name), personas: a.personasPorEquipo[t.id] ?? 0, cubiertos: e ? e.asignados : null, cupos: e ? e.asignados + e.vacantes : null, confirmados: e ? e.confirmados : null } })
}

/** «Después»: los servicios siguientes (sin el que ya es la ficha grande), como filas de la lista de Servicios. */
export function despues(servicios: ServicioResumen[], v: Viewer, proximo: ServicioResumen | null, maximo = 3): FilaServicio[] {
  return filasProximas(servicios, v).filter(f => f.servicioId !== proximo?.id).slice(0, maximo)
}
