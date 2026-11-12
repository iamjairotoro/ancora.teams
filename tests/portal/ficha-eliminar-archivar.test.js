// Ficha del administrador: «Archivar» y «Eliminar» ya NO salen a la lista antes de terminar. Cancelar la pregunta de «Eliminar» deja la ficha abierta y no borra nada; confirmar borra solo esa canción; «Archivar» solo escribe archived_at.
// Datos inventados; sin red. Correr: `node tests/portal/ficha-eliminar-archivar.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const p = leer('components/canciones/CancionesPanel.tsx')
const cuerpo = n => { const i = p.indexOf(`async function ${n}(`), j = p.indexOf('\n  }\n', i); return p.slice(i, j) }

correr(async () => {
  await prueba('eliminar: pregunta primero; si se cancela devuelve false SIN tocar la base; borra solo esa canción (por su id) y devuelve true solo si no hubo error', () => {
    const c = cuerpo('deleteSong')
    assert.match(c, /async function deleteSong\(id: string\): Promise<boolean>/)
    assert.match(c, /if \(!\(await confirmar\('¿Eliminar esta canción\? Esta acción no se puede deshacer\.', \{ accion: 'Eliminar', peligro: true \}\)\)\) return false/)
    assert.ok(c.indexOf('confirmar(') < c.indexOf(".delete()"), 'la pregunta va antes de borrar'); assert.equal((c.match(/\.delete\(\)/g) || []).length, 1)
    assert.match(c, /const \{ error \} = await supabase\.from\('songs'\)\.delete\(\)\.eq\('id', id\)/); assert.match(c, /return !error/) })

  await prueba('archivar: solo escribe archived_at de esa canción y devuelve true solo si no hubo error', () => {
    const c = cuerpo('archiveSong')
    assert.match(c, /async function archiveSong\(id: string\): Promise<boolean>/); assert.match(c, /const \{ error \} = await supabase\.from\('songs'\)\.update\(\{ archived_at: new Date\(\)\.toISOString\(\) \}\)\.eq\('id', id\)/)
    assert.equal((c.match(/\.update\(/g) || []).length, 1); assert.ok(!/publicada|nombre|letra/.test(c), 'solo archived_at'); assert.match(c, /return !error/) })

  await prueba('la ficha (menú de escritorio y hoja de teléfono): cierra el menú, ESPERA el resultado y vuelve a la lista solo si salió bien; ninguna llamada vuelve a la lista antes', () => {
    for (const [fn, n] of [['archiveSong', 'Archivar'], ['deleteSong', 'Eliminar']]) {
      const bien = `setShowDetailMenu(false);if(await ${fn}(selectedSong.id))setView('list')`; assert.equal((p.split(bien).length - 1), 2, `${n}: en el menú de escritorio y en la hoja de teléfono`)
      assert.ok(!new RegExp(`${fn}\\(selectedSong\\.id\\);`).test(p), `${n}: ninguna llamada sin esperar`) }
    assert.match(p, /onClick=\{async\(\)=>\{setShowDetailMenu\(false\);if\(await archiveSong\(selectedSong\.id\)\)setView\('list'\)\}\}>Archivar<\/button>/); assert.match(p, /onArchivar=\{async\(\)=>\{setShowDetailMenu\(false\);if\(await archiveSong\(selectedSong\.id\)\)setView\('list'\)\}\}/)
    assert.match(p, /onClick=\{async\(\)=>\{setShowDetailMenu\(false\);if\(await deleteSong\(selectedSong\.id\)\)setView\('list'\)\}\}>Eliminar<\/button>/); assert.match(p, /onEliminar=\{async\(\)=>\{setShowDetailMenu\(false\);if\(await deleteSong\(selectedSong\.id\)\)setView\('list'\)\}\}/) })

  await prueba('el menú de cada fila de la lista no cambia (no hay ficha a la que volver): sigue llamando a las mismas funciones', () => {
    assert.ok(p.includes('<button className="anc-rowMenuDanger" onClick={()=>archiveSong(s.id)}>Archivar</button>') && p.includes('<button className="anc-rowMenuDanger" onClick={()=>deleteSong(s.id)}>Eliminar</button>')) })
  terminar()
})
