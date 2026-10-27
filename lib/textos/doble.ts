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
  /** «Tu posición: Bass · Sonido» cuando hay dos convocatorias. */
  posiciones: (ps: string[]): string => ps.filter(Boolean).join(' · '),
} as const
