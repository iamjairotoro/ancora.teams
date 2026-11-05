// La ventana de asignar del LÍDER (teléfono, etapa 4): quiénes pueden ocupar un cupo y qué se avisa de cada persona. PURA, sobre lo que /api/lider/servicio ya entregó de SU equipo (nada se pide aquí).
//  · «Tienen {posición} en su perfil» (primero) y «Otras personas del equipo»; solo integrantes de SU equipo.
//  · Avisos: «Sin otra asignación», «Ya asignada en X» (una posición de su equipo; de otro equipo, solo el nombre del equipo) y «Bloqueó este día».
//  · «Bloqueó este día» sale deshabilitado SOLO en la pantalla: el servidor (/api/lider/asignar) no cambia y no lo impide; «Ya asignada en X» solo avisa.
import type { IntegrantePropio } from '@/lib/lider/servicioLider'
import { TEXTOS_LIDER_SERVICIO as TS, yaAsignadaEnX } from '@/lib/textos/servicioLider'

export interface OpcionLider { id: string; nombre: string; iniciales: string; detalle: string; disponible: boolean; esActual: boolean; conPerfil: boolean }

const sinTildes = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const iniciales = (n: string, a: string) => `${n[0] ?? ''}${a[0] ?? ''}`.toLocaleUpperCase('es')

export function opcionesDeAsignar(p: { integrantes: readonly IntegrantePropio[]; posicionId: string; actualId?: string | null }): OpcionLider[] {
  return p.integrantes.map(i => {
    const esActual = i.id === p.actualId
    const donde = i.asignadaEn.filter(x => !(esActual && x.posicion === p.posicionId)).map(x => x.nombre)
    const partes = [...(i.bloqueo ? [TS.bloqueoDia] : []), ...(donde.length ? [yaAsignadaEnX(donde.join(', '))] : [])]
    return { id: i.id, nombre: `${i.nombre} ${i.apellido}`.trim(), iniciales: iniciales(i.nombre, i.apellido), detalle: partes.join(' · ') || TS.sinOtraAsignacion, disponible: !i.bloqueo, esActual, conPerfil: i.posiciones.includes(p.posicionId) }
  }).sort((a, b) => Number(b.disponible) - Number(a.disponible) || a.nombre.localeCompare(b.nombre, 'es'))
}

/** La búsqueda de la ventana: por nombre, sin importar mayúsculas ni tildes. */
export const filtrarPorNombre = <T extends { nombre: string }>(ops: readonly T[], q: string): T[] => { const t = sinTildes(q.trim()); return t ? ops.filter(o => sinTildes(o.nombre).includes(t)) : ops.slice() }

export interface CifrasEquipo { cupos: number; asignados: number; confirmados: number; faltan: number }
/** Las cuentas de la tarjeta del equipo: cupos pedidos, asignados, confirmados y los que faltan por confirmar. */
export function cifrasDeEquipo(posiciones: readonly { cupos: number; slots: readonly { persona: { estado: string } | null }[] }[]): CifrasEquipo {
  const cupos = posiciones.reduce((n, p) => n + p.cupos, 0)
  const slots = posiciones.flatMap(p => p.slots)
  const asignados = slots.filter(s => s.persona).length, confirmados = slots.filter(s => s.persona?.estado === 'confirmo').length
  return { cupos, asignados, confirmados, faltan: Math.max(0, cupos - confirmados) }
}
