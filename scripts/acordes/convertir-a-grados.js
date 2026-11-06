#!/usr/bin/env node
// Convierte las variantes de acordes del formato 1 (texto absoluto, "chord": "C#m") al formato 2 (grados). POR DEFECTO SOLO SIMULA: no escribe nada, en ningún modo salvo --aplicar.
//
//   Simular con un archivo (sin credenciales ni red): correr scripts/acordes/exportar-variantes.sql en el editor SQL, guardar el resultado como JSON y
//     node scripts/acordes/convertir-a-grados.js --archivo variantes.json [--informe informe.json]
//   Simular leyendo la base (solo lectura):  NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/acordes/convertir-a-grados.js --supabase
//   Aplicar (escribe):  ACORDES_CONFIRMAR=si … node scripts/acordes/convertir-a-grados.js --supabase --aplicar --esperar N [--respaldo ruta.json]
//     · exige --supabase (lee las filas vivas), --esperar N (aborta si lo que se convertiría no es exactamente N) y ACORDES_CONFIRMAR=si
//     · guarda un respaldo con las líneas originales y lo vuelve a leer ANTES de escribir la primera fila
//     · cada fila se actualiza solo si SIGUE en formato 1 (si alguien la tocó, no se pisa) y se detiene al primer fallo
//     · se salta sin tocar: variantes ya en grados, canciones sin tono, variantes sin acordes y las que tienen algo que no se entiende como acorde (esas se revisan a mano)
//   ANTES de aplicar: la app solo lee acordes en formato 1. No correr --aplicar hasta que la lectura de formato 2 esté publicada (etapa C), o las canciones convertidas se verían sin acordes.
const fs = require('fs'), path = require('path'), Module = require('module')

function cargarLib() {
  const RAIZ = path.resolve(__dirname, '..', '..'), ts = require(path.join(RAIZ, 'node_modules', 'typescript'))
  Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022' } }).outputText, file)
  return require(path.join(RAIZ, 'lib', 'acordes.ts'))
}

const acordesDe = lineas => lineas.flatMap(l => l.kind === 'bars' ? String(l.bars).trim().split(/\s+/).filter(Boolean) : l.segments.map(s => s.chord).filter(Boolean))
const tieneAcordes = lineas => lineas.some(l => l.kind === 'bars' || (Array.isArray(l.segments) && l.segments.some(s => s.chord)))

/** Decide, sin escribir, qué pasaría con cada variante. `filas`: {variante_id, cancion_id, nombre, tono_original, formato, lines}. */
function planificar(filas, A) {
  const items = filas.map(f => {
    const base = { varianteId: f.variante_id, cancionId: f.cancion_id, nombre: f.nombre, tono: f.tono_original || null }
    if (f.formato === 2) return { ...base, accion: 'ya_en_grados' }
    if (!Array.isArray(f.lines)) return { ...base, accion: 'lines_no_valido' }
    if (!tieneAcordes(f.lines)) return { ...base, accion: 'sin_acordes' }
    const tono = A.normalizarTono(f.tono_original)
    if (!tono) return { ...base, accion: 'sin_tono' }
    let c; try { c = A.convertirVariante(f.lines, tono) } catch { return { ...base, tono, accion: 'lines_no_valido' } }
    if (c.noConvertidos.length) return { ...base, tono, accion: 'revisar', noConvertidos: c.noConvertidos }
    const vuelve = acordesDe(c.resultado.map(l => A.lineaAFormato1(l, tono))), antes = acordesDe(f.lines)
    const ortografia = antes.map((x, i) => [x, vuelve[i]]).filter(([x, y]) => x !== y).map(([x, y]) => `${x} → ${y}`)
    return { ...base, tono, accion: 'convertir', nueva: c.resultado, original: f.lines, ortografia }
  })
  const resumen = {}; for (const i of items) resumen[i.accion] = (resumen[i.accion] || 0) + 1
  return { items, resumen }
}

