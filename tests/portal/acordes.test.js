// Etapa B: acordes como grados (lib/acordes.ts). Puras, sin base ni servidor. Se prueba contra los casos verificados de lib/chords.ts, que no se reescribe.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs'), Module = require('module')
const RAIZ = path.resolve(__dirname, '..', '..'), ts = require(path.join(RAIZ, 'node_modules', 'typescript'))
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022' } }).outputText, file)
const A = require(path.join(RAIZ, 'lib/acordes.ts')), C = require(path.join(RAIZ, 'lib/chords.ts'))
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
const MAYORES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'C#', 'F#']
const SOLO = A.mostrarAcorde, G = (l, k) => A.aGrado(l, k)

console.log('tonalidades')
t('normalizarTono: símbolos, mayúscula y basura', () => {
  assert.equal(A.normalizarTono(' c♯m '), 'C#m'); assert.equal(A.normalizarTono('B♭'), 'Bb'); assert.equal(A.normalizarTono('g'), 'G')
  for (const x of ['', ' ', 'H', 'Sol', 'G/A', 'C#mm', 'Cmaj', null, undefined, 4]) assert.equal(A.normalizarTono(x), null, String(x)) })
t('tonicaMayor: el menor se mide contra su relativo mayor, tal como se escribe', () => {
  const casos = { 'C#m': 'E', Abm: 'B', Am: 'C', Dm: 'F', Gm: 'Bb', Cm: 'Eb', Fm: 'Ab', Ebm: 'Gb', Bbm: 'Db', 'F#m': 'A', Bm: 'D', Em: 'G', 'G#m': 'B', G: 'G', Bb: 'Bb', E: 'E' }
  for (const [k, v] of Object.entries(casos)) assert.equal(A.tonicaMayor(k), v, k)
  assert.equal(A.tonicaMayor('Sol'), null) })

console.log('equivalencia con chords.ts (casos verificados)')
t('los casos de chords.ts en Números dan lo mismo', () => {
  assert.equal(SOLO(G('C#m', 'E'), 'E', 'number'), '6m'); assert.equal(SOLO(G('B/D#', 'E'), 'E', 'number'), '5/7'); assert.equal(SOLO(G('F#', 'E'), 'E', 'number'), '2')
  assert.equal(SOLO(G('F#m', 'E'), 'E', 'number'), '2m'); assert.equal(SOLO(G('A9', 'A'), 'A', 'number'), '1(9)'); assert.equal(SOLO(G('Dsus2', 'A'), 'A', 'number'), '4sus2') })
t('el tono menor da lo mismo que su relativo mayor: C#m = E', () => {
  assert.equal(SOLO(G('C#m', 'C#m'), 'C#m', 'number'), '6m'); assert.deepEqual(G('E', 'C#m'), G('E', 'E')); assert.equal(A.aLetra(G('E', 'E'), 'C#m'), 'E') })
t('Americano igual que chords.render, en los 14 tonos mayores y 12 acordes de cada uno', () => {
  const nombres = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
  for (const k of MAYORES) for (const raiz of nombres) for (const cal of ['', 'm', '7', 'maj7', 'm7b5', 'sus4']) {
    const letra = C.transpose(raiz + cal, 0, k), a = G(letra, k)
    assert.ok(a, letra + ' en ' + k); assert.equal(A.aLetra(a, k), letra, 'ida y vuelta ' + letra + ' en ' + k)
    assert.equal(SOLO(a, k, 'american'), C.render(letra, k, 'american'))
    assert.equal(SOLO(a, k, 'number'), C.render(letra, k, 'number'), letra + ' en ' + k) } })
t('el tritono se guarda como b5 (igual que chords.ts), en cualquier tono', () => {
  assert.deepEqual(G('F#', 'C'), { g: 5, alt: 'b', cal: '' }); assert.equal(SOLO(G('F#', 'C'), 'C', 'number'), 'b5'); assert.equal(C.render('F#', 'C', 'number'), 'b5'); assert.equal(A.aLetra({ g: 5, alt: 'b', cal: '' }, 'D'), 'G#'); assert.equal(A.aLetra({ g: 5, alt: 'b', cal: '' }, 'F'), 'B') })

console.log('alteraciones, bajos y calidades')
t('bII, #IV, bVII y el resto de los acordes fuera de la escala', () => {
  assert.deepEqual(G('Db', 'C'), { g: 2, alt: 'b', cal: '' }); assert.deepEqual(G('Bb', 'C'), { g: 7, alt: 'b', cal: '' }); assert.deepEqual(G('Eb', 'C'), { g: 3, alt: 'b', cal: '' })
  assert.deepEqual(G('Ab', 'C'), { g: 6, alt: 'b', cal: '' }); assert.equal(SOLO(G('Bb', 'C'), 'C', 'number'), 'b7'); assert.equal(SOLO(G('Dbmaj7', 'C'), 'C', 'number'), 'b2(maj7)') })
