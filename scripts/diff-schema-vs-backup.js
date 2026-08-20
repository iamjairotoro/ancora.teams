// Compara las columnas REALES de un backup (scripts/backup.js) contra las
// columnas definidas en test-schema/schema-consolidated.sql, tabla por
// tabla, en ambas direcciones. Solo lee — no modifica nada.
//
// Uso:
//   node scripts/diff-schema-vs-backup.js <ruta-a-la-carpeta-de-backup> [ruta-al-schema.sql]
//
// Sirve tanto para detectar columnas creadas a mano que nunca quedaron en
// ningún archivo SQL (como pasó con members.last_seen), como para, más
// adelante, verificar después de cada migración de la expansión multi-equipo
// que ninguna columna se haya perdido: backup → diff contra el esquema
// esperado → confirmar 0 diferencias.
const fs = require('fs')
const path = require('path')

const backupDir = process.argv[2]
if (!backupDir) {
  console.error('Uso: node scripts/diff-schema-vs-backup.js <ruta-a-la-carpeta-de-backup> [ruta-al-schema.sql]')
  process.exit(1)
}
if (!fs.existsSync(backupDir)) {
  console.error(`No existe la carpeta: ${backupDir}`)
  process.exit(1)
}

const schemaFile = process.argv[3] || path.join(__dirname, '..', 'test-schema', 'schema-consolidated.sql')
if (!fs.existsSync(schemaFile)) {
  console.error(`No existe el archivo de esquema: ${schemaFile}`)
  process.exit(1)
}

const schemaSql = fs.readFileSync(schemaFile, 'utf8')

// Extrae, para cada "create table if not exists <tabla> ( ... );", el set
// de nombres de columna. Las únicas líneas dentro del paréntesis que NO son
// una columna, en este archivo, son las de constraint a nivel de tabla —
// todas empiezan con "unique(" (no hay "primary key (...)" ni
// "foreign key (...)" como constraint separado en este esquema).
function extractSchemaColumns(sql) {
  const tables = {}
  const tableRe = /create table if not exists (\w+) \(([\s\S]*?)\n\);/g
  let m
  while ((m = tableRe.exec(sql))) {
    const [, tableName, body] = m
    const cols = []
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim()
      if (!line) continue
      if (line.startsWith('--')) continue
      if (line.toLowerCase().startsWith('unique(')) continue
      const colName = line.split(/\s+/)[0]
      if (colName) cols.push(colName)
    }
    tables[tableName] = cols
  }
  return tables
}

const schemaTables = extractSchemaColumns(schemaSql)

// Unión de llaves de TODAS las filas (no solo la primera) — por si alguna
// fila tuviera un shape distinto.
function backupColumns(table) {
  const file = path.join(backupDir, `${table}.json`)
  if (!fs.existsSync(file)) return { rowCount: 0, cols: null, missingFile: true }
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!rows.length) return { rowCount: 0, cols: null, missingFile: false }
  const cols = new Set()
  for (const row of rows) for (const k of Object.keys(row)) cols.add(k)
  return { rowCount: rows.length, cols, missingFile: false }
}

console.log(`Backup:  ${backupDir}`)
console.log(`Schema:  ${schemaFile}`)
console.log(`Tablas en el esquema consolidado: ${Object.keys(schemaTables).length}\n`)

let totalMissingInSchema = 0
let totalExtraInSchema = 0
let hadBlindSpot = false

for (const table of Object.keys(schemaTables)) {
  const schemaCols = new Set(schemaTables[table])
  const { rowCount, cols: backupCols, missingFile } = backupColumns(table)

  console.log(`── ${table} ──`)
  if (missingFile) {
    console.log(`  ⚠️  No hay ${table}.json en el backup — no se puede comparar.`)
    continue
  }
  if (!backupCols) {
    hadBlindSpot = true
    console.log(`  ⚠️  0 filas en el backup — SIN INFORMACIÓN, no se puede comparar ninguna columna.`)
    console.log(`      (Supabase/PostgREST incluye las columnas null como clave con valor null en`)
    console.log(`       cada fila que existe — el único blindspot real es una tabla sin filas.)`)
    continue
  }

  const missingInSchema = [...backupCols].filter(c => !schemaCols.has(c))
  const extraInSchema = [...schemaCols].filter(c => !backupCols.has(c))

  console.log(`  ${rowCount} fila(s) en el backup, ${schemaCols.size} columna(s) en el esquema`)

  if (missingInSchema.length) {
    totalMissingInSchema += missingInSchema.length
    console.log(`  ❌ En el backup pero FALTAN en el esquema: ${missingInSchema.join(', ')}`)
  }
  if (extraInSchema.length) {
    totalExtraInSchema += extraInSchema.length
    console.log(`  🔶 En el esquema pero NO aparecen en el backup: ${extraInSchema.join(', ')}`)
  }
  if (!missingInSchema.length && !extraInSchema.length) {
    console.log(`  ✓ coinciden exactamente`)
  }
  console.log('')
}

console.log(`\nTotal columnas faltantes en el esquema: ${totalMissingInSchema}`)
console.log(`Total columnas del esquema sin aparecer en el backup: ${totalExtraInSchema}`)
if (hadBlindSpot) {
  console.log('⚠️  Al menos una tabla tenía 0 filas — revisá esa tabla a mano, el diff no la cubre.')
}
if (totalMissingInSchema > 0) process.exitCode = 1
