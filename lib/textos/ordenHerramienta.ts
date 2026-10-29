// Textos de la herramienta «Orden del servicio» en TELÉFONO (components/orden/OrdenTelefono.tsx y HojasOrden.tsx; tableros Orden-Herramienta-A y B). El escritorio conserva su panel de siempre, con sus textos.
import { contar } from './plural'

export const TEXTOS_ORDEN_HERRAMIENTA = {
  titulo: 'Orden del servicio',
  anadir: 'Añadir',
  accionesAria: 'Acciones del Orden del servicio',
  duracionTotal: 'Duración total',
  bloque: 'Bloque',
  sinItems: 'Sin ítems. Agrega una canción o bloque.',
  nota: 'Nota',
  // hoja del ⋯ (mismos títulos y orden que el menú de escritorio)
  aplicar: 'Aplicar plantilla…',
  guardarComoPlantilla: 'Guardar como plantilla',
  actualizar: 'Actualizar',
  sinPlantillaAplicada: 'No hay ninguna plantilla aplicada',
  vaciar: 'Vaciar',
  quitarHerramienta: 'Quitar esta herramienta',
  cancelar: 'Cancelar',
  // hoja de «Añadir»
  anadirAlOrden: 'Añadir al orden',
  cancion: 'Canción',
  bloquePersonalizado: 'Bloque personalizado',
  actualizarAccion: 'Actualizar',
} as const

/** «4 ítems · 59:18» (sin el total mientras no haya ítems). */
export const resumenOrden = (n: number, total: string): string => (n === 0 ? contar(0, 'ítem', 'ítems') : `${contar(n, 'ítem', 'ítems')} · ${total}`)

/** La confirmación (solo teléfono) antes de pisar la plantilla aplicada con el orden actual. */
export const confirmarActualizarPlantilla = (nombre: string): string =>
  `Se actualizará la plantilla «${nombre}» con el orden actual. También cambia los servicios nuevos que la usen. ¿Continuar?`