t('los mismos grados escritos en otro tono: transponer es solo escribirlos de nuevo', () => {
  const a = G('Bb', 'C'); assert.equal(A.aLetra(a, 'D'), 'C'); assert.equal(A.aLetra(a, 'G'), 'F'); assert.equal(A.aLetra(a, 'F'), 'Eb'); assert.equal(A.aLetra(a, 'E'), 'D')
  for (const [raw, k, hacia, esperado] of [['A/C#', 'A', 'B', 'B/D#'], ['F#m7', 'F#', 'G', 'Gm7'], ['Dsus2', 'D', 'G', 'Gsus2']]) assert.equal(A.aLetra(G(raw, k), hacia), esperado, raw) })
t('bajos: C/E, A/C# y bajos alterados', () => {
  assert.deepEqual(G('C/E', 'C'), { g: 1, cal: '', bajo: { g: 3 } }); assert.deepEqual(G('G/Bb', 'C'), { g: 5, cal: '', bajo: { g: 7, alt: 'b' } })
  assert.equal(A.aLetra(G('C/E', 'C'), 'D'), 'D/F#'); assert.equal(A.aLetra(G('C/E', 'C'), 'Bb'), 'Bb/D'); assert.equal(SOLO(G('G/Bb', 'C'), 'C', 'number'), '5/b7') })
t('calidades libres («Otro…»): se guardan como se escribieron', () => {
  for (const cal of ['m7b5', 'add9', '7sus4', 'maj9', 'dim7', '6', 'm(add9)', 'aug', '+', '°7']) { const a = G('A' + cal, 'A'); assert.ok(a, cal); assert.equal(a.cal, cal); assert.equal(A.aLetra(a, 'A'), 'A' + cal) } })
t('enarmónicos poco comunes (E#, Cb, B#, Fb) se leen en vez de perderse', () => {
  assert.equal(A.aLetra(G('E#', 'C'), 'C'), 'F'); assert.equal(A.aLetra(G('Cb', 'C'), 'C'), 'B'); assert.equal(A.aLetra(G('B#m', 'C'), 'C'), 'Cm') })

console.log('12 tonos: sostenidos o bemoles según el tono')
t('la tónica sale escrita como el tono (G, F#, Gb, Bb, Eb, Ab…) y la escala diatónica en cada tono mayor', () => {
  for (const k of MAYORES) assert.equal(A.aLetra({ g: 1, cal: '' }, k), k, k)
  assert.deepEqual(A.paleta('G').map(p => p.letra), ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim']); assert.deepEqual(A.paleta('Bb').map(p => p.letra), ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim'])
  assert.deepEqual(A.paleta('F#').map(p => p.letra), ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'Fdim']) })
