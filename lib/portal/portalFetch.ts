// fetch del portal hacia /api/portal/**. En el portal por TOKEN DE INVITACIÓN (/portal/<token>)
// el token viaja en la cabecera x-portal-token (no en la URL); en el portal por identidad
// (/portal, token = null) no se manda nada: el servidor lo resuelve por la cookie o por Google.
// Sin 'server-only': lo usan componentes cliente.
export const PORTAL_TOKEN_HEADER = 'x-portal-token'

export function portalFetch(token: string | null, input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (token) headers.set(PORTAL_TOKEN_HEADER, token)
  return fetch(input, { cache: 'no-store', ...init, headers })
}
