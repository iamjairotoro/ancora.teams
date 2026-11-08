// Textos del editor de acordes (etapa C2). Le hablan de tú; sin expresiones de tiempo real.
export const TEXTOS_EDITOR = {
  faltaTono: 'Para guardar con acordes, elige el tono de la canción',
  huboCambios: 'Alguien más cambió esta canción. Recarga para ver los cambios.',
  guardadoIncompleto: 'No se pudo terminar de guardar. Tus cambios siguen en el editor; vuelve a intentarlo.',
  errorCarga: 'No se pudo abrir la canción para editar.',
  reintentar: 'Reintentar',
  cancelar: 'Cancelar',
  guardar: 'Guardar',
  guardando: 'Guardando…',
  descartar: '¿Descartar los cambios?',
  descartarSi: 'Descartar',
  seguirEditando: 'Seguir editando',
  modoLetra: 'Letra',
  modoAcordes: 'Acordes',
  tono: 'Tono',
  sinTono: 'Sin tono',
  deshacer: 'Deshacer',
  rehacer: 'Rehacer',
  ayudaLetra: 'Escribe o pega solo la letra. Los acordes se agregan en la pestaña Acordes.',
  ayudaAcordes: 'Toca una línea y luego el «+» sobre la palabra. Toca un acorde para cambiarlo, moverlo o quitarlo.',
  acordesEnTono: (t: string) => `Acordes en ${t}`,
  quitarAcorde: 'Quitar acorde',
  otro: 'Otro…',
  bajo: '/ bajo',
  acordesConservados: (n: number) => (n === 1 ? '1 acorde puesto' : `${n} acordes puestos`),
  quitados: (n: number) => (n === 1 ? 'Se quitó 1 acorde' : `Se quitaron ${n} acordes`),
  quitadosInterludios: (n: number) => (n === 1 ? 'Se quitó 1 línea de acordes' : `Se quitaron ${n} líneas de acordes`),
  cambiarTonoTitulo: '¿Cambiar el tono?',
  cambiarTonoCuerpo: (de: string, a: string) => `Los acordes conservan su grado: al pasar de ${de} a ${a} se transponen.`,
  cambiarTonoSi: 'Cambiar y transponer',
  agregarLineaAcordes: '+ Línea de acordes',
  quitarLineaAcordes: 'Quitar línea',
  separador: '| Barra',
  espacioMas: '+ Espacio',
  quitarPieza: 'Quitar',
  siguientePieza: 'Siguiente ›',
  espacio: 'Espacio',
  ancho: 'Ancho',
  masAncho: 'Más ancho',
  masEstrecho: 'Más estrecho',
  inicio: 'el inicio',
  final: 'el final',
  espacioEntre: (a: string, b: string, n: number) => `entre ${a} y ${b} · ${n}`,
  espacioDeAncho: (n: number) => (n === 1 ? 'Espacio de 1' : `Espacio de ${n}`),
  enLineaDeAcordes: 'en la línea de acordes',
  barraDeCompas: 'barra',
  lineaDeAcordes: 'Línea de acordes',
  elegirPieza: 'elige un acorde',
  ponerAcordeAqui: 'Poner acorde aquí',
  mover: 'Mover',
  siguientePalabra: 'Siguiente palabra ›',
  cerrarPanel: 'Cerrar',
  elegirAcorde: 'Elige el acorde',
  sobrePalabra: (palabra: string | null) => (palabra ? `sobre «${palabra}»` : 'en este lugar'),
  sinBajo: 'Sin bajo',
  sinLetraAcordes: 'Escribe primero la letra en el modo Texto.',
  letraInstrumental: 'Solo instrumental',
  secciones: { verso: '+ Verso', precoro: '+ Pre coro', coro: '+ Coro', puente: '+ Puente', interludio: '+ Interludio', final: '+ Final' },
  agregarSeccion: 'Agregar sección',
  modoTexto: '✎ Texto',
  volverAcordes: '♪ Acordes',
  notacion: 'Notación de los acordes',
  notacionLetras: 'ABC',
  notacionGrados: '123',
  ayudaTexto: 'Cada acorde se queda con su palabra.',
  tiposSeccion: { verso: 'Verso', precoro: 'Pre coro', coro: 'Coro', puente: 'Puente', interludio: 'Interludio', final: 'Final' },
  seccionDe: (nombre: string) => `Sección ${nombre}`,
  cambiarTipo: 'Cambiar a',
  renumerarVersos: 'Renumerar versos',
  borrarSeccion: 'Borrar sección',
  cerrar: 'Cerrar',
  seccionBorrada: (nombre: string, acordes: number, lineas: number) => [`Se borró la sección ${nombre ? `«${nombre}»` : 'sin nombre'}`, acordes ? (acordes === 1 ? 'Se quitó 1 acorde' : `Se quitaron ${acordes} acordes`) : '', lineas ? (lineas === 1 ? 'Se quitó 1 línea de acordes' : `Se quitaron ${lineas} líneas de acordes`) : ''].filter(Boolean).join(' · '),
  entrada: 'Editar con acordes',
  sinLetra: 'Primero escribe la letra en el modo Texto.',
  avisoAcordesAntiguos: 'Esta canción tiene acordes guardados que no coinciden con la letra. Se muestran sin acordes y los anteriores se conservan como respaldo.',
  avisoSinConvertir: 'Esta canción tiene acordes que no se pudieron leer. Se muestra sin acordes y los anteriores se conservan como respaldo.',
  avisoPendiente: 'Se recuperaron los acordes de un guardado que no terminó.',
  noAutorizado: 'No tienes permiso para guardar esta canción. Tus cambios siguen en el editor.',
  sinConexion: 'No hay conexión. Tus cambios siguen en el editor; vuelve a intentarlo.',
  valorNoValidoEn: (campo: string) => `No se pudo guardar: valor no válido en ${CAMPOS_LEGIBLES[campo] ?? 'los datos'}. Tus cambios siguen en el editor.`,
} as const

// Nombres que se le muestran a la persona (nunca el nombre interno del campo que devuelve el servidor).
const CAMPOS_LEGIBLES: Record<string, string> = { secciones: 'los acordes', letra: 'la letra', tono: 'el tono' }

/** El motivo que se muestra cuando Guardar no termina, según la respuesta del servidor (estado 0 = sin respuesta). Solo usa el estado y el nombre del campo; nunca copia el texto que manda el servidor. */
export function mensajeDeGuardado(estado: number, cuerpo: unknown): { texto: string; conflicto: boolean } {
  const c = cuerpo && typeof cuerpo === 'object' ? (cuerpo as Record<string, unknown>) : {}
  if (estado === 409) return { texto: TEXTOS_EDITOR.huboCambios, conflicto: true }
  if (estado === 401 || estado === 403) return { texto: TEXTOS_EDITOR.noAutorizado, conflicto: false }
  if (estado === 0) return { texto: TEXTOS_EDITOR.sinConexion, conflicto: false }
  if (estado === 400) {
    if (c.campo === 'tono') return { texto: TEXTOS_EDITOR.faltaTono, conflicto: false }
    const m = typeof c.error === 'string' ? /\ben (\w+)$/.exec(c.error) : null
    return { texto: TEXTOS_EDITOR.valorNoValidoEn(m ? m[1] : ''), conflicto: false }
  }
  return { texto: TEXTOS_EDITOR.guardadoIncompleto, conflicto: false }
}
