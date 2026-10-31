// Textos de «Home → Servicios» del LÍDER en teléfono (components/lider-movil; tablero Servicio-Lider-A) y de su menú inferior.
import { contar } from './plural'

export const TEXTOS_LIDER = {
  menuHome: 'Home',
  menuServicios: 'Servicios',
  menuMiEspacio: 'Mi espacio',
  menuEtiqueta: 'Líder',
  servicios: 'Servicios',
  volverAServicios: 'Volver a Servicios',
  ayuda: 'Puedes ver todos los equipos. Solo puedes cambiar el tuyo.',
  tuEquipo: 'Tu equipo',
  soloLectura: 'Solo lectura',
  checklist: 'Checklist',
  confirmo: 'Confirmó',
  sinResponder: 'Sin responder',
  declino: 'Declinó',
  nadieAsignado: 'Nadie asignado todavía.',
  sinServicios: 'No hay servicios programados próximamente.',
  cargando: 'Cargando…',
  noSePudoCargar: 'No se pudo cargar los servicios',
  noSePudoCargarCuerpo: 'Revisa tu conexión e inténtalo de nuevo.',
  reintentar: 'Reintentar',
  sinAcceso: 'No tienes acceso a esta pantalla.',
  volverAlHome: 'Volver al Home',
  verEquipo: 'Ver equipo',
  ocultarEquipo: 'Ocultar equipo',
} as const

export const personasN = (n: number): string => contar(n, 'persona', 'personas')
export const verEquipoN = (nombre: string): string => `${TEXTOS_LIDER.verEquipo}: ${nombre}`
export const ocultarEquipoN = (nombre: string): string => `${TEXTOS_LIDER.ocultarEquipo}: ${nombre}`
