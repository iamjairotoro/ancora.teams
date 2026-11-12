// Estructura de «Nueva canción», paso S0 (solo pruebas, sin cambios de comportamiento): la lectura del músico (C3) y el formato de `default_arrangement` YA soportan la MISMA sección varias veces, también NO seguidas:
// V1, V2, C, V1, V2, C, Bd, V3, C. Un paso por entrada del arreglo (sin quitar repetidas), con la letra de cada sección y un id `parte-N` distinto por paso. DATOS INVENTADOS; sin red.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx')]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup } = require(path.join(RAIZ, 'node_modules/react-dom/server'))
const real = n => require(path.join(RAIZ, n))
const { armarHojaAcordes } = real('lib/portal/acordesCancion.ts')
const { afectadasEnArreglo, idsDelArreglo } = real('lib/resumenGuardado.ts')
const HojaAcordes = real('components/canciones/HojaAcordes.tsx').default

const lyric = t => ({ kind: 'lyric', segments: [{ text: t }] })
const CODIGOS = ['V1', 'V2', 'V3', 'C', 'Bd']
const secciones = CODIGOS.map((code, i) => ({ id: 's' + code, code, name: { V1: 'VERSO 1', V2: 'VERSO 2', V3: 'VERSO 3', C: 'CORO', Bd: 'PUENTE' }[code], sort_order: i }))
const variantes = secciones.map(s => ({ section_id: s.id, label: 'Principal', lines: [lyric('palabra' + s.code)], is_default: true, formato: 2 }))
const e = (code, repeat = 1) => ({ sectionId: 's' + code, label: code, repeat })
const NO_SEGUIDAS = ['V1', 'V2', 'C', 'V1', 'V2', 'C', 'Bd', 'V3', 'C']
const hoja = arreglo => armarHojaAcordes({ tono: 'G', arreglo, secciones, variantes })
const prefs = { notation: 'americano', vista: 'todo', compacta: false }
const tipo = { fontFamily: 'sans-serif', textScale: 1, lineHeightWide: false }
const dibujar = h => renderToStaticMarkup(React.createElement(HojaAcordes, { title: 'Canción inventada', hoja: h, prefs, onPrefs() {}, typography: tipo, c3: { tonoLocal: null, onTonoLocal() {} } }))

correr(async () => {
  await prueba('la misma sección NO seguida: 9 entradas dan 9 pasos, en ese orden, cada uno con la letra de su sección (V1, V2 y C aparecen dos o tres veces)', () => {
    const h = hoja(NO_SEGUIDAS.map(c => e(c)))
    assert.deepEqual(h.secciones.map(s => s.code), NO_SEGUIDAS, 'un paso por entrada, sin quitar repetidas')
    assert.deepEqual(h.secciones.map(s => s.lineas[0].segments[0].text), NO_SEGUIDAS.map(c => 'palabra' + c))
    assert.ok(h.secciones.every(s => s.repeat === 1)) })

  await prueba('seguidas y no seguidas a la vez: «C ×2» es UNA entrada con repeat 2; el mismo C más adelante es otra entrada', () => {
    const h = hoja([e('V1'), e('C', 2), e('V2'), e('C', 3)])
    assert.deepEqual(h.secciones.map(s => [s.code, s.repeat]), [['V1', 1], ['C', 2], ['V2', 1], ['C', 3]]) })

  await prueba('la hoja del músico dibuja un id distinto por paso (parte-0 … parte-8) aunque la sección se repita, y la letra de cada aparición', () => {
    const html = dibujar(hoja(NO_SEGUIDAS.map(c => e(c))))
    const ids = [...html.matchAll(/id="(parte-\d+)"/g)].map(m => m[1])
    assert.deepEqual(ids, Array.from({ length: 9 }, (_, i) => 'parte-' + i), 'un id por paso, sin duplicados')
    assert.equal(new Set(ids).size, 9)
    assert.equal((html.match(/>palabraC</g) || []).length, 3, 'el coro sale tres veces'); assert.equal((html.match(/>palabraV1</g) || []).length, 2); assert.equal((html.match(/>palabraBd</g) || []).length, 1) })

  await prueba('el arreglo se guarda y se lee tal cual: ordenar, repetir y volver a leer no cambia nada (el formato es una lista de {sectionId, label, repeat})', () => {
    const arreglo = NO_SEGUIDAS.map(c => e(c)), vuelta = JSON.parse(JSON.stringify(arreglo))
    assert.deepEqual(hoja(vuelta).secciones.map(s => s.code), NO_SEGUIDAS)
    assert.deepEqual(idsDelArreglo(arreglo), NO_SEGUIDAS.map(c => 's' + c), 'idsDelArreglo conserva las repeticiones, una por entrada') })

  await prueba('el aviso de «secciones del arreglo afectadas» cuenta CADA aparición (CORO sale 3 veces: dar de baja la sección afecta 3 entradas)', () => {
    const actual = { secciones: secciones.map(s => ({ id: s.id, codigo: s.code, nombre: s.name })), arreglo: idsDelArreglo(NO_SEGUIDAS.map(c => e(c))) }
    const c = afectadasEnArreglo(actual, actual.secciones.slice(0, 3).map(s => ({ codigo: s.codigo })))      // se dan de baja las dos últimas filas (C y Bd)
    assert.equal(c.find(x => x.codigo === 'C').entradas, 3, 'CORO: 3 entradas'); assert.equal(c.find(x => x.codigo === 'Bd').entradas, 1) })

  await prueba('una entrada que apunta a una sección que ya no existe se salta sin romper la repetición de las demás (arreglo guardado con una sección dada de baja)', () => {
    const h = hoja([e('V1'), { sectionId: 'fantasma', label: 'X', repeat: 1 }, e('C'), e('V1')])
    assert.deepEqual(h.secciones.map(s => s.code), ['V1', 'C', 'V1']) })

  terminar()
})
