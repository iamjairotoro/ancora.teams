// Autorización de las rutas que ejecuta el cron de Vercel (vercel.json → crons).
// Vercel envía el valor de la variable CRON_SECRET del proyecto como
// `Authorization: Bearer <CRON_SECRET>` en cada invocación del cron.
//
// CIERRA POR DEFECTO: si CRON_SECRET NO está definida, la ruta rechaza todo, salvo en
// desarrollo local (`next dev`, NODE_ENV=development), para poder probarla a mano.
// El valor del secreto no se imprime ni se registra.
import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

const digest = (s: string) => createHash('sha256').update(s).digest()

/** null = autorizado; si no, la respuesta 401 que hay que devolver. */
export function requireCronSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return process.env.NODE_ENV === 'development' ? null : deny()
  }
  const header = req.headers.get('authorization') ?? ''
  // Se comparan los hashes (largo fijo) en tiempo constante.
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`)) ? null : deny()
}

const deny = () => NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
