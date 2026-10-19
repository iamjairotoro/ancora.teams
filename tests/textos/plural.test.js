// Plurales con conteo (commit «textos y errores», parte 1): el helper con 0, 1 y N, y que en los archivos de interfaz no queden «(s)» / «(es)» ni un número seguido de un
// sustantivo en plural escrito a mano. Correr: `node tests/textos/plural.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('../portal/_banco')
const path = require('path')
const { plural, contar } = require(resolver(path.join(RAIZ, 'lib/textos/plural')))
const { archivosDeInterfaz, lineas } = require('./_fuentes')

const NOMBRES = 'cosas|items|ítems|integrantes|personas|posiciones|servicios|canciones|equipos|convocados|confirmados|pendientes|mensajes|días|veces|invitaciones|ensayos|bloques|archivos|adjuntos|notas|filas|horas|minutos|semanas|meses|vacantes|correos|administradores|bloqueos'
// Sitios que escriben «número + plural» a mano y están bien porque el número nunca es 1 (o la palabra no varía). Cada uno dice por qué.
const PERMITIDOS = [
  ['app/home/page.tsx', 'Hace ${days} días', 'days ≥ 2: el 0 y el 1 ya salieron como «Hoy» y «Ayer»'],
  ['app/admin/page.tsx', 'Hace ${days} días', 'days ≥ 2: el 0 y el 1 ya salieron como «Hoy» y «Ayer»'],
  ['lib/relativeTime.ts', 'Hace ${days} días', 'days ≥ 2: el 0 y el 1 ya salieron antes'],
  ['app/home/page.tsx', 'en ${days} días', 'days ≥ 2'],
  ['app/portal/_components/servicios/Servicios.tsx', '{nota.n} equipos', 'n ≥ 2: la nota solo existe cuando varios equipos convocan'],
  ['app/portal/_components/inicio/Inicio.tsx', '${g.entradas.length} equipos', 'varias entradas: ≥ 2'],
  ['components/persona/AccessLinkControl.tsx', '{d} días', 'opciones fijas de 7, 30 y 90 días'],
  ['components/AdminServiceView.tsx', '/{colAssigned} confirmados', 'forma de fracción «X/N confirmados»: el plural es el del total'],
  ['app/portal/_components/convocatorias/TarjetaConvocatoria.tsx', 'posiciones.length > 1', 'solo se escribe cuando son más de una posición'],
  ['components/home/HomeMovil.tsx', 'Ver las ${', 'el botón solo existe con más de 3 personas'],
]

correr(async () => {
  console.log('el helper')
  await prueba('plural(): solo el 1 va en singular; el 0 y los demás, en plural', async () => {
    assert.equal(plural(1, 'cosa', 'cosas'), 'cosa'); assert.equal(plural(0, 'cosa', 'cosas'), 'cosas'); assert.equal(plural(2, 'cosa', 'cosas'), 'cosas'); assert.equal(plural(11, 'cosa', 'cosas'), 'cosas') })
  await prueba('contar(): el número con su palabra en 0, 1 y N', async () => {
    assert.deepEqual([0, 1, 2, 7].map(n => contar(n, 'cosa', 'cosas')), ['0 cosas', '1 cosa', '2 cosas', '7 cosas'])
    assert.deepEqual([0, 1, 5].map(n => contar(n, 'ítem', 'ítems')), ['0 ítems', '1 ítem', '5 ítems'])
    assert.deepEqual([0, 1, 3].map(n => plural(n, 'convocado', 'convocados')), ['convocados', 'convocado', 'convocados']) })

  console.log('los archivos de interfaz')
  const archivos = archivosDeInterfaz()
  await prueba('ningún texto lleva «(s)», «(es)», «(as)» ni «(os)» para esquivar el plural', async () => {
    const malos = []
    const dentroDeTexto = (l, idx) => { const antes = l.slice(0, idx); for (const q of ["'", '"', '`']) if ((antes.split(q).length - 1) % 2 === 1) return true; const g = antes.lastIndexOf('>'); return g > 0 && antes[g - 1] !== '=' && !antes.slice(g).includes('{') && !antes.slice(g).includes('(') }
    for (const f of archivos) lineas(f).forEach((l, i) => { for (const m of l.matchAll(/(?<![A-Za-zÁ-úñ])[a-záéíóúñ]+\((s|es|as|os)\)/g)) if (dentroDeTexto(l, m.index)) malos.push(`${f}:${i + 1}  ${l.trim().slice(0, 110)}`) })
    assert.deepEqual(malos, [], 'usa plural()/contar() de lib/textos/plural.ts:\n' + malos.join('\n')) })
  await prueba('ningún número seguido de un sustantivo en plural escrito a mano (salvo los permitidos, que explican por qué)', async () => {
    const re = new RegExp('(\\{[^{}]+\\}|\\$\\{[^{}]+\\})\\s*(' + NOMBRES + ')(?![\\wáéíóúñ=])', 'i')
    const malos = [], usados = new Set()
    for (const f of archivos) lineas(f).forEach((l, i) => {
      if (!re.test(l) || /plural\(|contar\(/.test(l) || /(===|!==|==|!=)\s*1\s*\?/.test(l)) return      // ya usan un ternario sobre el mismo número
      const ok = PERMITIDOS.findIndex(([pf, frag]) => pf === f && l.includes(frag))
      if (ok >= 0) { usados.add(ok); return }
      malos.push(`${f}:${i + 1}  ${l.trim().slice(0, 120)}`) })
    assert.deepEqual(malos, [], 'pasa el número por plural()/contar() o, si nunca vale 1, agrégalo a PERMITIDOS con el motivo:\n' + malos.join('\n'))
    const sobran = PERMITIDOS.filter((_, i) => !usados.has(i)).map(p => p[0] + ' · ' + p[1])
    assert.deepEqual(sobran, [], 'entradas de PERMITIDOS que ya no existen en el código (bórralas):\n' + sobran.join('\n')) })
  terminar()
})
