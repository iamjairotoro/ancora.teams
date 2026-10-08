// Respaldo manual de las tablas de la app vía @supabase/supabase-js (no requiere
// Docker ni la contraseña de Postgres). Uso: node scripts/backup.js
//
// LLAVE: usa SUPABASE_SERVICE_ROLE_KEY si está definida (en .env.local) y, si no, la
// anon key. Con la anon key, toda tabla con el acceso público CERRADO (date_blocks
// desde la migración 033, y las que cierre el punto 50) devuelve 0 filas SIN error: el
// respaldo saldría incompleto sin avisar. Por eso el script dice qué llave usa («llave
// de servicio: sí/no») y, sin ella, advierte. La llave NUNCA se imprime ni se guarda.
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Este script corre fuera de Next.js, que es quien normalmente carga
// .env.local — así que lo leemos a mano aquí.
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasServiceKey = !!SERVICE_KEY

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!hasServiceKey && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY (revisa tu .env.local).')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasServiceKey ? SERVICE_KEY : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const TABLES = [
  'members', 'songs', 'services', 'setlist_items', 'banda_assignments',
  'invitations', 'service_blocks', 'admin_emails', 'availability',
  'date_blocks', 'push_subscriptions', 'song_favorites', 'messages', 'chat_presence',
]

const PAGE_SIZE = 1000 // límite por defecto de PostgREST — paginamos para no truncar tablas grandes en silencio

async function fetchAllRows(table) {
  let from = 0
  const all = []
  while (true) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE_SIZE - 1)
    if (error) return { error }
    all.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return { data: all }
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const runDir = path.join(__dirname, '..', 'backup', stamp)
  fs.mkdirSync(runDir, { recursive: true })

  console.log(`Respaldando ${TABLES.length} tablas en backup/${stamp}/`)
  console.log(`llave de servicio: ${hasServiceKey ? 'sí' : 'NO'}`)
  if (!hasServiceKey) {
    console.log('⚠️  SIN llave de servicio (SUPABASE_SERVICE_ROLE_KEY): se usa la anon key. Las tablas con el acceso')
    console.log('    público cerrado (date_blocks desde la migración 033, y las que cierre el punto 50) saldrán VACÍAS')
    console.log('    SIN error. No confíes en este respaldo para esas tablas: definí la llave en .env.local.')
  }
  console.log('')

  let totalRows = 0
  let hadError = false

  for (const table of TABLES) {
    const { data, error } = await fetchAllRows(table)
    if (error) {
      hadError = true
      console.log(`✗ ${table}: ERROR — ${error.message}`)
      continue
    }
    fs.writeFileSync(path.join(runDir, `${table}.json`), JSON.stringify(data, null, 2))
    totalRows += data.length
    const vacia = data.length === 0 ? (hasServiceKey ? '  ⚠️  vacía' : '  ⚠️  vacía (¿acceso cerrado? sin llave de servicio no se distingue)') : ''
    console.log(`✓ ${table}: ${data.length} fila(s)${vacia}`)
  }

  console.log(`\nTotal: ${totalRows} fila(s) respaldadas en backup/${stamp}/`)
  if (hadError) {
    console.log('\n⚠️  Al menos una tabla dio error — revisa arriba antes de confiar en este backup.')
    process.exitCode = 1
  }
}

main()
