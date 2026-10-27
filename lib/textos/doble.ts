// Textos de «Convocado a dos equipos» (punto 4; mockups Doble-A, B y C). Funciones de texto con prueba en tests/portal/doble-convocatoria.test.js. Tuteo, español de Chile.
import { contar } from '@/lib/textos/plural'

export const TEXTOS_DOBLE = {
  /** La lista de equipos que se declinan: «Producción», «Producción y Montaje», «Producción, Montaje y Logística». */
  lista: (nombres: string[]): string => {
    const n = nombres.filter(Boolean)
    return n.length <= 1 ? (n[0] || 'otro equipo') : `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`
  },
  convocatorias: (n: number): string => contar(n, 'convocatoria', 'convocatorias'),
  /** El aviso de arriba de las tarjetas, mientras haya alguna sin responder. */
  aviso: (n: number): string => n === 2
    ? 'Estás convocado en dos equipos para este servicio. Al confirmar uno, el otro se declina automáticamente.'
    : `Estás convocado en ${n} equipos para este servicio. Al confirmar uno, los otros se declinan automáticamente.`,
  sinResponder: 'Sin responder',
  confirmado: 'Confirmado',
  declinadaAuto: 'Se declinó porque confirmaste otro equipo',
  rechazo: 'Dijiste que no puedes',
  confirmo: 'Confirmo',
  noPuedo: 'No puedo',
  /** Ventana al confirmar con otra(s) convocatoria(s) sin responder que se cruzan. */
  confirmarTitulo: (equipo: string): string => `¿Confirmar en ${equipo}?`,
  confirmarTexto: (declina: string[]): string => `Se declinará tu convocatoria en ${TEXTOS_DOBLE.lista(declina)}. Podrás cambiarla después.`,
  confirmarAccion: 'Confirmar',
  bloqueadoOrden: 'Confirma una convocatoria para ver el orden del servicio',
  bloqueadoEquipo: 'Confirma una convocatoria para ver el equipo del servicio',
  bloqueadoCronograma: 'Confirma una convocatoria para ver tu cronograma',
  /** «Cambiar»: pasar a confirmar el equipo que se declinó solo por el cruce (el que se deja queda declinado por el cruce y se puede volver). */
  cambiar: 'Cambiar',
  cambiarTitulo: (equipo: string): string => `¿Cambiar a ${equipo}?`,
  cambiarTexto: (deja: string, equipo: string): string => `Confirmas tu lugar en ${equipo} y se declina tu convocatoria en ${deja}. Podrás volver a cambiar después.`,
  cambiarAccion: 'Sí, cambiar',
  cambiarListo: (equipo: string): string => `Listo: ahora estás confirmado en ${equipo}.`,
  /** Lo que dice el servidor para cada resultado de `cambiar_convocatoria` (migración 038), con el código HTTP. 'ok' no lleva texto. */
  cambiarResultado: {
    misma: { status: 400, texto: 'Elige dos convocatorias distintas.' },
    no_existe: { status: 404, texto: 'No encontramos esa convocatoria. Recarga la pantalla e intenta de nuevo.' },
    no_enviada: { status: 403, texto: 'Esta convocatoria aún no ha sido enviada' },
    sin_equipo: { status: 400, texto: 'Esta convocatoria no tiene equipo' },
    cerrada: { status: 410, texto: 'Esta convocatoria ya cerró' },
    desde_no_confirmada: { status: 409, texto: 'Ya no tienes confirmada la otra convocatoria. Recarga la pantalla para ver cómo quedó.' },
    hacia_no_declinada_por_conflicto: { status: 409, texto: 'Esta convocatoria no se declinó por el cruce. Recarga la pantalla para ver cómo quedó.' },
    hacia_no_declinada_por_desde: { status: 409, texto: 'Esta convocatoria se declinó por otra confirmación. Recarga la pantalla para ver cómo quedó.' },
    no_chocan: { status: 409, texto: 'Estas convocatorias ya no se cruzan, así que no hay nada que cambiar. Recarga la pantalla.' },
    sin_posiciones: { status: 409, texto: 'Ya no tienes tu lugar en ese equipo: otra persona lo ocupó. Habla con su líder.' },
  } as Record<string, { status: number; texto: string }>,
  /** «Tu posición: Bass · Sonido» cuando hay dos convocatorias. */
  posiciones: (ps: string[]): string => ps.filter(Boolean).join(' · '),
} as const
