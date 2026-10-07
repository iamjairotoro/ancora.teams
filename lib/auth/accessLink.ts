// Reglas PURAS de los enlaces de acceso personales del portal (punto 48): vencimiento,
// estado y mensajes. Sin dependencias ni acceso a la base: se usa igual en el servidor
// (que decide) y en la interfaz del administrador (que ofrece las opciones).

/** Opciones de vencimiento al generar un enlace (días). */
export const ACCESS_LINK_DAYS_OPTIONS = [7, 30, 90] as const
export type AccessLinkDays = typeof ACCESS_LINK_DAYS_OPTIONS[number]
export const ACCESS_LINK_DEFAULT_DAYS: AccessLinkDays = 30

/** Bytes aleatorios del token (256 bits). */
export const ACCESS_TOKEN_BYTES = 32

export const MSG_LINK_EXPIRED = 'Este enlace venció. Pide uno nuevo a tu líder'
export const MSG_LINK_INVALID = 'Enlace no válido'

/** Las URLs antiguas /portal/member_<id> identificaban a la persona SOLO por su id: quedan cerradas. */
export const isLegacyMemberToken = (token: string | null | undefined): boolean => !!token && token.startsWith('member_')

export const isAccessLinkDays = (n: unknown): n is AccessLinkDays =>
  (ACCESS_LINK_DAYS_OPTIONS as readonly unknown[]).includes(n)

/** Vencimiento: ahora + N días. */
export function expiryFrom(days: AccessLinkDays, now: Date = new Date()): Date {
  return new Date(now.getTime() + days * 86400000)
}

export type LinkRow = { revoked_at: string | null; expires_at: string }
/** 'ok' | 'revoked' | 'expired'. Un enlace revocado manda sobre uno vencido. */
export type LinkState = 'ok' | 'revoked' | 'expired'

export function linkState(row: LinkRow, now: Date = new Date()): LinkState {
  if (row.revoked_at) return 'revoked'
  if (new Date(row.expires_at).getTime() <= now.getTime()) return 'expired'
  return 'ok'
}

/** Lo que se le muestra a quien abre el enlace. Revocado o inexistente: «Enlace no válido». */
export function messageForState(state: LinkState | 'missing'): string | null {
  if (state === 'ok') return null
  return state === 'expired' ? MSG_LINK_EXPIRED : MSG_LINK_INVALID
}
