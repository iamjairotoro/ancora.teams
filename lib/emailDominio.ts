// Validación de una dirección antes de enviar (punto 61): sintaxis + consulta DNS del dominio con tiempo límite.
// Regla: se BLOQUEA solo si la dirección está mal escrita, el dominio no existe (NXDOMAIN) o no tiene ni MX ni A/AAAA
// (o declara «no recibe correo» con un MX nulo). Si la consulta falla o tarda, NO se bloquea: queda «no_validado».
// Un buzón inventado en un dominio real (zzzz@gmail.com) no se puede detectar de ninguna forma desde aquí.
import { Resolver } from 'node:dns/promises'
import { domainToASCII } from 'node:url'

export type ValidacionCorreo =
  | { estado: 'ok' }
  | { estado: 'bloqueado'; motivo: string }
  | { estado: 'no_validado'; motivo: string }

/** Lo mínimo del resolvedor de DNS; las pruebas inyectan uno falso. Cada método rechaza con {code} como Node. */
export interface ResolvedorDns {
  resolveMx(dominio: string): Promise<{ exchange: string; priority: number }[]>
  resolve4(dominio: string): Promise<string[]>
  resolve6(dominio: string): Promise<string[]>
  cancel?(): void
}

export const LIMITE_DNS_MS = 2000

function resolvedorPorDefecto(): ResolvedorDns {
  return new Resolver({ timeout: LIMITE_DNS_MS, tries: 1 })
}

const SIN_REGISTRO = new Set(['ENODATA', 'ENOTFOUND'])   // ENOTFOUND = NXDOMAIN en Node; ENODATA = el nombre existe pero sin ese tipo

/** Sintaxis simple y estricta; devuelve el dominio en ASCII (punycode) o null si está mal escrita. */
export function dominioDe(email: string): string | null {
  const e = (email || '').trim()
  if (e.length > 254) return null
  const m = /^([^\s@]{1,64})@([^\s@]+)$/.exec(e)
  if (!m) return null
  const dominio = domainToASCII(m[2].toLowerCase())
  if (!dominio || !/^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/.test(dominio)) return null
  return dominio
}

async function consultar(dominio: string, r: ResolvedorDns): Promise<ValidacionCorreo> {
  try {
    const mx = await r.resolveMx(dominio)
    if (mx.length === 1 && (mx[0].exchange === '' || mx[0].exchange === '.'))
      return { estado: 'bloqueado', motivo: `El dominio ${dominio} declara que no recibe correo.` }
    if (mx.length) return { estado: 'ok' }
  } catch (e: any) {
    if (e?.code === 'ENOTFOUND') return { estado: 'bloqueado', motivo: `El dominio ${dominio} no existe.` }
    if (!SIN_REGISTRO.has(e?.code)) return { estado: 'no_validado', motivo: 'No se pudo validar el dominio.' }
  }
  // Sin MX: el correo puede ir al A/AAAA del dominio (regla del «MX implícito»).
  let fallo = false
  for (const f of [() => r.resolve4(dominio), () => r.resolve6(dominio)]) {
    try { if ((await f()).length) return { estado: 'ok' } }
    catch (e: any) { if (!SIN_REGISTRO.has(e?.code)) fallo = true }
  }
  if (fallo) return { estado: 'no_validado', motivo: 'No se pudo validar el dominio.' }
  return { estado: 'bloqueado', motivo: `El dominio ${dominio} no tiene servidor de correo.` }
}

/**
 * Crea un validador con caché por dominio (una convocatoria repite gmail.com muchas veces). `limiteMs` y `resolvedor`
 * son para las pruebas. Nunca lanza.
 */
export function crearValidadorCorreo(resolvedor?: ResolvedorDns, limiteMs = LIMITE_DNS_MS) {
  const cache = new Map<string, Promise<ValidacionCorreo>>()
  return async function validarCorreo(email: string): Promise<ValidacionCorreo> {
    const dominio = dominioDe(email)
    if (!dominio) return { estado: 'bloqueado', motivo: 'La dirección de correo está mal escrita.' }
    let p = cache.get(dominio)
    if (!p) {
      const r = resolvedor ?? resolvedorPorDefecto()
      let timer: ReturnType<typeof setTimeout> | undefined
      const limite = new Promise<ValidacionCorreo>(res => {
        timer = setTimeout(() => { r.cancel?.(); res({ estado: 'no_validado', motivo: 'No se pudo validar el dominio (tardó demasiado).' }) }, limiteMs)
      })
      p = Promise.race([consultar(dominio, r).catch((): ValidacionCorreo => ({ estado: 'no_validado', motivo: 'No se pudo validar el dominio.' })), limite])
        .finally(() => { if (timer) clearTimeout(timer) })
      cache.set(dominio, p)
    }
    return p
  }
}
