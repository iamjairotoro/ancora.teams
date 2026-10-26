// El Equipo del servicio en teléfono (Portal-Equipo-A): Banda, Voces, Otros; sin vacantes en la vista del usuario (la administración las sigue viendo); tu equipo primero y abierto, los demás cerrados con «N personas»;
// quién rechazó nunca aparece; los conteos de confirmados no cambian; el escritorio queda como estaba. Sin base ni servidor. Correr: `npm run test:portal`.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs'), Module = require('module')
const RAIZ = path.resolve(__dirname, '..', '..'), ts = require(path.join(RAIZ, 'node_modules', 'typescript'))
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022' } }).outputText, file)
const origResolve = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { return req.startsWith('@/') ? origResolve.call(this, path.join(RAIZ, req.slice(2) + '.ts'), ...r) : origResolve.call(this, req, ...r) }
const { agruparEquipo, armarEquipoDelServicio } = require(path.join(RAIZ, 'lib/portal/equipoServicio.ts'))
const { vistaEquipoTelefono } = require(path.join(RAIZ, 'lib/portal/equipoTelefono.ts'))
const { personasDelEquipo, TEXTOS_EQUIPO_PORTAL } = require(path.join(RAIZ, 'lib/textos/equipoPortal.ts'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')

const b = (id, nombre, pos, sec, so, po, estado, team = ['tA', 'Alabanza']) => ({ member_id: id, member: { nombre, apellido: null, avatar_url: null }, posicion: pos, teamId: team[0], teamName: team[1], teamColor: 'rosa', seccion: sec, seccionOrden: so, posOrden: po, estado })
const vac = (pos, sec, so, po, team = ['tA', 'Alabanza']) => ({ teamId: team[0], teamName: team[1], teamColor: 'rosa', posicion: pos, seccion: sec, seccionOrden: so, posOrden: po })
// En los datos las Voces van ANTES que la Banda (sort_order 0 y 1), y Montaje se llama antes que Alabanza en orden alfabético inverso a propósito
const banda = [b('m1', 'Yo', 'Voz', 'Voces', 0, 0, 'confirmo'), b('m5', 'Manuel', 'Voz', 'Voces', 0, 1, 'sin-confirmar'), b('m7', 'Ana', 'Guitarra', 'Banda', 1, 0, 'confirmo'), b('m8', 'Jairo', 'Bass', 'Banda', 1, 1, 'confirmo'),
  b('m9', 'Luis', 'Cámara', 'Cámaras', 5, 0, 'confirmo', ['tM', 'Montaje']), b('m10', 'Eva', 'Luces', 'Cámaras', 5, 1, 'sin-confirmar', ['tM', 'Montaje']), b('m11', 'Otra', 'Sonido', 'Otros', 9, 0, 'confirmo')]
const vacantes = [vac('Keys', 'Banda', 1, 3), vac('Drums', 'Banda', 1, 4)]
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('el Equipo del servicio en teléfono')
const equipos = agruparEquipo(banda, vacantes, 'm1'), vista = vistaEquipoTelefono(equipos)

t('dentro de cada equipo: primero Banda, luego Voces, luego Otros (y lo demás entre Voces y Otros)', () => {
  const alabanza = vista.find(e => e.team.id === 'tA')
  assert.deepEqual(alabanza.grupos.map(g => g.titulo), ['Banda', 'Voces', 'Otros'])
  const ordenOriginal = equipos.find(e => e.team.id === 'tA').grupos.map(g => g.titulo); assert.deepEqual(ordenOriginal, ['Voces', 'Banda', 'Otros'], 'sin esta vista, las Voces irían primero')
  assert.deepEqual(vista.find(e => e.team.id === 'tM').grupos.map(g => g.titulo), ['Cámaras']) })
t('en la vista del usuario no hay posiciones sin nadie («Falta keys», «Falta drums»); la lógica de administración no se toca', () => {
  for (const e of vista) for (const g of e.grupos) for (const f of g.filas) assert.equal(f.tipo, 'persona')
  const conVacantes = equipos.find(e => e.team.id === 'tA').grupos.flatMap(g => g.filas).filter(f => f.tipo === 'vacante'); assert.equal(conVacantes.length, 2) })
t('un grupo que solo tenía vacantes desaparece (no queda un título «Banda» vacío)', () => {
  const v = vistaEquipoTelefono(agruparEquipo([b('m1', 'Yo', 'Voz', 'Voces', 0, 0, 'confirmo')], [vac('Keys', 'Banda', 1, 3)], 'm1'))
  assert.deepEqual(v[0].grupos.map(g => g.titulo), ['Voces']) })
t('tu equipo va primero y abierto; los demás, cerrados', () => {
  assert.equal(vista[0].team.id, 'tA'); assert.equal(vista[0].abierto, true); assert.equal(vista[0].esMio, true)
  assert.ok(vista.slice(1).every(e => !e.abierto && !e.esMio))
  const otro = vistaEquipoTelefono(agruparEquipo(banda, vacantes, 'm9')); assert.equal(otro[0].team.id, 'tM', 'si soy de Montaje, Montaje va primero'); assert.deepEqual(otro.map(e => e.abierto), [true, false]) })
t('quien está en dos equipos los ve ambos primero y abiertos', () => {
  const dos = [...banda, b('m1', 'Yo', 'Luces', 'Cámaras', 5, 2, 'confirmo', ['tM', 'Montaje'])]
  const v = vistaEquipoTelefono(agruparEquipo(dos, [], 'm1')); assert.deepEqual(v.map(e => [e.team.id, e.abierto]), [['tA', true], ['tM', true], ['tZ', false]].filter(x => x[0] !== 'tZ').concat(v.length > 2 ? [[v[2].team.id, false]] : [])) })
t('si no estoy en ninguno, se abre el primero', () => {
  const v = vistaEquipoTelefono(agruparEquipo(banda, vacantes, 'nadie')); assert.deepEqual(v.map(e => e.abierto), v.map((_, i) => i === 0)) })
t('«N personas» cuenta personas distintas, sin vacantes y con plural correcto', () => {
  assert.equal(vista.find(e => e.team.id === 'tM').personas, 2); assert.equal(personasDelEquipo(1), '1 persona'); assert.equal(personasDelEquipo(2), '2 personas'); assert.equal(personasDelEquipo(0), '0 personas')
  const dosPos = vistaEquipoTelefono(agruparEquipo([b('m1', 'Yo', 'Voz', 'Voces', 0, 0, 'confirmo'), b('m1', 'Yo', 'Guitarra', 'Banda', 1, 0, 'confirmo')], [], 'm1')); assert.equal(dosPos[0].personas, 1) })
t('los conteos de confirmados no cambian: el estado de cada persona llega intacto y no se cuenta nada aquí', () => {
  const todas = vista.flatMap(e => e.grupos.flatMap(g => g.filas)); const originales = equipos.flatMap(e => e.grupos.flatMap(g => g.filas)).filter(f => f.tipo === 'persona')
  assert.equal(todas.length, originales.length); assert.equal(todas.filter(f => f.estado === 'confirmo').length, originales.filter(f => f.estado === 'confirmo').length)
  assert.ok(!/confirmad[oa]s? de|porcentaje|%/.test(leer('app/portal/_components/servicio/EquipoServicioTelefono.tsx'))) })
t('quien rechazó nunca aparece: el armado del servidor lo deja fuera y su posición cuenta como vacante (que el teléfono no muestra)', () => {
  const r = armarEquipoDelServicio({ filas: [{ member_id: 'm5', team_position: { team_id: 'tA', name: 'Voz', teams: { name: 'Alabanza' }, section: { name: 'Voces', sort_order: 0 } }, member: { nombre: 'Manuel' } }], invitaciones: [{ member_id: 'm5', team_id: 'tA', status: 'declinado' }],
    posiciones: [{ id: 'p1', name: 'Voz', team_id: 'tA', section: { name: 'Voces', sort_order: 0 }, teams: { name: 'Alabanza' } }], cupos: [] })
  assert.equal(r.banda.length, 0); assert.equal(r.vacantes.length, 1); const v = vistaEquipoTelefono(agruparEquipo(r.banda, r.vacantes, 'm1')); assert.equal(v.flatMap(e => e.grupos).length, 0) })
t('«Tú»: el estado es «Confirmado» / «Sin confirmar» con palabra solo en tu fila; el rechazo no tiene texto en la pantalla', () => {
  const src = leer('app/portal/_components/servicio/EquipoServicioTelefono.tsx'); assert.ok(/f\.esYo && <span className=\{`\$\{ui\.estadoTxt\}/.test(src)); assert.ok(!/rechaz|declin|no puedo/i.test(src))
  assert.equal(TEXTOS_EQUIPO_PORTAL.confirmado, 'Confirmado'); assert.equal(TEXTOS_EQUIPO_PORTAL.tu, 'TÚ') })
t('detrás de la condición de teléfono: el escritorio sigue con la pantalla de siempre', () => {
  const src = leer('app/portal/_components/servicio/EquipoServicio.tsx'); assert.ok(/useTelefonoYa\(\)/.test(src) && /if \(telefono\) return <EquipoServicioTelefono/.test(src)); assert.ok(/Falta \{f\.posicion/.test(src)) })
console.log(`\n${n} comprobaciones OK`)
