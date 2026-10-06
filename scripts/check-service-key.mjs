// Comprueba, en el entorno LOCAL, que SUPABASE_SERVICE_ROLE_KEY está definida.
//
//   node scripts/check-service-key.mjs
//
// Imprime SOLO «definida: sí/no» (y un REVISA si hay una variable NEXT_PUBLIC_
// con «SERVICE_ROLE» en el nombre). Nunca imprime un valor, un largo, el
// entorno ni el mensaje de una excepción. Solo mira el entorno local (.env*
// del proyecto y las variables del shell): la variable de Vercel (Production y
// Preview) se verifica a mano en el panel.
import { createRequire } from 'node:module'

try {
  const require = createRequire(import.meta.url)
  const { loadEnvConfig } = require('@next/env')
  loadEnvConfig(process.cwd(), true, { info() {}, error() {} }) // en silencio

  const definida = (nombre) => typeof process.env[nombre] === 'string' && process.env[nombre].trim() !== ''
  console.log(`SUPABASE_SERVICE_ROLE_KEY definida: ${definida('SUPABASE_SERVICE_ROLE_KEY') ? 'sí' : 'no'}`)

  // Una llave de servicio con prefijo público terminaría en el navegador.
  const publicas = Object.keys(process.env).some((n) => n.startsWith('NEXT_PUBLIC_') && n.includes('SERVICE_ROLE'))
  console.log(publicas ? 'REVISA: nombre con prefijo público' : 'Variables NEXT_PUBLIC_ con SERVICE_ROLE: no')
} catch {
  // Cualquier error: ni el mensaje ni el entorno.
  console.log('no se pudo comprobar')
}
