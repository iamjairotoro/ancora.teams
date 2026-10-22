// Textos de la lista de Servicios del portal en teléfono (app/portal/_components/servicios/Servicios.tsx, lib/portal/listaServicios.ts; mockup Lista-Usuario). Hablan de tú y dicen cómo está TU respuesta;
// nunca nombran a otra persona ni cuentan quién rechazó.
export const TEXTOS_SERVICIOS_PORTAL = {
  titulo: 'Servicios',
  proximos: 'Próximos',
  vacio: 'No hay servicios programados próximamente.',
  porResponder: 'Por responder',
  rolCambio: 'Tu rol cambió',
  noRespondiste: 'No respondiste',
  confirmada: 'Confirmada',
  dijisteQueNo: 'Dijiste que no puedes',
  noConvocado: 'No convocado',
  nominacionPendiente: 'Nominación pendiente',
  tuPosicion: 'Tu posición:',
  responder: 'Responder',
  diaBloqueado: 'Bloqueaste este día',
  bloqueadoSinConvocatorias: 'No recibes convocatorias',
  bloqueadoConConvocatorias: 'Aun así tienes convocatorias',
  cambiar: 'Cambiar ›',
} as const

/** Para lectores de pantalla: «Servicio Ancora, domingo 25 de octubre: Por responder». */
export const abrirServicioPortal = (nombre: string, cuando: string, estado: string): string => `${nombre}, ${cuando}: ${estado}`
