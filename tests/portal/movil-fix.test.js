// Fase 2a-fix: (1) Canciones no desborda en teléfono — la cabecera de la lista no puede sumar más que el ancho disponible, y sus espaciadores se ocultan con los mismos cortes que sus columnas;
// (2) la URL de /admin sigue a la pestaña sin perder la carrera contra ?person=; (3) el contenido de /admin no ensancha el documento en teléfono. Correr: `npm run test:portal`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const { urlConPestana } = require(resolver(path.join(RAIZ, 'lib/admin/urlPestana')))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const base = 'http://x.test/admin'

correr(async () => {
  console.log('URL de /admin')
  await prueba('cambiar de pestaña pone ?tab= y conserva lo demás; si ya está igual no hace nada', async () => {
    assert.equal(urlConPestana(base + '?tab=setlist', 'canciones'), '/admin?tab=canciones'); assert.equal(urlConPestana(base, 'chats'), '/admin?tab=chats')
    assert.equal(urlConPestana(base + '?tab=canciones&x=1#a', 'chats'), '/admin?tab=chats&x=1#a'); assert.equal(urlConPestana(base + '?tab=chats', 'chats'), null) })
  await prueba('LA CARRERA: PersonasList escribe ?person= al montarse con la pestaña vieja; el cambio de pestaña, calculado sobre la URL ACTUAL, conserva person en Personas/Admins y lo quita fuera de ellas', async () => {
    const trasLaLista = base + '?tab=setlist&person=m1'      // lo que deja la escritura de PersonasList antes de que corra el efecto de la página
    assert.equal(urlConPestana(trasLaLista, 'personas'), '/admin?tab=personas&person=m1'); assert.equal(urlConPestana(trasLaLista, 'admins'), '/admin?tab=admins&person=m1')
    assert.equal(urlConPestana(base + '?tab=personas&person=m1', 'canciones'), '/admin?tab=canciones', 'al salir de Personas, person se va') })
  await prueba('/admin ya no cambia la pestaña con router.replace sobre `searchParams` (ahí se perdía la carrera)', async () => {
    const p = leer('app/admin/page.tsx'); const efecto = p.slice(p.indexOf('// La URL sigue a la pestaña'), p.indexOf('}, [tab])', p.indexOf('// La URL sigue a la pestaña')))
    assert.ok(/urlConPestana\(window\.location\.href, tab\)/.test(efecto) && /history\.replaceState\(null,/.test(efecto), 'estado null: con el estado de Next, su router ignora el cambio'); assert.ok(!/router\.replace/.test(efecto.replace(/\/\/.*$/gm, ''))) })

  console.log('Canciones en teléfono')
  const css = leer('app/songs.css'), lista = leer('components/canciones/SongList.tsx')
  const cabecera = lista.slice(lista.indexOf('<div className="anc-songHead">'), lista.indexOf('</div>', lista.indexOf('<div className="anc-songHead">')))
  const spans = [...cabecera.matchAll(/<span( className="([^"]+)")? style=\{\{ flex: (1|'0 0 (\d+)px')/g)].map(m => ({ clase: m[2] || null, base: m[4] ? +m[4] : 0 }))
  // cortes `@media (max-width:Npx){ .anc .a, .anc .b{ display:none; } }` → clase → N
  const corte = {}; for (const m of css.matchAll(/@media \(max-width:(\d+)px\)\{([^{}]*)\{\s*display:none;\s*\}\s*\}/g)) for (const c of m[2].matchAll(/\.anc \.([\w-]+)/g)) corte[c[1]] = +m[1]
  await prueba('los espaciadores de la cabecera se ocultan con los MISMOS cortes que sus columnas (última vez ↔ .anc-hLast, BPM ↔ .anc-hBpm)', async () => {
    assert.ok(corte['anc-lastPlayed'] && corte['anc-songBpm'], 'se leyeron los cortes de las columnas'); assert.equal(corte['anc-hLast'], corte['anc-lastPlayed']); assert.equal(corte['anc-hBpm'], corte['anc-songBpm'])
    assert.ok(spans.some(s => s.clase === 'anc-hLast' && s.base === 132) && spans.some(s => s.clase === 'anc-hBpm' && s.base === 62)) })
  await prueba('a 320, 360, 390, 414 y 600 px la cabecera cabe: columnas fijas visibles + huecos + relleno ≤ ancho disponible (página 16+16, panel 6+6)', async () => {
    assert.equal(spans.length, 6)
    for (const W of [320, 360, 390, 414, 600, 768]) {
      const visibles = spans.filter(s => !(s.clase && corte[s.clase] && W <= corte[s.clase])); const fijos = visibles.reduce((a, s) => a + s.base, 0), huecos = 14 * (visibles.length - 1), relleno = 20
      const disponible = W - 32 - 12; assert.ok(fijos + huecos + relleno <= disponible, `a ${W} px: ${fijos}+${huecos}+${relleno} = ${fijos + huecos + relleno} > ${disponible}`) } })

  console.log('Documento en teléfono')
  await prueba('el contenido de /admin se recorta (overflow-x: clip) dentro de su área en teléfono y no ensancha el documento', async () => {
    const a = leer('components/app.module.css'); const tel = a.slice(a.lastIndexOf('@media (max-width:768px){')); assert.ok(/\.page\{[^}]*overflow-x:clip/.test(tel)); assert.ok(!/html\s*,?[^{]*\{[^}]*overflow-x/.test(a), 'sin overflow-x global') })
  terminar()
})
