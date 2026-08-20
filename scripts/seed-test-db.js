// Carga un backup generado por scripts/backup.js (JSON por tabla) en un
// proyecto de Supabase de PRUEBA, anonimizando datos personales de members.
//
// Uso:
//   TEST_SUPABASE_URL=https://xxxxx.supabase.co \
//   TEST_SUPABASE_ANON_KEY=eyJhbGci... \
//   SEED_CONFIRM=yes \
//   node scripts/seed-test-db.js backup/2026-07-31T02-00-00-000Z
//
// La ruta al backup es un argumento posicional — nunca hardcodeada.
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const backupDir = process.argv[2]
if (!backupDir) {
  console.error('Uso: node scripts/seed-test-db.js <ruta-a-la-carpeta-de-backup>')
  console.error('Ejemplo: node scripts/seed-test-db.js backup/2026-07-31T02-00-00-000Z')
  process.exit(1)
}
if (!fs.existsSync(backupDir)) {
  console.error(`No existe la carpeta: ${backupDir}`)
  process.exit(1)
}

const url = process.env.TEST_SUPABASE_URL
const anonKey = process.env.TEST_SUPABASE_ANON_KEY
if (!url || !anonKey) {
  console.error('Faltan TEST_SUPABASE_URL / TEST_SUPABASE_ANON_KEY en el entorno.')
  process.exit(1)
}

// No hay forma de distinguir "es la base de prueba" de "es producción" solo
// mirando la URL (ambas son un https://xxxxx.supabase.co al azar) — así que
// en vez de adivinar, exigimos una confirmación explícita y mostramos bien
// grande a qué URL se va a escribir, para que sea imposible correr esto por
// accidente sin mirar.
if (process.env.SEED_CONFIRM !== 'yes') {
  console.error(`\nEste script va a INSERTAR datos en:\n  ${url}\n`)
  console.error('Si es la base de prueba correcta, corré de nuevo agregando SEED_CONFIRM=yes.\n')
  process.exit(1)
}

const supabase = createClient(url, anonKey)

function readTable(table) {
  const file = path.join(backupDir, `${table}.json`)
  if (!fs.existsSync(file)) {
    console.log(`  (sin archivo ${table}.json — se salta)`)
    return []
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

// ── Anonimización de datos personales de members ──
// Todo lo demás (id, foreign keys, posicion, status, sent_at, tono, fechas,
// instrumentos, etc.) queda intacto.
function anonymizeMembers(rows) {
  return rows.map((m, i) => ({
    ...m,
    nombre: `Persona ${i + 1}`,
    apellido: '',
    email: `persona${i + 1}@test.local`,
    telefono: null,
    avatar_url: null,
    fecha_nacimiento: null, // no estaba en tu lista, pero es dato personal — la limpio igual
  }))
}

// El contenido de los mensajes es texto real entre personas reales — no
// estaba en tu lista de campos a anonimizar (esa lista hablaba de members),
// pero por el mismo espíritu lo reemplazo por texto sintético. Todo lo demás
// (member_id, service_id, recipient_member_id, created_at) queda intacto.
function anonymizeMessages(rows) {
  return rows.map((m, i) => ({ ...m, content: `Mensaje de prueba #${i + 1}` }))
}

async function insertChunked(table, rows, chunkSize = 500) {
  if (!rows.length) {
    console.log(`✓ ${table}: 0 fila(s) (nada que insertar)`)
    return 0
  }
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const { error } = await supabase.from(table).insert(chunk)
    if (error) {
      console.error(`\n✗ ${table}: FALLÓ en el lote ${i}-${i + chunk.length} — ${error.message}`)
      console.error(`  Filas ya insertadas antes de este lote en esta tabla: ${i}`)
      throw new Error(`Seed abortado en la tabla "${table}"`)
    }
  }
  console.log(`✓ ${table}: ${rows.length} fila(s)`)
  return rows.length
}

// Orden de carga — respeta las foreign keys y, además, inserta
// banda_assignments ANTES que invitations a propósito.
//
// Por qué: el trigger flag_reassignment_if_changed corre en cada INSERT en
// banda_assignments y busca la invitation de ese service_id+member_id para
// recalcular needs_reassignment_confirm. Si invitations todavía está vacía
// en ese momento (porque la cargamos después), el trigger nunca encuentra
// nada que tocar — no-op garantizado. Así los datos de invitations quedan
// exactamente como en el backup, sin necesidad de deshabilitar el trigger
// (que además no se podría: deshabilitar triggers requiere permisos de
// dueño de tabla — no algo que la anon key pueda hacer).
const TABLES_IN_ORDER = [
  'members',
  'songs',
  'services',
  'admin_emails',
  'setlist_items',
  'banda_assignments',   // antes que invitations — ver nota arriba
  'invitations',
  'service_blocks',
  'availability',
  'date_blocks',
  'song_favorites',
  'messages',
  'chat_presence',
  // push_subscriptions queda fuera a propósito — ver aviso al final.
]

async function main() {
  console.log(`Cargando backup desde: ${backupDir}`)
  console.log(`Destino: ${url}\n`)

  const counts = {}
  for (const table of TABLES_IN_ORDER) {
    let rows = readTable(table)
    if (table === 'members') rows = anonymizeMembers(rows)
    if (table === 'messages') rows = anonymizeMessages(rows)
    counts[table] = await insertChunked(table, rows)
  }

  console.log('\n── Resumen ──')
  for (const table of TABLES_IN_ORDER) console.log(`  ${table}: ${counts[table]}`)

  console.log(`\n⚠️  push_subscriptions no se cargó — son credenciales reales de push de`)
  console.log('   dispositivos de personas reales, sin valor para probar migraciones.')
  console.log('   Si de verdad las necesitás, agregá "push_subscriptions" a TABLES_IN_ORDER')
  console.log('   (después de "members") y volvé a correr.')
}

main().catch(e => {
  console.error(`\n${e.message}`)
  process.exit(1)
})