/** Escribe. Nada se llama desde aquí sin --aplicar: lo invoca solo la línea de comandos con todas las condiciones puestas. */
async function aplicar({ cliente, filas, A, esperar, rutaRespaldo }) {
  if (!Number.isInteger(esperar)) throw new Error('Falta --esperar N')
  if (!rutaRespaldo) throw new Error('Falta la ruta del respaldo')
  const { items } = planificar(filas, A), porConvertir = items.filter(i => i.accion === 'convertir')
  if (porConvertir.length !== esperar) throw new Error(`Se esperaban ${esperar} variantes por convertir y hay ${porConvertir.length}: no se escribe nada`)
  fs.writeFileSync(rutaRespaldo, JSON.stringify(porConvertir.map(i => ({ variante_id: i.varianteId, formato: 1, lines: i.original })), null, 2))
  const leido = JSON.parse(fs.readFileSync(rutaRespaldo, 'utf8'))
  if (leido.length !== porConvertir.length || leido.some((r, n) => JSON.stringify(r.lines) !== JSON.stringify(porConvertir[n].original))) throw new Error('El respaldo no coincide con lo leído: no se escribe nada')
  const hechas = []
  for (const i of porConvertir) {
    const { data, error } = await cliente.from('song_section_variants').update({ lines: i.nueva, formato: 2 }).eq('id', i.varianteId).eq('formato', 1).select('id')
    if (error || !data || data.length !== 1) return { hechas, falloEn: i.varianteId, motivo: error ? error.message : 'la fila ya no estaba en formato 1' }
    hechas.push(i.varianteId)
  }
  return { hechas, falloEn: null }
}

async function leerDeLaBase(cliente) {
  const todo = async (tabla, cols) => { const out = []; for (let d = 0; ; d += 1000) { const { data, error } = await cliente.from(tabla).select(cols).range(d, d + 999); if (error) throw new Error(`${tabla}: ${error.message}`); out.push(...data); if (data.length < 1000) return out } }
  const [vars, secs, songs] = await Promise.all([todo('song_section_variants', 'id, section_id, formato, lines'), todo('song_sections', 'id, song_id'), todo('songs', 'id, nombre, tono_original')])
  const sec = new Map(secs.map(s => [s.id, s.song_id])), can = new Map(songs.map(s => [s.id, s]))
  return vars.map(v => { const c = can.get(sec.get(v.section_id)) || {}; return { variante_id: v.id, cancion_id: c.id, nombre: c.nombre, tono_original: c.tono_original, formato: v.formato, lines: v.lines } })
}

function imprimir({ items, resumen }) {
  console.log('Variantes:', items.length, JSON.stringify(resumen))
  for (const i of items) console.log(`  ${i.accion.padEnd(15)} ${i.nombre || '?'} (${i.tono || 'sin tono'}) variante ${i.varianteId}${i.noConvertidos ? ' NO SE ENTIENDE: ' + i.noConvertidos.join(', ') : ''}${i.ortografia && i.ortografia.length ? ' cambia la escritura (suena igual): ' + i.ortografia.join(', ') : ''}`)
}

async function main(argv, env) {
  const arg = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined }, tiene = n => argv.includes(n), A = cargarLib()
  let filas, cliente
  if (arg('--archivo')) filas = JSON.parse(fs.readFileSync(arg('--archivo'), 'utf8'))
  else if (tiene('--supabase')) {
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
    cliente = require('@supabase/supabase-js').createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    filas = await leerDeLaBase(cliente)
  } else throw new Error('Uso: --archivo variantes.json  |  --supabase  [--aplicar --esperar N]')
  if (Array.isArray(filas) && filas.length === 1 && filas[0] && filas[0].variantes) filas = filas[0].variantes
  const plan = planificar(filas, A); imprimir(plan)
  if (arg('--informe')) fs.writeFileSync(arg('--informe'), JSON.stringify(plan.items.map(({ nueva, original, ...r }) => r), null, 2))
  if (!tiene('--aplicar')) { console.log('\nSolo simulación: no se escribió nada. Para aplicar hace falta --aplicar.'); return 0 }
  if (!cliente) throw new Error('--aplicar exige --supabase (lee las filas vivas)')
  if (env.ACORDES_CONFIRMAR !== 'si') throw new Error('--aplicar exige ACORDES_CONFIRMAR=si')
  const r = await aplicar({ cliente, filas, A, esperar: Number(arg('--esperar')), rutaRespaldo: arg('--respaldo') || `respaldo-acordes-${new Date().toISOString().replace(/[:.]/g, '-')}.json` })
  console.log(r.falloEn ? `\nSE DETUVO en la variante ${r.falloEn}: ${r.motivo}. Convertidas antes: ${r.hechas.length}.` : `\nConvertidas: ${r.hechas.length}.`)
  return r.falloEn ? 1 : 0
}

module.exports = { cargarLib, planificar, aplicar, leerDeLaBase, main }
if (require.main === module) main(process.argv.slice(2), process.env).then(c => process.exit(c), e => { console.error('Error:', e.message); process.exit(1) })
