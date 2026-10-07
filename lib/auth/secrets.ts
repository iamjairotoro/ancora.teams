// Utilidades de secretos del punto 48, SIN identidad ni sesiones: las comparten el lado
// del portal (lib/auth/portalIdentity.ts) y el de administración (lib/auth/accessLinkAdmin.ts),
// para que la administración no importe nada de la identidad del portal.
import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { ACCESS_TOKEN_BYTES } from './accessLink'

/** SHA-256 en hex (64 caracteres), lo único que se guarda de un token o de una sesión. */
export const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex')
/** Valor aleatorio de 32 bytes en base64url: sirve de token y de identificador de sesión. */
export const newSecret = () => randomBytes(ACCESS_TOKEN_BYTES).toString('base64url')
