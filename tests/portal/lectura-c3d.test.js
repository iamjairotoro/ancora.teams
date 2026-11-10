// Etapa C3d: la hoja «Previsualizar tonalidad» (letras C a B, bemol y sostenido, «Original X», «Tono del servicio X», aviso y «Guardar»), solo tonos del mismo modo. Datos inventados; sin red. Correr: `node tests/portal/lectura-c3d.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const Z = require(path.join(RAIZ, 'lib/tonalidad.ts')), Tn = require(path.join(RAIZ, 'lib/tonos.ts')), { TEXTOS_ACORDES: T } = require(path.join(RAIZ, 'lib/textos/acordesLectura.ts'))
const Hoja = require(path.join(RAIZ, 'app/portal/_components/lectura/HojaTonalidad.tsx')).default
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const dibujar = (o = {}) => R(h(Hoja, { original: 'G', servicio: null, actual: 'G', onElegir() {}, onCerrar() {}, ...o }))

correr(async () => {
  await prueba('tonoDe: letra + alteración → el tono (con «m» si la canción es menor); las combinaciones que no existen (Cb, Fb, B#, E#) dan null', () => {
    const t = [['G', 'C', '', 'C'], ['G', 'B', 'b', 'Bb'], ['G', 'C', '#', 'C#'], ['G', 'A', 'b', 'Ab'], ['G', 'D', '#', 'D#'], ['G', 'E', '#', null], ['G', 'B', '#', null], ['G', 'C', 'b', null], ['G', 'F', 'b', null], ['Em', 'A', '', 'Am'], ['Em', 'F', '#', 'F#m'], ['Em', 'B', 'b', 'Bbm'], ['Em', 'E', '#', null]]
    for (const [o, l, a, e] of t) assert.equal(Z.tonoDe(o, l, a), e, `${o} ${l}${a}`)
    assert.deepEqual([...Z.LETRAS_TONO], ['C', 'D', 'E', 'F', 'G', 'A', 'B'])
  })
  await prueba('partesDeTono, alElegirLetra y alElegirAlteracion: la letra conserva la alteración si existe; ♭ y ♯ se alternan y se apagan donde no existe el tono', () => {
    assert.deepEqual(Z.partesDeTono('F#m'), { letra: 'F', alt: '#' }); assert.deepEqual(Z.partesDeTono('Bb'), { letra: 'B', alt: 'b' }); assert.deepEqual(Z.partesDeTono('G'), { letra: 'G', alt: '' }); for (const x of ['', 'H', 'Gm7', 'g']) assert.equal(Z.partesDeTono(x), null, x)
    assert.equal(Z.alElegirLetra('G', 'Bb', 'D'), 'Db'); assert.equal(Z.alElegirLetra('G', 'Bb', 'C'), 'C', 'Cb no existe: la letra sola'); assert.equal(Z.alElegirLetra('G', 'F#', 'G'), 'G#'); assert.equal(Z.alElegirLetra('Em', 'F#m', 'A'), 'A#m')
    assert.equal(Z.alElegirAlteracion('G', 'B', 'b'), 'Bb'); assert.equal(Z.alElegirAlteracion('G', 'Bb', 'b'), 'B', 'tocar ♭ otra vez la quita'); assert.equal(Z.alElegirAlteracion('G', 'C', 'b'), null); assert.equal(Z.alElegirAlteracion('G', 'Bb', '#'), null, 'B♯ no existe')
    assert.equal(Z.alElegirAlteracion('G', 'F#', '#'), 'F', 'tocar ♯ sobre F♯ la quita'); assert.equal(Z.alElegirAlteracion('G', 'raro', 'b'), null)
  })
  await prueba('SOLO el mismo modo: ninguna combinación de letras y alteraciones produce un tono del otro modo (mayor y menor)', () => {
    for (const original of ['G', 'Bb', 'Em', 'F#m']) {
      const ok = Tn.tonosDelMismoModo(original), menor = Tn.esTonoMenor(original)
      for (const l of Z.LETRAS_TONO) for (const a of ['', 'b', '#']) { const t = Z.tonoDe(original, l, a); if (t) { assert.ok(ok.includes(t), `${original}: ${t}`); assert.equal(Tn.esTonoMenor(t), menor) } }
      for (const actual of ok) for (const l of Z.LETRAS_TONO) { const t = Z.alElegirLetra(original, actual, l); assert.ok(t && ok.includes(t), `${original} ${actual} ${l}`) ; for (const a of ['b', '#']) { const u = Z.alElegirAlteracion(original, actual, a); assert.ok(u === null || ok.includes(u)) } }
    }
  })
  await prueba('la hoja: título, «Original G», «Tono del servicio A» solo si hay servicio, siete letras (con «m» en un tono menor), ♭ y ♯, aviso y «Guardar»; sin Cejilla', () => {
    const sin = dibujar(), con = dibujar({ servicio: 'A', actual: 'A' })
    assert.ok(sin.includes('Previsualizar tonalidad') && sin.includes('>Original G<') && !sin.includes('Tono del servicio') && sin.includes('Si cambias aquí, solo cambia lo que ves tú.') && sin.includes('>Guardar<'))
    assert.ok(con.includes('>Tono del servicio A<') && con.includes('El servicio usa A. Si cambias aquí, solo cambia lo que ves tú.'))
    assert.deepEqual([...sin.matchAll(/role="radio" aria-checked="(\w+)"[^>]*>([^<]+)</g)].map(m => m[2]), ['C', 'D', 'E', 'F', 'G', 'A', 'B']); assert.deepEqual([...dibujar({ original: 'Em', actual: 'Em' }).matchAll(/role="radio"[^>]*>([^<]+)</g)].map(m => m[1]), ['Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm'])
    assert.ok(!/Cejilla|capo/i.test(con), 'la cejilla se deja para después'); assert.ok(sin.includes('aria-label="Bemol"') && sin.includes('aria-label="Sostenido"') && sin.includes('♭') && sin.includes('♯'))
  })
  await prueba('estado de la hoja: la letra actual y la alteración quedan marcadas; ♭ y ♯ se apagan donde el tono no existe; «Original»/«Servicio» marcan el que se lee', () => {
    const marcadas = html => [...html.matchAll(/role="radio" aria-checked="true"[^>]*>([^<]+)</g)].map(m => m[1])
    assert.deepEqual(marcadas(dibujar({ actual: 'Bb' })), ['B']); assert.ok(/aria-pressed="true"[^>]*aria-label="Bemol"|aria-label="Bemol"[^>]*aria-pressed="true"/.test(dibujar({ actual: 'Bb' })) || dibujar({ actual: 'Bb' }).includes('aria-pressed="true" aria-label="Bemol"'))
    const e = dibujar({ actual: 'E' }); assert.ok(/aria-label="Sostenido" disabled/.test(e), 'E♯ no existe'); assert.ok(!/aria-label="Bemol" disabled/.test(e), 'E♭ sí')
    const c = dibujar({ actual: 'C' }); assert.ok(/aria-label="Bemol" disabled/.test(c) && !/aria-label="Sostenido" disabled/.test(c), 'C♭ no existe, C♯ sí')
    const s = dibujar({ servicio: 'A', actual: 'A' }); assert.ok(/aria-pressed="true"[^>]*>Tono del servicio A</.test(s) && /aria-pressed="false"[^>]*>Original G</.test(s))
    assert.ok(/aria-pressed="true"[^>]*>Original G</.test(dibujar({ servicio: 'A', actual: 'G' })))
  })
  await prueba('la pantalla: la píldora abre la hoja; los toques cambian el tono de lectura al instante; «Guardar» lo deja y cerrar de otra forma lo revierte; elegir el tono del servicio quita la elección local; la hoja de C1 conserva su selector (revisión del código fuente)', () => {
    const l = leer('app/portal/_components/lectura/LecturaCancion.tsx'), hj = leer('app/portal/_components/lectura/HojaTonalidad.tsx')
    assert.ok(l.includes('onTono={() => setTonoAbierto({ alAbrir: tonoLocal })}') && l.includes('<HojaTonalidad original={acordes.tono} servicio={servicio} actual={tono} onElegir={elegirTono}'))
    assert.ok(l.includes('if (!guardado) setTonoLocal(tonoAbierto.alAbrir)') && l.includes('setTonoLocal(t === base.tono ? null : t)') && l.includes("const servicio = base.origen === 'servicio' ? base.tono : null"))
    assert.ok(hj.includes('guardado.current = true; cerrar()') && hj.includes('onCerrar={() => onCerrar(guardado.current)}')); assert.ok(!/fetch\(|localStorage|portalFetch/.test(hj), 'no guarda nada: solo vale en esta pantalla')
  })
  await prueba('CSS: tokens de la app, sin colores fijos, rem salvo las zonas táctiles (44 px)', () => {
    const css = leer('app/portal/_components/lectura/hoja-tonalidad.module.css')
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css)); assert.deepEqual([...css.matchAll(/(?<![\w.-])(\d*\.?\d+)px/g)].filter(m => parseFloat(m[1]) > 2 && parseFloat(m[1]) !== 44).map(m => m[0]), [])
    assert.ok(/\.letra\{[^}]*min-height:max\(44px, 3\.25rem\)/.test(css) && /\.alt\{[^}]*min-height:max\(44px, 2\.75rem\)/.test(css) && /\.guardar\{[^}]*min-height:max\(44px, 3\.25rem\)/.test(css) && /\.enlace\{[^}]*min-height:max\(44px, 2\.75rem\)/.test(css))
  })
  terminar()
})