t('tono menor: paleta del relativo mayor y el acorde del propio tono marcado', () => {
  assert.deepEqual(A.paleta('C#m').map(p => p.letra), ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim']); assert.deepEqual(A.paleta('C#m').filter(p => p.principal).map(p => p.letra), ['C#m'])
  assert.deepEqual(A.paleta('Dm').map(p => p.letra), ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim']); assert.deepEqual(A.paleta('Abm').filter(p => p.principal).map(p => p.letra), ['Abm']); assert.deepEqual(A.paleta('G').filter(p => p.principal).map(p => p.letra), ['G']) })
t('paleta de tono inválido: vacía', () => { assert.deepEqual(A.paleta('Sol'), []); assert.equal(A.aLetra({ g: 1, cal: '' }, 'Sol'), '') })

console.log('lo que no es acorde se queda tal cual')
t('N.C., x2, «Amen», 6/9 y texto vacío no se convierten ni se pierden', () => {
  for (const x of ['N.C.', 'x2', 'Amen', '%', '|', '', 'H', 'A/H', '6/9']) assert.equal(G(x, 'C'), null, x)
  const c = A.convertirLinea({ kind: 'lyric', segments: [{ chord: 'N.C.', text: 'Silencio ' }, { chord: 'C', text: 'Santo' }, { text: ' fin' }] }, 'C')
  assert.deepEqual(c.noConvertidos, ['N.C.']); assert.deepEqual(c.resultado.segments, [{ text: 'Silencio ', literal: 'N.C.' }, { text: 'Santo', acorde: { g: 1, cal: '' } }, { text: ' fin' }]) })
t('tono inválido: nada se convierte', () => { assert.equal(G('C', 'Sol'), null); assert.equal(G('C', ''), null) })

console.log('líneas: convertir, deshacer y leer los dos formatos')
const LETRA = { kind: 'lyric', lang: 'es', segments: [{ text: 'Cuando ' }, { chord: 'C#m', text: 'veo tu ' }, { chord: 'B/D#', text: 'gloria ' }, { chord: 'A9', text: 'Señor' }] }
const BARRAS = { kind: 'bars', bars: 'C#m / B/D# / | E / F#m / ||' }
t('convertir y volver da exactamente lo mismo (letra y compases)', () => {
  for (const l of [LETRA, BARRAS]) { const c = A.convertirLinea(l, 'E'); assert.deepEqual(c.noConvertidos, []); assert.deepEqual(A.lineaAFormato1(c.resultado, 'E'), l) } })
t('la línea convertida guarda grados y el orden de los segmentos; no guarda letras', () => {
  const c = A.convertirLinea(LETRA, 'E').resultado
  assert.deepEqual(c.segments.map(s => s.acorde && A.mostrarAcorde(s.acorde, 'E', 'number')), [undefined, '6m', '5/7', '4(9)'])
  assert.ok(!JSON.stringify(c).includes('"chord"')); assert.equal(c.lang, 'es'); assert.deepEqual(c.segments.map(s => s.text), LETRA.segments.map(s => s.text)) })
t('leerLinea: formato 1 y formato 2 muestran lo mismo en los dos tonos y las dos notaciones', () => {
  for (const [l, tono] of [[LETRA, 'E'], [BARRAS, 'E'], [LETRA, 'C#m']]) for (const nt of ['american', 'number']) {
    const f2 = A.convertirLinea(l, tono).resultado; assert.deepEqual(A.leerLinea(f2, 2, tono, nt), A.leerLinea(l, 1, tono, nt), tono + ' ' + nt) } })
t('leerLinea en otro tono: el formato 2 se transporta solo; el 1 se muestra como está en Americano', () => {
  const f2 = A.convertirLinea(LETRA, 'E').resultado
  assert.deepEqual(A.leerLinea(f2, 2, 'G', 'american').segments.map(s => s.acorde), [undefined, 'Em', 'D/F♯', 'C9'])
  assert.equal(A.leerLinea(f2, 2, 'G', 'number').segments[1].acorde, '6m'); assert.equal(A.leerLinea(BARRAS, 1, 'E', 'american').bars, 'C♯m / B/D♯ / | E / F♯m / ||') })
t('compases: separadores («/», «|», «||», «%», «x2») quedan como texto y no se reportan', () => {
  const c = A.convertirLinea({ kind: 'bars', bars: '| G / D | % x2 N.C. ||' }, 'G'); assert.deepEqual(c.noConvertidos, []); assert.ok(c.resultado.items.filter(i => 'texto' in i).length >= 5)
  assert.equal(A.lineaAFormato1(c.resultado, 'G').bars, '| G / D | % x2 N.C. ||') })
t('acorde que empieza con A–G pero no se entiende en compases se reporta (se conserva como texto)', () => { const c = A.convertirLinea({ kind: 'bars', bars: 'C Amen G' }, 'C'); assert.deepEqual(c.noConvertidos, ['Amen']); assert.equal(A.lineaAFormato1(c.resultado, 'C').bars, 'C Amen G') })
t('convertirVariante: lista, o null si lines no es una lista; sin acordes no cambia el texto', () => {
  assert.equal(A.convertirVariante({}, 'C'), null); assert.equal(A.convertirVariante(null, 'C'), null)
  const solo = [{ kind: 'lyric', segments: [{ text: 'Solo letra' }] }]; const r = A.convertirVariante(solo, 'C'); assert.deepEqual(r.resultado, solo); assert.deepEqual(r.noConvertidos, [])
  const r2 = A.convertirVariante([LETRA, BARRAS], 'E'); assert.equal(r2.resultado.length, 2); assert.deepEqual(r2.noConvertidos, []) })
t('lang opcional: no aparece si la línea no lo tenía', () => { const c = A.convertirLinea({ kind: 'lyric', segments: [{ text: 'a' }] }, 'C').resultado; assert.ok(!('lang' in c)) })

console.log('chords.ts: solo se agregaron dos export')
t('chords.ts no cambió su lógica: las funciones de siempre y los dos export nuevos', () => {
  const src = fs.readFileSync(path.join(RAIZ, 'lib/chords.ts'), 'utf8')
  assert.match(src, /^export function indexOf\(/m); assert.match(src, /^export function spell\(/m)
  assert.equal(C.transpose('A/C#', 2, 'B'), 'B/D#'); assert.equal(C.transpose('Bb', 2, 'C'), 'C'); assert.equal(C.render('A/C#', 'A', 'latin'), 'La/Do#') })
console.log(`\n${n} comprobaciones OK`)
