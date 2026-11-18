// De los datos que el servidor le da al LÍDER (lib/lider/servicioLider.ts) a lo que dibujan las pantallas compartidas con el administrador (servicio-movil/PantallaServicio y VistaEquipo). PURAS.
// Las cuentas son las del administrador: «vacantes» = cupos que nadie ocupa (no «sin confirmar»), «confirmados» sobre «asignados».
import type { ToolType } from '@/lib/types'
import { avataresDeTarjeta } from '@/lib/admin/servicioMovil'
import type { EquipoAjeno, EquipoLider, EquipoPropio, TipoHerramienta } from '@/lib/lider/servicioLider'
import { TEXTOS_SERVICIO as T, nombreDeHerramienta } from '@/lib/textos/servicio'
import { confirmadosDe } from '@/lib/textos/home'
import type { DatosTarjetaEquipo } from '../servicio-movil/PantallaServicio'
import type { PersonaVista, PosicionVista } from '../servicio-movil/VistaEquipo'

export const iniciales = (nombre: string, apellido: string): string => `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toLocaleUpperCase('es')
const nombreCompleto = (nombre: string, apellido: string) => `${nombre} ${apellido}`.trim()
export const TIPO_DE_HERRAMIENTA: Record<TipoHerramienta, ToolType> = { checklist: 'checklist', schedule: 'schedule', notes: 'notes' }
export const nombreDeTipo = (t: TipoHerramienta): string => nombreDeHerramienta(TIPO_DE_HERRAMIENTA[t])

export interface CuentasLider { asignados: number; confirmados: number; cupos: number; vacantes: number }

/** Las posiciones tal como las dibuja VistaEquipo (propio y ajeno), con las iniciales en el orden en que se muestran. */
export function posicionesVista(e: EquipoLider): PosicionVista[] {
  if (e.tuEquipo) {
    return e.posiciones.map(p => {
      const personas: PersonaVista[] = p.slots.flatMap(s => s.persona ? [{
        clave: `${p.id}-${s.slot}`, iniciales: iniciales(s.persona.nombre, s.persona.apellido), nombre: nombreCompleto(s.persona.nombre, s.persona.apellido),
        estado: s.persona.estado === 'confirmo' ? 'confirmado' as const : s.persona.estado === 'declino' ? 'rechazo' as const : 'pendiente' as const,
        estadoTexto: s.persona.estado === 'confirmo' ? 'Confirmó' : s.persona.estado === 'declino' ? 'Declinó' : 'Sin responder',
      }] : [])
      return { id: p.id, nombre: p.nombre, asignadas: personas.length, cupos: p.cupos, personas, libres: Math.max(0, p.cupos - personas.length) }
    })
  }
  return e.posiciones.map((p, i) => {
    // Las personas de un equipo ajeno vienen sin ids de posición: se agrupan por el nombre de la posición.
    const personas: PersonaVista[] = e.personas.filter(x => x.posicion === p.nombre).map((x, k) => ({
      clave: `${i}-${k}`, iniciales: iniciales(x.nombre, x.apellido), nombre: nombreCompleto(x.nombre, x.apellido),
      estado: x.estado === 'confirmo' ? 'confirmado' as const : 'pendiente' as const, estadoTexto: x.estado === 'confirmo' ? 'Confirmó' : 'Sin responder',
    }))
    return { id: `${i}`, nombre: p.nombre, asignadas: personas.length, cupos: Math.max(p.cupos, personas.length), personas, libres: Math.max(0, p.cupos - personas.length) }
  })
}

export function cuentasDe(e: EquipoLider): CuentasLider {
  const pos = posicionesVista(e)
  return {
    asignados: pos.reduce((n, p) => n + p.asignadas, 0), cupos: pos.reduce((n, p) => n + p.cupos, 0), vacantes: pos.reduce((n, p) => n + p.libres, 0),
    confirmados: pos.reduce((n, p) => n + p.personas.filter(x => x.estado === 'confirmado').length, 0),
  }
}

export const resumenDe = (c: CuentasLider): string => (c.asignados > 0 ? confirmadosDe(c.confirmados, c.asignados) : T.sinAsignar)
export const tiposDe = (e: EquipoLider): TipoHerramienta[] => (e.tuEquipo ? e.herramientas.map(h => h.tipo) : e.herramientas)

export function tarjetaDe(e: EquipoLider): DatosTarjetaEquipo {
  const c = cuentasDe(e), pos = posicionesVista(e)
  return {
    teamId: e.id, nombre: e.nombre, color: e.color, subtitulo: resumenDe(c), vacantes: c.vacantes,
    avatares: avataresDeTarjeta(pos.flatMap(p => p.personas.map(x => x.iniciales)), c.vacantes),
    herramientas: tiposDe(e).map(t => TIPO_DE_HERRAMIENTA[t]), tuEquipo: e.tuEquipo, soloLectura: !e.tuEquipo,
  }
}

/** Las cuentas de TODO el servicio para la ficha de la fecha (la suma de los equipos que el líder ve). */
export function cuentasDelServicio(equipos: EquipoLider[]): CuentasLider & { porcentaje: number } {
  const t = equipos.map(cuentasDe).reduce((a, c) => ({ asignados: a.asignados + c.asignados, confirmados: a.confirmados + c.confirmados, cupos: a.cupos + c.cupos, vacantes: a.vacantes + c.vacantes }), { asignados: 0, confirmados: 0, cupos: 0, vacantes: 0 })
  return { ...t, porcentaje: t.asignados > 0 ? Math.round((t.confirmados / t.asignados) * 100) : 0 }
}

export type { EquipoAjeno, EquipoPropio }
