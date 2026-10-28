// Textos del checklist por posición (teléfono). Tuteo chileno neutro. NADA promete actualización en vivo: la pantalla se pide al abrirla y al volver a la app, y el botón «Actualizar» la pide a mano (el texto solo dice lo del botón).
import { contar } from './plural'

export const TEXTOS_CHECKLIST = {
  tuPosicion: 'Tu posición',
  tusPosiciones: 'Tus posiciones',
  soloLoTuyo: 'Solo ves lo de tu posición. El líder del equipo ve el checklist completo.',
  soloLoTuyoVarias: 'Solo ves lo de tus posiciones. El líder del equipo ve el checklist completo.',
  liderIntro: 'Se divide por posición. Cada persona ve solo la suya.',
  nominaNota: 'Las posiciones salen de la nómina de este domingo. Si una posición no tiene persona, solo tú ves sus ítems.',
  sinPersona: 'Sin persona este domingo',
  pendiente: 'Pendiente de confirmar',
  general: 'General',
  actualizaNota: 'Toca «Actualizar» si no ves un cambio.',
  actualizar: 'Actualizar',
  actualizando: 'Actualizando…',
  noSePudoActualizar: 'No se pudo actualizar. Revisa tu conexión e inténtalo de nuevo.',
  sinItems: 'Esta posición todavía no tiene ítems.',
  sinChecklist: 'Tu equipo todavía no tiene un checklist para este servicio.',
  noSePudoGuardar: 'No se pudo guardar. Inténtalo de nuevo.',
  sinPermiso: 'No tienes un checklist en este servicio.',
  anadirItem: 'Añadir ítem',
  nuevaSeccion: 'Nueva sección',
  crearChecklist: 'Crear checklist',
  sinChecklistLider: 'Este equipo todavía no tiene un checklist para este servicio.',
  soloLoVesTu: 'Solo lo ves tú',
  escribeItem: 'Escribe el ítem',
  tituloSeccion: 'Título de la sección',
  guardar: 'Guardar',
  cancelar: 'Cancelar',
  editarTexto: 'Editar texto',
  moverAOtroGrupo: 'Mover a otro grupo',
  moverTitulo: 'Mover a…',
  sinSeccion: 'Sin sección',
  eliminar: 'Eliminar',
  renombrar: 'Renombrar',
  eliminarSeccion: 'Eliminar sección',
  accionesDeItem: 'Acciones del ítem',
  accionesDeSeccion: 'Acciones de la sección',
  accionesDelChecklist: 'Acciones del checklist',
} as const

export const listosDe = (listos: number, total: number): string => `${listos} de ${total} listos`
export const faltan = (n: number): string => `Faltan ${n}`
export const marcadoPor = (quien: string, hora: string): string => `${quien} · ${hora}`
export const loMarcasteTu = (hora: string): string => `Lo marcaste tú · ${hora}`
/** Aviso al líder cuando una plantilla trae posiciones que ese domingo no existen. */
export const plantillaFuera = (nombres: string[]): string => (nombres.length === 1 ? `Esta posición no existe este domingo y no se aplicó: ${nombres[0]}.` : `Estas posiciones no existen este domingo y no se aplicaron: ${nombres.join(', ')}.`)
/** «Pasará a Luces»: al elegir un destino de otra posición. */
export const pasaraA = (posicion: string): string => `Pasará a ${posicion}`
export const confirmarEliminarMarcado = 'Este ítem ya está marcado. Si lo eliminas, se pierde quién y cuándo lo marcó.'
export const confirmarEliminarSeccion = (titulo: string, n: number): string => `${n === 1 ? 'El ítem' : `Los ${n} ítems`} de «${titulo}» ${n === 1 ? 'queda suelto' : 'quedan sueltos'} en su posición. ¿Eliminar la sección?`
export const añadeA = (titulo: string): string => `Se añade a «${titulo}»`
export const itemsDe = (n: number): string => contar(n, 'ítem', 'ítems')
