// Respaldo manual de todas las tablas de la app vía @supabase/supabase-js
// (usa la misma anon key que la app — no requiere Docker ni la contraseña
// de Postgres). Uso: node scripts/backup.js
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

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (revisa tu .env.local).')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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

  console.log(`Respaldando ${TABLES.length} tablas en backup/${stamp}/\n`)

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
    console.log(`✓ ${table}: ${data.length} fila(s)${data.length === 0 ? '  ⚠️  vacía' : ''}`)
  }

  console.log(`\nTotal: ${totalRows} fila(s) respaldadas en backup/${stamp}/`)
  if (hadError) {
    console.log('\n⚠️  Al menos una tabla dio error — revisa arriba antes de confiar en este backup.')
    process.exitCode = 1
  }
}

main()
