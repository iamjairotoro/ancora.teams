import { plural } from './plural'
// Textos que el Home de escritorio (components/home/Home.tsx) y el Home móvil (HomeMovil.tsx, VistaHoy.tsx, lib/home/hoy.ts) escribían cada uno por su lado.
// Una sola fuente: si un texto cambia, cambia en los dos. Solo están los que ya estaban repetidos; el resto de los textos de cada pantalla sigue en su archivo.
export const TEXTOS_HOME = {
  verTodos: 'Ver todos',
  abrirServicio: 'Abrir servicio',
  abrirFlecha: 'Abrir ›',
  proximosServicios: 'Próximos servicios',
  sinProximoServicio: 'SIN PRÓXIMO SERVICIO',
  todaviaNoHayServicio: 'Todavía no hay ninguno programado',
  sinServicioAyuda: 'Cuando crees un servicio nuevo, va a aparecer acá.',
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
