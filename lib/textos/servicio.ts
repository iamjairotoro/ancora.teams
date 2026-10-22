import { contar, plural } from './plural'
import { TEXTOS_HOME } from './home'
// Textos de la lista de Servicios en teléfono (components/servicio-movil). Una sola fuente, como lib/textos/home.ts; los de «Sin convocar» y «N de M confirmados» se toman de ahí para que digan lo mismo que el Home.
export const TEXTOS_SERVICIO = {
  titulo: 'Servicios',
  nuevoServicio: 'Nuevo servicio',
  proximos: 'Próximos',
  historial: 'Historial',
  verHistorial: 'Ver historial',
  ocultarHistorial: 'Ocultar historial',
  completo: 'Completo',
  convocado: 'Convocado',
  terminado: 'Terminado',
  volver: 'Servicios',
  volverA: 'Volver a Servicios',
  sinProximos: 'No hay servicios próximos',
  sinProximosAyuda: 'Crea el primero con el botón +.',
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
  alCrearElServicio: 'Al crear este servicio',
  cerrarAviso: 'Cerrar aviso',
  archivado: 'Archivado',
  enVivo: 'En vivo',
  equipos: 'Equipos',
  equiposAyuda: 'Elige un equipo para ver a su gente y sus herramientas.',
  ordenDelServicio: 'Orden del servicio',
  todoCubierto: 'Todo cubierto',
  sinAsignar: 'Sin asignar',
  enviando: 'Enviando…',
  confirmarNotificarCuerpo: 'Les llegará la convocatoria por correo.',
  notificar: 'Notificar',
  cancelar: 'Cancelar',
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
  // Pantalla del equipo por posiciones y hoja de posición (B4, Equipo-F/G/H)
  ayudaPosiciones: 'Elige una posición para asignar a alguien o cambiar cuántas personas necesita.',
  personasEnPosicion: 'Personas en esta posición',
  ayudaStepper: 'Puedes bajar hasta el número de personas asignadas.',
  listo: 'Listo',
  volverAPosicion: 'Volver a las personas de esta posición',
  masDeLaPersona: 'Más acciones de la persona',
  asignar: 'Asignar',
  buscarPersona: 'Buscar persona',
  disponible: 'Disponible',
  noDisponible: 'No disponible',
  bloqueoDia: 'Bloqueó este día',
  sinResultados: 'Nadie coincide con tu búsqueda.',
  cambiarPersona: 'Cambiar persona',
  quitarDePosicion: 'Quitar de la posición',
  gestionarPosiciones: 'Gestionar posiciones',
  cuposTitulo: 'Gestionar posiciones',
  cuposAyuda: 'Cuántas personas necesita cada posición en este servicio.',
  editarPosicionesEquipo: 'Editar las posiciones del equipo',
  menosCupos: 'Una persona menos',
  masCupos: 'Una persona más',
  sinPosiciones: 'Este equipo todavía no tiene posiciones.',
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
/** La pregunta de la hoja antes de convocar: «¿Notificar a 2 personas nuevas?» / «¿Notificar a 1 persona nueva?». */
export const confirmarNotificarTitulo = (n: number): string => `¿Notificar a ${n} ${plural(n, 'persona nueva', 'personas nuevas')}?`
/** «Falta Drums» / «Faltan 2 · Drums» (una tarjeta punteada por posición con cupos libres). */
export const faltaPosicion = (nombre: string, n: number): string => (n === 1 ? `Falta ${nombre}` : `Faltan ${n} · ${nombre}`)
/** «4 herramientas» / «1 herramienta». */
export const herramientasN = (n: number): string => contar(n, 'herramienta', 'herramientas')

/** «Falta 1» / «Faltan 3»: posiciones (cupos) sin persona en el equipo. */
export const faltan = (n: number): string => `${plural(n, 'Falta', 'Faltan')} ${n}`
/** «2 sin responder» (convocadas que no respondieron). */
export const sinResponderN = (n: number): string => `${n} sin responder`
/** Lo que lee un lector de pantalla en una fila de la lista: «Servicio Ancora, domingo 25 de octubre». */
/** El aviso azul de la ficha grande: «hoy», «mañana», «en 4 días». null si ya pasó (no se inventa). */
export const enDiasTexto = (dias: number): string | null => (!Number.isFinite(dias) || dias < 0 ? null : dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`)
export const abrirFila = (nombre: string, cuando: string): string => `${nombre}, ${cuando}`
/** «+2 equipos» (los cuadritos que no caben en la fila). */
export const masEquiposN = (n: number): string => `+${n}`
export const masEquiposEtiqueta = (n: number): string => `y ${contar(n, 'equipo más', 'equipos más')}`

/** «Asignar Drums». */
export const asignarA = (posicion: string): string => `Asignar ${posicion}`
/** «Tienen Drums en su perfil» (el encabezado de la lista de la hoja de asignar). */
export const tienenEnPerfil = (posicion: string): string => `Tienen ${posicion} en su perfil`
/** «Toca Drums»: la persona tiene esa posición en su perfil y no hay nada que avisar. */
export const tocaPosicion = (posicion: string): string => `Toca ${posicion}`
/** «Ya asignada en Producción» (otro equipo del mismo servicio). */
export const yaAsignadaEn = (equipos: string): string => `Ya asignada en ${equipos}`
/** «Ya tiene Voces» (otra posición del mismo equipo). */
export const yaTienePosicion = (posiciones: string): string => `Ya tiene ${posiciones}`
/** El mensaje cuando nadie tiene esa posición en su perfil (con el enlace a Personas). */
export const nadieTienePosicion = (posicion: string): string => `Nadie tiene la posición ${posicion} en su perfil. Agrégala en Personas.`
/** «2 personas asignadas» / «1 persona asignada» (en la hoja de cupos). */
export const asignadasN = (n: number): string => contar(n, 'persona asignada', 'personas asignadas')

/** «Voluntarios · 2 de 5». */
export const voluntariosN = (llenos: number, total: number): string => `Voluntarios · ${llenos} de ${total}`
/** «Voces 1»: la posición y el número de su cupo (subtítulo de una persona en la hoja de posición). */
export const posicionN = (nombre: string, slot: number): string => `${nombre} ${slot}`
/** «Falta Voces 2»: un cupo libre de la posición. */
export const faltaCupo = (nombre: string, slot: number): string => `Falta ${nombre} ${slot}`
/** El texto del estado de una persona asignada (el de «Aceptó en {equipo}» lo arma quien conoce el equipo). Sirve también de etiqueta de lectura del punto de color: el estado nunca depende solo del color. */
export const TEXTO_ESTADO_PERSONA = {
  'por-notificar': TEXTOS_SERVICIO.porNotificar, confirmado: TEXTOS_HOME.confirmo, 'sin-responder': TEXTOS_SERVICIO.sinResponder, rechazo: TEXTOS_SERVICIO.noPuede, 'otro-equipo': '', reconfirmar: TEXTOS_SERVICIO.reconfirmar,
} as const

/** Todas las personas que tienen esa posición en su perfil ya están en ella (no queda a quién asignar). */
export const yaEstanTodas = (posicion: string): string => `Ya están asignadas todas las personas que tienen ${posicion} en su perfil.`
