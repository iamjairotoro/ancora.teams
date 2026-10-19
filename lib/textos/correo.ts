// Textos para quien administra cuando algo falla con el correo o con un envío. Lenguaje de persona, sin nombres de variables, servicios ni tablas: el detalle técnico
// (código del error, respuesta del servidor) se escribe SOLO en la consola (el registro del servidor o la consola del navegador), nunca en pantalla ni en la base.
export const CORREO = {
  accesoRechazado: 'No se pudo enviar: la cuenta de correo de la app no está aceptando el acceso. Avisa a quien mantiene la aplicación.',
  sinConfigurar: 'El correo de la app todavía no está configurado. Avisa a quien mantiene la aplicación.',
  limiteDiario: 'Se alcanzó el límite de correos de hoy. Vuelve a intentarlo más tarde.',
  direccionRechazada: 'La dirección de correo no es válida o no existe. Revísala en la ficha de la persona.',
  sinConexion: 'No se pudo conectar con el correo. Intenta de nuevo en un momento.',
  direccionNoAceptada: 'El correo no aceptó esa dirección. Revísala en la ficha de la persona.',
  noSePudoEnviar: 'No se pudo enviar el correo. Intenta de nuevo.',
  errorInesperado: 'No se pudo enviar. Revisa el estado de la invitación y vuelve a intentar.',
  noSePudoComprobar: 'No se pudo comprobar la dirección de correo. Intenta de nuevo.',
  noSePudoComprobarATiempo: 'No se pudo comprobar la dirección a tiempo. Intenta de nuevo.',
  pushNoActivada: 'Notificación en la app: aún no está activada.',
  noSePudoCrearLaInvitacion: 'No se pudo crear la invitación. Intenta de nuevo.',
  noSePudoCrearLaConvocatoria: 'No se pudo crear la convocatoria. Intenta de nuevo.',
  noSePudoLeerLaInvitacion: 'No se pudo leer la invitación recién creada. Intenta de nuevo.',
  noSePudoLeerLaConvocatoria: 'No se pudo leer la convocatoria recién creada. Intenta de nuevo.',
  sinConexionReintento: 'No hay conexión: no se pudo reintentar el correo.',
  sinConexionReinvitar: 'No hay conexión: no se pudo reinvitar.',
  dominioNoRecibe: (dominio: string) => `«${dominio}» no recibe correo. Revisa la dirección.`,
  dominioNoExiste: (dominio: string) => `«${dominio}» no existe. Revisa la dirección de correo.`,
  reinvitadoSinCorreo: (motivo: string) => `Se reinició la invitación, pero el correo no se pudo enviar: ${motivo}`,
} as const

type Lista = 'invitaciones' | 'convocatorias'

/** El servidor respondió con un error al enviar: el administrador ve una frase; el código va a la consola. */
export function textoFalloDeEnvio(status: number, lista: Lista): string {
  console.error(`[envío] el servidor respondió ${status}`)
  return `No se pudo completar el envío. Revisa el estado de las ${lista} antes de volver a intentar.`
}

/** No hubo respuesta (sin conexión o corte). */
export function textoSinConexionDeEnvio(lista: Lista): string {
  return `No hay conexión. Revisa el estado de las ${lista} antes de volver a intentar.`
}

/** El servidor respondió con un error en una acción suelta (reintentar un correo, reinvitar). */
export function textoFalloDeAccion(status: number): string {
  console.error(`[envío] el servidor respondió ${status}`)
  return 'No se pudo completar. Intenta de nuevo.'
}
