// Cuándo una persona tiene un PROBLEMA con el correo de la convocatoria (punto 61, ajuste de octubre 2026). Con éxito no se muestra nada; el «!» de la nómina aparece solo si:
//   · el último intento FALLÓ (guardado en invitations.email_status, migración 035, o en el último resultado de esta pantalla),
//   · se OMITIÓ (no hubo intento: sin correo, error al crear la invitación). «omitido» no se guarda en la base: vive en el último resultado, hasta cambiar de servicio, o
//   · la persona NO TIENE CORREO CARGADO (members.email vacío): se sabe antes del primer envío, sin base.
// La notificación en la app (push) NO genera un «!» por sí sola: su estado solo se cuenta dentro del globo cuando ya hay un problema de correo.
// Sin acceso a datos ni a servidor.
import { CORREO } from './textos/correo'
import type { EstadoPush, ResultadoDestinatario } from './convocatoriaTypes'

export type TipoProblemaCorreo = 'fallo' | 'omitido' | 'sin-correo'

export interface ProblemaCorreo {
  tipo: TipoProblemaCorreo
  /** Primera línea del globo. */
  titulo: string
  motivo: string
  /** Estado del push de esa persona, solo dentro de un problema de correo y solo si el último resultado lo trae. */
  push: string | null
  /** «Reintentar correo» solo tiene sentido si ya hay una invitación publicada (el correo falló). */
  puedeReintentar: boolean
}

export const MOTIVO_SIN_CORREO = 'No tiene correo cargado; no recibirá la convocatoria'

const PUSH: Record<EstadoPush, string | null> = {
  'enviado': 'Notificación en la app: enviada.',
  'parcial': 'Notificación en la app: llegó a algunos dispositivos.',
  'sin dispositivo': 'Notificación en la app: no tiene la app instalada con avisos activados.',
  'falló': 'Notificación en la app: falló.',
  'no configurado': CORREO.pushNoActivada,
  'no aplica': null,
}

/**
 * Textos que ya quedaron guardados en `invitations.email_error` antes de que los motivos se escribieran sin jerga (variables, «servidor de correo», «dominio»…): se muestran con el texto de ahora.
 * Lo que no se reconoce pasa tal cual. No toca la base.
 */
const ANTIGUOS: [RegExp, string | ((m: RegExpMatchArray) => string)][] = [
  [/^Falta configurar el correo del servidor/i, CORREO.sinConfigurar],
  [/rechazó el usuario o la contraseña|GMAIL_APP_PASSWORD.*Vercel/i, CORREO.accesoRechazado],
  [/límite diario de envíos/i, CORREO.limiteDiario],
  [/^El servidor de correo rechazó la dirección/i, CORREO.direccionRechazada],
  [/^No se pudo conectar con el servidor de correo/i, CORREO.sinConexion],
  [/^El servidor de correo no aceptó la dirección/i, CORREO.direccionNoAceptada],
  [/^Error desconocido$/i, CORREO.noSePudoEnviar],
  [/^El dominio (\S+) declara que no recibe correo/i, m => CORREO.dominioNoRecibe(m[1])],
  [/^El dominio (\S+) no tiene servidor de correo/i, m => CORREO.dominioNoRecibe(m[1])],
  [/^El dominio (\S+) no existe/i, m => CORREO.dominioNoExiste(m[1])],
  [/^No se pudo validar el dominio \(tardó demasiado\)/i, CORREO.noSePudoComprobarATiempo],
  [/^No se pudo validar el dominio/i, CORREO.noSePudoComprobar],
  [/^Error inesperado al enviar; revis[aá] el estado de la invitación/i, CORREO.errorInesperado],
]
export function traducirMotivoAntiguo(motivo: string | null | undefined): string | null {
  const t = (motivo ?? '').trim()
  if (!t) return null
  for (const [re, nuevo] of ANTIGUOS) { const m = t.match(re); if (m) return typeof nuevo === 'string' ? nuevo : nuevo(m) }
  return t
}

export type UltimoResultado = Pick<ResultadoDestinatario, 'estado' | 'motivo' | 'push'>

export function problemaDeCorreo(a: {
  email?: string | null
  estadoGuardado?: 'enviado' | 'falló' | null
  errorGuardado?: string | null
  ultimo?: UltimoResultado | null
}): ProblemaCorreo | null {
  const sinCorreo = !a.email || !a.email.trim()
  const u = a.ultimo
  if (u?.estado === 'enviado') return null
  if (u?.estado === 'falló') {
    return { tipo: 'fallo', titulo: 'El correo no se envió', motivo: traducirMotivoAntiguo(u.motivo) || traducirMotivoAntiguo(a.errorGuardado) || 'No se pudo enviar el correo.', push: PUSH[u.push] ?? null, puedeReintentar: true }
  }
  if (u?.estado === 'omitido') {
    return { tipo: 'omitido', titulo: 'Correo omitido', motivo: sinCorreo ? MOTIVO_SIN_CORREO : (traducirMotivoAntiguo(u.motivo) || 'No se intentó enviar el correo.'), push: PUSH[u.push] ?? null, puedeReintentar: false }
  }
  if (a.estadoGuardado === 'falló') {
    return { tipo: 'fallo', titulo: 'El correo no se envió', motivo: traducirMotivoAntiguo(a.errorGuardado) || 'No se pudo enviar el correo.', push: null, puedeReintentar: true }
  }
  if (sinCorreo && a.estadoGuardado !== 'enviado') {
    return { tipo: 'sin-correo', titulo: 'Sin correo cargado', motivo: MOTIVO_SIN_CORREO, push: null, puedeReintentar: false }
  }
  return null
}

/** El resultado de UNA persona en UN equipo (los ensayos no llevan equipo: teamId null). */
export const resultadoDe = (lista: ResultadoDestinatario[], memberId: string, teamId: string | null): ResultadoDestinatario | null =>
  lista.find(r => r.memberId === memberId && (r.teamId ?? null) === teamId) ?? null

/** Suma los resultados nuevos a los que ya había: el de una persona reemplaza al anterior (un reintento exitoso borra su problema); los de las demás se conservan. */
export function juntarResultados(previos: ResultadoDestinatario[], nuevos: ResultadoDestinatario[]): ResultadoDestinatario[] {
  const clave = (r: ResultadoDestinatario) => `${r.memberId}|${r.teamId ?? ''}`
  const reemplazados = new Set(nuevos.map(clave))
  return [...previos.filter(r => !reemplazados.has(clave(r))), ...nuevos]
}
