import { plural } from './plural'
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
} as const

/** «Falta 1» / «Faltan 3»: posiciones (cupos) sin persona en el equipo. */
export const faltan = (n: number): string => `${plural(n, 'Falta', 'Faltan')} ${n}`
/** «2 sin responder» (convocadas que no respondieron). */
export const sinResponderN = (n: number): string => `${n} sin responder`
/** Descripción accesible de una fila de la lista: «Alabanza, domingo 25 de octubre, …». */
export const abrirFila = (nombre: string, cuando: string): string => `${nombre}, ${cuando}`
