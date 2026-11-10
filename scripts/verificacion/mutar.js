#!/usr/bin/env node
// Pruebas de MUTACIÓN: aplica, una por una, pequeñas roturas del código (tests/mutaciones/*.json) y comprueba que las pruebas las detectan (alguna falla). Cada mutación se restaura SIEMPRE (también con Ctrl+C) y al final se
// comprueba que el archivo quedó byte a byte como estaba. Uso: node scripts/verificacion/mutar.js tests/mutaciones/acordes-editor.json [filtro]
// Formato: [{ "archivo": "lib/x.ts", "buscar": "texto que aparece UNA vez", "reemplazar": "texto roto", "pruebas": ["tests/…test.js"], "nota": "qué rompe" }]
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process')
const RAIZ = path.resolve(__dirname, '..', '..'), lista = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), 'utf8')), filtro = process.argv[3] || ''
const originales = new Map()
const restaurar = () => { for (const [f, t] of originales) fs.writeFileSync(f, t) }
process.on('SIGINT', () => { restaurar(); process.exit(130) }); process.on('SIGTERM', () => { restaurar(); process.exit(143) }); process.on('exit', restaurar)
let vivas = 0, matadas = 0, invalidas = 0
for (const [i, m] of lista.entries()) {
  if (filtro && !(m.nota || '').includes(filtro) && !m.archivo.includes(filtro)) continue
  const f = path.join(RAIZ, m.archivo); if (!originales.has(f)) originales.set(f, fs.readFileSync(f, 'utf8'))
  const orig = originales.get(f), veces = orig.split(m.buscar).length - 1
  if (veces !== 1) { console.log(`#${i + 1} NO APLICA (${veces} coincidencias): ${m.nota}`); invalidas++; continue }
  fs.writeFileSync(f, orig.replace(m.buscar, () => m.reemplazar))
  let detectada = false, quien = ''
  try {
    for (const t of m.pruebas) { const r = spawnSync('node', [path.join(RAIZ, t)], { cwd: RAIZ, encoding: 'utf8', timeout: 60000 }); if (r.status !== 0) { detectada = true; quien = t; break } }
  } finally { fs.writeFileSync(f, orig) }
  if (detectada) { matadas++; console.log(`#${i + 1} detectada  (${path.basename(quien)}) — ${m.nota}`) } else { vivas++; console.log(`#${i + 1} SOBREVIVIÓ — ${m.nota}`) }
}
restaurar()
let limpio = true; for (const [f, t] of originales) if (fs.readFileSync(f, 'utf8') !== t) limpio = false
console.log(`\n${matadas} detectadas, ${vivas} sobrevivieron, ${invalidas} no aplican · archivos restaurados: ${limpio ? 'sí' : 'NO'}`)
process.exit(vivas || invalidas || !limpio ? 1 : 0)
