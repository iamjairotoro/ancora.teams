import { plural } from './plural'
// Textos que el Home de escritorio (components/home/Home.tsx) y el Home móvil de antes escribían cada uno por su lado (hoy: Home.tsx, HomeAdminMovil.tsx y lib/admin/listaServicios.ts).
// Una sola fuente: si un texto cambia, cambia en los dos. Solo están los que ya estaban repetidos; el resto de los textos de cada pantalla sigue en su archivo.
export const TEXTOS_HOME = {
  verTodos: 'Ver todos',
  abrirServicio: 'Abrir servicio',
  abrirFlecha: 'Abrir ›',
  proximosServicios: 'Próximos servicios',
  sinProximoServicio: 'SIN PRÓXIMO SERVICIO',
  todaviaNoHayServicio: 'Todavía no hay ninguno programado',
  sinServicioAyuda: 'Cuando crees un servicio nuevo, va a aparecer aquí.',
  respuestaPorEquipo: 'Respuesta por equipo',
  comoSeReparteLaCarga: 'Cómo se reparte la carga',
  ultimos3Meses: 'últimos 3 meses',
  cumpleanos: 'Cumpleaños',
  mesAnterior: 'Mes anterior',
  mesSiguiente: 'Mes siguiente',
  sinAsignar: 'Sin asignar',
  sinConvocar: 'Sin convocar',
  confirmo: 'Confirmó',
  nadieBloqueo: 'Nadie bloqueó este día',
} as const

/** «9 de 14 confirmados» (el mismo texto del Home de escritorio y del móvil); concuerda con el total: «0 de 1 confirmado». */
export const confirmadosDe = (confirmados: number, convocados: number): string => `${confirmados} de ${convocados} ${plural(convocados, 'confirmado', 'confirmados')}`

/** El botón de la fila «Sin confirmar a menos de 24 horas» de «Necesita atención»: solo abre el servicio. */
export const TEXTO_VER = 'Ver'

/** El botón de la tarjeta del próximo servicio cuando hay pendientes: solo ABRE el servicio (no envía nada; el recordatorio real queda para la fase de notificaciones). «Ver al pendiente» / «Ver a los 3 pendientes». */
export const verPendientes = (n: number): string => plural(n, 'Ver al pendiente', `Ver a los ${n} pendientes`)
