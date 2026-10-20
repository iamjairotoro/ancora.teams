import { contar, plural } from './plural'
// Textos de la lista de Servicios en teléfono (components/servicio-movil). Una sola fuente, como lib/textos/home.ts; los de «Sin convocar» y «N de M confirmados» se toman de ahí para que digan lo mismo que el Home.
export const TEXTOS_SERVICIO = {
  titulo: 'Servicios',
  nuevoServicio: 'Nuevo servicio',
  filtroEquipo: 'Filtrar por equipo',
  todos: 'Todos',
  proximos: 'Próximos',
  historial: 'Historial',
  verHistorial: 'Ver historial',
  ocultarHistorial: 'Ocultar historial',
  convocar: 'Convocar',
  completo: 'Completo',
  volver: 'Servicios',
  volverA: 'Volver a Servicios',
  sinProximos: 'No hay servicios próximos',
  sinProximosAyuda: 'Crea el primero con el botón +.',
  sinProximosDelEquipo: 'Este equipo no tiene servicios próximos.',
  sinHistorial: 'Todavía no hay servicios anteriores.',
  noSePudieronCargar: 'No se pudieron cargar los servicios',
  cargando: 'Cargando…',
  // Hoja «Nuevo servicio»
  tipo: 'Tipo',
  tipoServicio: 'Servicio',
  tipoEnsayo: 'Ensayo',
  tipoOtro: 'Otro',
  dependeDe: 'Depende de',
  elegirServicio: 'Elige un servicio',
  fecha: 'Fecha',
  horaInicio: 'Hora de inicio',
  horaFin: 'Hora de fin',
  lugar: 'Lugar (opcional)',
  lugarEjemplo: 'Sala de ensayo',
  direccion: 'Dirección (opcional)',
  direccionEjemplo: 'Av. Siempre Viva 123',
  mapa: 'Enlace de Google Maps (opcional)',
  mapaEjemplo: 'https://maps.google.com/...',
  ensayoAyuda: 'El ensayo hereda las canciones y la nómina del servicio que elijas: no hace falta armar setlist ni nómina aparte.',
  crear: 'Crear',
  creando: 'Creando…',
  noSePudoCrear: 'No se pudo crear el servicio. Revisa tu conexión e intenta de nuevo.',
  // Pantalla del servicio (teléfono)
  cambiarServicio: 'Cambiar de servicio',
  sinServiciosFuturos: 'Sin servicios futuros.',
  masAcciones: 'Más acciones',
  duplicarServicio: 'Duplicar servicio',
  duplicarAFecha: 'Duplicar a la fecha',
  duplicar: 'Duplicar',
  eliminarServicio: 'Eliminar servicio',
  horario: 'Horario',
  cambiarHorario: 'Cambiar horario',
  guardar: 'Guardar',
  guardando: 'Guardando…',
  noSePudoGuardarHorario: 'No se pudo guardar el horario. Revisa tu conexión e intenta de nuevo.',
  archivado: 'Archivado',
  enVivo: 'En vivo',
  equipos: 'Equipos',
  equiposAyuda: 'Elige un equipo para ver a su gente y sus herramientas.',
  ordenDelServicio: 'Orden del servicio',
  todoCubierto: 'Todo cubierto',
  sinAsignar: 'Sin asignar',
  enviando: 'Enviando…',
  sinEquipos: 'Todavía no hay equipos.',
  sinEquiposAyuda: 'Créalos en Gestionar equipos.',
  irAPersonas: 'Ir a Personas',
  servicioNoEncontrado: 'No encontramos este servicio',
  servicioNoEncontradoAyuda: 'Puede que se haya eliminado.',
  noSePudoCargarServicios: 'No se pudo cargar Servicios',
  // Pantalla del equipo y de las herramientas
  herramientasDelEquipo: 'Herramientas del equipo',
  voluntarios: 'Voluntarios',
  anadirHerramienta: 'Añadir',
  anadirHerramientaTitulo: 'Añadir una herramienta',
  sinHerramientas: 'Este equipo no tiene ninguna herramienta todavía. Añade una con el botón «Añadir».',
  sinVoluntarios: 'Todavía no hay nadie asignado en este equipo.',
  porNotificar: 'Por notificar',
  sinResponder: 'Sin responder',
  noPuede: 'No puede',
  reconfirmar: 'Su rol cambió: necesita reconfirmar',
  bloqueoFecha: 'Bloqueó esta fecha',
  verPersona: 'Ver persona',
  aceptaronEnOtroEquipo: 'Aceptaron en otro equipo',
  suLugarQuedoVacante: 'su lugar quedó vacante',
  alguien: 'Alguien',
  persona: 'Persona',
  equipoNoEncontrado: 'No encontramos este equipo',
  herramientaNoEncontrada: 'No encontramos esta herramienta',
  herramientaNoEncontradaAyuda: 'Puede que se haya quitado.',
  quitarHerramienta: 'Quitar esta herramienta',
  accionesDe: 'Acciones de',
  volverAlServicio: 'Volver al servicio',
  herramientaOrden: 'Orden',
  herramientaCronograma: 'Cronograma',
  herramientaChecklist: 'Checklist',
  herramientaNotas: 'Notas',
} as const

/** El nombre corto de una herramienta en el teléfono (la «Setlist» del equipo se llama «Orden»). */
export const nombreDeHerramienta = (tipo: string): string => (tipo === 'setlist' ? TEXTOS_SERVICIO.herramientaOrden : tipo === 'schedule' ? TEXTOS_SERVICIO.herramientaCronograma : tipo === 'checklist' ? TEXTOS_SERVICIO.herramientaChecklist : TEXTOS_SERVICIO.herramientaNotas)
/** «5 sin cubrir» (posiciones sin persona en todo el servicio). */
export const sinCubrirN = (n: number): string => `${n} sin cubrir`
/** «Notificar a 2 nuevos» / «Notificar a 1 nuevo». */
export const notificarNuevos = (n: number): string => `Notificar a ${n} ${plural(n, 'nuevo', 'nuevos')}`
/** La pregunta antes de enviar la convocatoria (llega por correo y como notificación). */
export const confirmarNotificar = (n: number): string => `¿Notificar a ${n} ${plural(n, 'persona nueva', 'personas nuevas')}? Les llegará la convocatoria por correo y notificación.`
/** «Falta Drums» / «Faltan 2 · Drums» (una tarjeta punteada por posición con cupos libres). */
export const faltaPosicion = (nombre: string, n: number): string => (n === 1 ? `Falta ${nombre}` : `Faltan ${n} · ${nombre}`)
/** «4 herramientas» / «1 herramienta». */
export const herramientasN = (n: number): string => contar(n, 'herramienta', 'herramientas')

/** «Falta 1» / «Faltan 3»: posiciones (cupos) sin persona en el equipo. */
export const faltan = (n: number): string => `${plural(n, 'Falta', 'Faltan')} ${n}`
/** «2 sin responder» (convocadas que no respondieron). */
export const sinResponderN = (n: number): string => `${n} sin responder`
/** Descripción accesible de una fila de la lista: «Alabanza, domingo 25 de octubre, …». */
export const abrirFila = (nombre: string, cuando: string): string => `${nombre}, ${cuando}`
