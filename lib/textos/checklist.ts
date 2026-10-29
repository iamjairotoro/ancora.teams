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
  plantillas: 'Plantillas',
  plantillasAyuda: 'Agrega los ítems de una plantilla a este checklist. No se borra ni se cambia nada de lo que ya hay.',
  sinPlantillas: 'Este equipo todavía no tiene plantillas.',
  domingoPasado: 'Empezar con el del domingo pasado',
  domingoPasadoAyuda: 'Copia los ítems sin marcar',
  sinDomingoPasado: 'Todavía no hay un checklist anterior de este equipo',
  guardarComoPlantilla: 'Guardar este como plantilla',
  guardarPlantillaIntro: 'Se guarda lo que hay ahora en este checklist, por posición y sección, sin marcas ni personas.',
  nombrePlantilla: 'Nombre de la plantilla',
  predeterminada: 'Predeterminada',
  empezarConPlantilla: 'Empezar con una plantilla',
  cerrar: 'Cerrar',
  aplicarAccion: 'Aplicar',
  reemplazarAccion: 'Reemplazar',
  nadaNuevo: 'No hay nada nuevo para agregar: todo ya está en este checklist.',
  vacioParaGuardar: 'Este checklist todavía no tiene ítems para guardar.',
  cambioElChecklist: 'El checklist cambió mientras decidías. Revisa los números y vuelve a confirmar.',
  nombreAmbiguo: 'Hay más de una plantilla con ese nombre. Usa otro nombre.',
  noSePudoPlantillas: 'No se pudieron cargar las plantillas. Inténtalo de nuevo.',
} as const

export const listosDe = (listos: number, total: number): string => `${listos} de ${total} listos`
export const faltan = (n: number): string => `Faltan ${n}`
export const marcadoPor = (quien: string, hora: string): string => `${quien} · ${hora}`
export const loMarcasteTu = (hora: string): string => `Lo marcaste tú · ${hora}`
/** «Pasará a Luces»: al elegir un destino de otra posición. */
export const pasaraA = (posicion: string): string => `Pasará a ${posicion}`
export const confirmarEliminarMarcado = 'Este ítem ya está marcado. Si lo eliminas, se pierde quién y cuándo lo marcó.'
export const confirmarEliminarSeccion = (titulo: string, n: number): string => `${n === 1 ? 'El ítem' : `Los ${n} ítems`} de «${titulo}» ${n === 1 ? 'queda suelto' : 'quedan sueltos'} en su posición. ¿Eliminar la sección?`
export const añadeA = (titulo: string): string => `Se añade a «${titulo}»`
export const itemsDe = (n: number): string => contar(n, 'ítem', 'ítems')

// ── plantillas ──
const ítems = (n: number) => `${n} ${n === 1 ? 'ítem' : 'ítems'}`
/** Detalle de una plantilla en la lista: «7 ítems · 3 posiciones»; las viejas (sin posiciones), solo «7 ítems». */
/** Título de la ventana de plantillas. */
export const plantillasDe = (equipo: string): string => `Plantillas de ${equipo}`
export const detallePlantilla = (items: number, posiciones: number | null): string => (posiciones === null ? ítems(items) : `${ítems(items)} · ${posiciones} ${posiciones === 1 ? 'posición' : 'posiciones'}`)
export interface ResumenPlan { agregar: number; omitir: number; sinPosiciones: number; aGeneral: { nombre: string; items: number }[] }
/** Aviso de ítems que van a «General» porque su posición no existe este domingo. `futuro` = en la confirmación (antes de aplicar). */
export const avisoGeneral = (aGeneral: { nombre: string; items: number }[], futuro: boolean): string[] =>
  aGeneral.map(x => `${ítems(x.items)} de «${x.nombre}» ${futuro ? (x.items === 1 ? 'pasará' : 'pasarán') : (x.items === 1 ? 'pasó' : 'pasaron')} a General porque esa posición no existe este domingo.`)
export const avisoSinPosiciones = (n: number): string => `Esta plantilla no tiene posiciones: ${n === 1 ? 'el ítem va' : `los ${n} ítems van`} a General y puedes moverlos después.`
/** Texto de la confirmación de aplicar (lo calcula el servidor; aquí solo se redacta). Empieza con la pregunta: la ventana centrada la usa de título y deja el resto como detalle. */
export function confirmarAplicar(r: ResumenPlan): string {
  const detalle: string[] = []
  if (r.omitir > 0) detalle.push(`${r.omitir} ya ${r.omitir === 1 ? 'estaba y se omite' : 'estaban y se omiten'}.`)
  if (r.sinPosiciones > 0) detalle.push(avisoSinPosiciones(r.sinPosiciones))
  detalle.push(...avisoGeneral(r.aGeneral, true))
  detalle.push('No se borra ni se cambia nada de lo que ya hay.')
  return `¿Agregar ${ítems(r.agregar)} a este checklist? ${detalle.join(' ')}`
}
/** Resultado al terminar de aplicar. */
export function aplicadoAviso(r: ResumenPlan): string {
  const omit = r.omitir > 0 ? ` (${r.omitir} ya ${r.omitir === 1 ? 'estaba' : 'estaban'})` : ''
  return [`Se ${r.agregar === 1 ? 'agregó' : 'agregaron'} ${ítems(r.agregar)}${omit}.`, ...avisoGeneral(r.aGeneral, false)].join(' ')
}
/** La pregunta va al final: la ventana centrada la usa de título y deja lo demás como detalle. */
export const existeConfirmar = (nombre: string, predeterminada: boolean): string =>
  `Ya existe «${nombre}».${predeterminada ? ' Es la plantilla predeterminada de servicios: también cambia los servicios nuevos.' : ''} ¿Reemplazarla?`
export const predeterminadaBloqueada = (nombre: string, sugerencia: string): string =>
  `«${nombre}» es la plantilla predeterminada de servicios y solo la puede reemplazar un administrador. Guarda con otro nombre, por ejemplo «${sugerencia}».`
export const plantillaGuardada = (nombre: string, reemplazo: boolean): string => `Plantilla «${nombre}» ${reemplazo ? 'reemplazada' : 'guardada'}.`
