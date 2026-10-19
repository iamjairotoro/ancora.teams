// Lo que se GUARDA en `invitations.email_error` cuando falla un correo: el texto técnico de siempre (con el código, la respuesta del servidor y los nombres de las variables). NO cambió con el
// resto de los textos: lo guardado es un registro. No se muestra tal cual: al mostrarlo, lib/problemasCorreo.ts (traducirMotivoAntiguo) lo traduce a la frase de lib/textos/correo.ts.
// Lo único distinto del texto original es «revisa» (antes «revisá») en `errorInesperado`.
export const GUARDADO = {
  accesoRechazado: 'El servidor de correo rechazó el usuario o la contraseña de aplicación (revisar GMAIL_USER y GMAIL_APP_PASSWORD en Vercel).',
  limiteDiario: 'Gmail alcanzó el límite diario de envíos; reintentar más tarde.',
  direccionRechazada: (respuesta: string) => `El servidor de correo rechazó la dirección. ${respuesta}`,
  sinConexion: 'No se pudo conectar con el servidor de correo; reintentar en un momento.',
  sinConfigurar: 'Falta configurar el correo del servidor (GMAIL_USER y GMAIL_APP_PASSWORD).',
  noAceptada: 'El servidor de correo no aceptó la dirección.',
  errorInesperado: 'Error inesperado al enviar; revisa el estado de la invitación.',
  dominioNoRecibe: (d: string) => `El dominio ${d} declara que no recibe correo.`,
  dominioNoExiste: (d: string) => `El dominio ${d} no existe.`,
  dominioSinServidor: (d: string) => `El dominio ${d} no tiene servidor de correo.`,
  noSePudoValidar: 'No se pudo validar el dominio.',
  noSePudoValidarATiempo: 'No se pudo validar el dominio (tardó demasiado).',
} as const
