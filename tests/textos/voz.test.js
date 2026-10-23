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
  await prueba('«click» y «Toca» en pantallas que se usan con mouse: «Elige un día…», «Elige un equipo…», «Elige una carátula…» (no «Selecciona» ni «Toca»)', async () => {
    const fs = require('fs'), path = require('path'), { RAIZ } = require('./_fuentes')
    const f = r => fs.readFileSync(path.join(RAIZ, r), 'utf8')
    const dia = f('components/AvailabilityPanel.tsx'), eq = f('components/TeamsAdminPanel.tsx'), car = f('components/canciones/CancionesPanel.tsx')
    assert.ok(dia.includes('Elige un día para ver quién no está disponible')); assert.ok(!/(Selecciona|Toca) un día para ver quién no está disponible/.test(dia))
    assert.equal((eq.match(/Estructura organizacional\. Elige un equipo para ver sus posiciones e integrantes\./g) || []).length, 3); assert.ok(!/(Selecciona|Toca|click|clic) (en )?un equipo para ver/.test(eq))
    assert.ok(car.includes('Elige una carátula (máx. 3 MB)')); assert.ok(!/(Selecciona|Toca) (para subir )?(una )?carátula/.test(car)) })
  await prueba('ningún «Toca» sale de la única excepción: la instrucción de iPhone (Perfil, solo iOS); «se toca» (= se modifica) no cuenta', async () => {
    const PERMITIDOS = [['app/portal/_components/perfil/Perfil.tsx', 'esIOS']]
    const malos = []
    for (const f of archivos) lineas(f).forEach((l, i) => { for (const m of l.matchAll(/(?<![\wáéíóúñ])(Toca|toca|Tocá|Tocar|tocar)(?![\wáéíóúñ])/g)) {
      if (/\b(no|se) (se )?toca\b/.test(l.slice(Math.max(0, m.index - 6), m.index + 5))) continue
      if (PERMITIDOS.some(([pf, frag]) => pf === f && l.includes(frag))) continue
      malos.push(`${f}:${i + 1}  ${l.trim().slice(0, 100)}`) } })
    assert.deepEqual(malos, [], 'redacta sin verbo táctil (o agrégalo a PERMITIDOS si es solo de teléfono):\n' + malos.join('\n'))
    const fs = require('fs'), path = require('path'), { RAIZ } = require('./_fuentes'), f = r => fs.readFileSync(path.join(RAIZ, r), 'utf8')
    assert.ok(f('app/portal/_components/perfil/Perfil.tsx').includes('toca <b>Compartir</b>'), 'la excepción de iPhone sigue en su sitio')
    assert.ok(f('app/portal/_components/canciones/Canciones.tsx').includes('Marca el corazón de una canción')); assert.ok(f('app/portal/_components/chats/ListaChats.tsx').includes("'Chatea con el equipo de este día'") && f('app/portal/_components/chats/ListaChats.tsx').includes("'Escríbele'")); assert.ok(f('app/portal/_components/disponibilidad/Disponibilidad.tsx').includes('Elige un día para bloquearlo.')) })
  terminar()
})
