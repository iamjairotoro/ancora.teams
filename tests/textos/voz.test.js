// Voz de los textos (commit «textos y errores», parte 3): tuteo chileno neutro. En los archivos de interfaz no queda voseo («Revisá», «Intentá», «tenés»…), «acá» ni «click».
// Los comentarios no cuentan. Correr: `node tests/textos/voz.test.js`.
const { assert, prueba, terminar, correr } = require('../portal/_banco')
const { archivosDeInterfaz, lineas } = require('./_fuentes')

// Palabras que terminan en á, é o í y NO son voseo (futuros, adverbios, nombres…).
const NO_VOSEO = new Set(['está', 'será', 'estará', 'así', 'aquí', 'allí', 'ahí', 'sí', 'café', 'qué', 'té', 'sé', 'dé', 'bebé', 'allá', 'cuál', 'quién', 'mamá', 'papá', 'sofá', 'jamás', 'además', 'después', 'país', 'interés', 'maní', 'rubí', 'colibrí', 'ají', 'bisturí', 'hindú', 'manatí', 'tabú', 'pie', 'cliché', 'carné', 'purée', 'chimpancé', 'canapé', 'bulevar', 'ballet', 'buffet', 'comité', 'debut', 'esquí', 'iglú', 'mercé', 'moisés', 'ojalá', 'papí', 'poní', 'reí', 'rapé', 'tocayá', 'yo', 'mié'])
const VOSEO = [/(?<![\wáéíóúñ])([a-záéíóúñ]{2,}[áéí])(?![\wáéíóúñ])/gi, /(?<![\wáéíóúñ])(tenés|podés|querés|sabés|hacés|decís|sos|vos|vení|andá|fijate|mirá|acordate|asegurate)(?![\wáéíóúñ])/gi,
  /(?<![\wáéíóúñ])(cambiala|ajustalo|guardala|elegila|mandala|borrala|quitala|ponela|probala|dejala|usala|revisala|agregalo|agregala|crealos|crealo)(?![\wáéíóúñ])/gi]
const OTRAS = [[/(?<![\wáéíóúñ])acá(?![\wáéíóúñ])/gi, '«acá» (usa «aquí»)'], [/(?<![\wáéíóúñ.'"])clicks?(?![\wáéíóúñ('"])/gi, '«click» (usa «Selecciona» o «Toca»)']]

correr(async () => {
  const archivos = archivosDeInterfaz()
  const hallazgos = []
  for (const f of archivos) lineas(f).forEach((l, i) => {
    for (const re of VOSEO) for (const m of l.matchAll(re)) { const w = m[1]; if (re === VOSEO[0] && (NO_VOSEO.has(w.toLowerCase()) || /rá$/i.test(w))) continue; hallazgos.push(`${f}:${i + 1}  «${w}»  ${l.trim().slice(0, 90)}`) }
    for (const [re, que] of OTRAS) for (const m of l.matchAll(re)) hallazgos.push(`${f}:${i + 1}  ${que}  ${l.trim().slice(0, 90)}`) })
  console.log('voz de los textos')
  await prueba('ni voseo, ni «acá», ni «click» en archivos de interfaz (sin comentarios)', async () => { assert.deepEqual(hallazgos, [], 'pasa a tuteo:\n' + hallazgos.join('\n')) })
  await prueba('la prueba reconoce el voseo (para que no pase en vacío)', async () => {
    const t = s => VOSEO.some(re => { re.lastIndex = 0; const m = [...s.matchAll(re)].filter(x => !(re === VOSEO[0] && (NO_VOSEO.has(x[1].toLowerCase()) || /rá$/i.test(x[1])))); return m.length > 0 })
    for (const malo of ['Revisá tu conexión', 'intentá de nuevo', 'No tenés acceso', 'cambiala primero', 'elegí una plantilla']) assert.ok(t(malo), malo)
    for (const bueno of ['Revisa tu conexión', 'Intenta de nuevo', 'No tienes acceso', 'cámbiala primero', 'está aquí y será así', 'allí o allá']) assert.ok(!t(bueno), bueno) })
  terminar()
})
