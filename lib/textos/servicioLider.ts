// Textos de «Home → Servicios» del LÍDER en teléfono (components/lider-movil; tablero Servicio-Lider-A) y de su menú inferior.
import { contar, plural } from './plural'

export const TEXTOS_LIDER = {
  menuHome: 'Home',
  menuServicios: 'Servicios',
  menuResumen: 'Resumen',
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

// Etapa 2 (el líder cambia SU equipo): textos de la pantalla y respuestas del servidor.
export const TEXTOS_LIDER_EDICION = {
  asignar: 'Asignar',
  cambiar: 'Cambiar',
  quitarPersona: 'Quitar de la posición',
  sinAsignar: 'Sin asignar',
  cupos: 'Cupos',
  masCupos: 'Más cupos',
  menosCupos: 'Menos cupos',
  elegirPersona: 'Elegir persona',
  nadieDisponible: 'Nadie del equipo tiene esta posición todavía.',
  soloEquipo: 'Solo aparecen integrantes de tu equipo.',
  horario: 'Horario',
  notas: 'Notas',
  equipo: 'Equipo',
  agregarHerramienta: 'Agregar herramienta',
  convoca: 'Quien administra envía la convocatoria. Aquí solo preparas tu equipo.',
  cerrado: 'La convocatoria de este servicio ya cerró: ya no se puede cambiar.',
  guardando: 'Guardando…',
  guardado: 'Guardado',
  noSePudoGuardar: 'No se pudo guardar el cambio. Inténtalo de nuevo.',
  agregarFila: 'Agregar',
  hora: 'Hora',
  queSucede: 'Qué sucede',
  sinFilas: 'Todavía no hay filas.',
  eliminar: 'Eliminar',
  notasPlaceholder: 'Escribe las notas de tu equipo para este servicio.',
  guardarNotas: 'Guardar notas',
  integrantes: 'Integrantes',
  agregarPersona: 'Agregar persona al equipo',
  quitarDelEquipo: 'Quitar del equipo',
  posiciones: 'Posiciones',
  esLider: 'Líder',
  sinCandidatos: 'No hay más personas para agregar.',
  tipoChecklist: 'Checklist',
  tipoHorario: 'Horario',
  tipoNotas: 'Notas',
  herramientaYaExiste: 'Tu equipo ya tiene esta herramienta.',
} as const

export const ERRORES_LIDER = {
  pedido: 'No se pudo guardar el cambio. Revisa los datos.',
  consultaInvalida: 'La consulta no es válida.',
  convocatoriaCerrada: 'La convocatoria de este servicio ya cerró.',
  personaNoEsDelEquipo: 'Esa persona no pertenece a tu equipo.',
  posicionArchivada: 'Esa posición ya no está activa.',
  cuposInsuficientes: 'Hay personas asignadas en los cupos que quitas. Quítalas primero.',
  noSePuedeQuitarLider: 'No se puede quitar a un líder desde aquí.',
  noSePuedeQuitarteTu: 'No puedes quitarte a ti mismo del equipo.',
  yaEsDelEquipo: 'Esa persona ya está en tu equipo.',
  herramientaYaExiste: 'Tu equipo ya tiene esta herramienta.',
  noSePudoGuardar: 'No se pudo guardar el cambio. Inténtalo de nuevo.',
} as const

// Etapa 3: la pantalla Personas del líder (components/lider-movil/Personas*.tsx) y la búsqueda de «Agregar persona».
export const TEXTOS_PERSONAS_LIDER = {
  titulo: 'Personas',
  ayuda: 'Aquí administras a las personas de tu equipo. Los demás equipos son de solo lectura.',
  buscarEnPantalla: 'Buscar por nombre o posición',
  sinResultados: 'No hay personas que coincidan.',
  sinPersonas: 'Todavía no hay personas en este equipo.',
  agregar: 'Agregar persona',
  agregarAlEquipo: 'Agregar al equipo',
  buscarNombre: 'Buscar por nombre',
  escribeParaBuscar: 'Escribe al menos 2 letras del nombre o del apellido.',
  sinCoincidencias: 'No hay personas con ese nombre que no estén ya en tu equipo.',
  buscando: 'Buscando…',
  noSePudoBuscar: 'No se pudo buscar. Inténtalo de nuevo.',
  sinPosiciones: 'Sin posiciones',
  telefono: 'Teléfono',
  correo: 'Correo',
  sinTelefono: 'Sin teléfono',
  sinCorreo: 'Sin correo',
  posiciones: 'Posiciones',
  sinPosicionesEnElEquipo: 'Tu equipo todavía no tiene posiciones.',
  quitar: 'Quitar del equipo',
  noSeQuitaUnLider: 'Un líder no se quita desde aquí.',
  noTeQuitasTu: 'No puedes quitarte a ti mismo del equipo.',
  lider: 'Líder',
  tu: 'Tú',
  soloLectura: 'Solo lectura',
  cerrarFicha: 'Cerrar',
} as const
export const confirmarQuitarDelEquipo = (nombre: string, equipo: string): string => `¿Quitar a ${nombre} de ${equipo}? Seguirá en la organización y conserva sus datos.`
export const aVerPersona = (nombre: string): string => `Ver a ${nombre}`

// Etapa 4: la pantalla Resumen del líder (components/lider-movil/ResumenLider.tsx).
export const TEXTOS_RESUMEN_LIDER = {
  titulo: 'Resumen',
  equipoEtiqueta: 'Equipo',
  periodoEtiqueta: 'Período',
  mes: 'Este mes',
  tresMeses: '3 meses',
  anio: 'Este año',
  vecesQueSirvio: 'Veces que sirvió',
  nota: 'Cuenta servicios ya pasados donde la persona estaba confirmada.',
  paraTenerEnCuenta: 'Para tener en cuenta',
  ultimaVez: 'Última vez',
  sinServicios: 'Aún sin servicios',
  posicionesCubiertas: 'posiciones cubiertas',
  sinDato: '—',
  sinServiciosPeriodo: 'Todavía no hay servicios pasados con tu equipo en este período.',
  sinPersonas: 'Este equipo todavía no tiene personas.',
  noSePudoCargar: 'No se pudo cargar el resumen',
} as const
export const cifraServicios = (n: number): string => plural(n, 'servicio o ensayo', 'servicios y ensayos')
export const cifraPersonas = (n: number): string => plural(n, 'persona sirvió', 'personas sirvieron')
export const avisoTodos = (periodo: 'mes' | '3m' | 'anio'): string => `sirvió en todos los servicios ${periodo === 'mes' ? 'del mes' : periodo === '3m' ? 'de los últimos 3 meses' : 'del año'}.`
export const avisoInactiva = 'no sirve hace más de 6 semanas.'
export const sirvioVeces = (n: number): string => `${n} ${plural(n, 'vez', 'veces')}`
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'], MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
/** «domingo 1 nov» a partir de AAAA-MM-DD (sin zona horaria: es la fecha del servicio). */
export const fechaDeUltimaVez = (fecha: string): string => { const d = new Date(`${fecha.slice(0, 10)}T00:00:00Z`); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}` }

// Etapa 4: el servicio del líder en el teléfono (tarjeta de SU equipo, ventana de la posición y ventana de asignar; tableros Servicio-Lider-B, C y D).
export const TEXTOS_LIDER_SERVICIO = {
  herramientasDelEquipo: 'Herramientas del equipo',
  anadir: 'Añadir',
  gestionarEquipo: 'Gestionar equipo',
  ayudaPosiciones: 'Elige una posición para asignar a alguien o cambiar cuántas personas necesita.',
  todoConfirmado: 'Todo confirmado',
  sinPosiciones: 'Tu equipo todavía no tiene posiciones.',
  personasEnPosicion: 'Personas en esta posición',
  ayudaCupos: 'Puedes bajar hasta el número de personas asignadas.',
  buscarEnTuEquipo: 'Buscar en tu equipo',
  otrasPersonas: 'Otras personas del equipo',
  sinOtraAsignacion: 'Sin otra asignación',
  bloqueoDia: 'Bloqueó este día',
  disponible: 'Disponible',
  noDisponible: 'No disponible',
  listo: 'Listo',
  cambiar: 'Cambiar',
  volverALaPosicion: 'Volver a la posición',
  sinResultados: 'Nadie coincide con tu búsqueda.',
  sinIntegrantes: 'Tu equipo todavía no tiene personas. Agrégalas en «Gestionar equipo».',
  confirmo: 'Confirmó',
  sinResponder: 'Sin responder',
  declino: 'Declinó',
  cerradoSoloVer: 'La convocatoria ya cerró: aquí solo puedes ver.',
} as const
export const faltaN = (n: number): string => `${plural(n, 'Falta', 'Faltan')} ${n}`
export const confirmadosDe = (confirmados: number, total: number): string => `${confirmados} de ${total} ${plural(total, 'confirmado', 'confirmados')}`
export const voluntariosDe = (asignados: number, total: number): string => `Voluntarios · ${asignados} de ${total}`
export const posicionDeCupo = (posicion: string, slot: number, cupos: number): string => (cupos > 1 ? `${posicion} ${slot}` : posicion)
export const faltaPosicion = (posicion: string, slot: number, cupos: number): string => `Falta ${posicionDeCupo(posicion, slot, cupos)}`
export const asignarPosicion = (posicion: string): string => `Asignar ${posicion}`
export const tienenPosicionEnPerfil = (posicion: string): string => `Tienen ${posicion} en su perfil`
export const yaAsignadaEnX = (donde: string): string => `Ya asignada en ${donde}`
export const contextoDeHoja = (equipo: string, fecha: string): string => `${equipo} · ${fecha}`
