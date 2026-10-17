// Lógica pura de la pantalla Servicio (punto 54, commit 5): la nómina que viaja al portal (confirmó / sin confirmar, sin quién declinó, vacantes), su agrupación por equipo y sección, «Hoy» / «Mañana» en
// America/Santiago y la URL del servicio. Sin base ni servidor. Correr: `npm run test:portal`.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs'), Module = require('module')
const RAIZ = path.resolve(__dirname, '..', '..'), ts = require(path.join(RAIZ, 'node_modules', 'typescript'))
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022' } }).outputText, file)
const origResolve = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { return req.startsWith('@/') ? origResolve.call(this, path.join(RAIZ, req.slice(2) + '.ts'), ...r) : origResolve.call(this, req, ...r) }
const { armarEquipoDelServicio, agruparEquipo } = require(path.join(RAIZ, 'lib/portal/equipoServicio.ts'))
const { hoyEnSantiago, diasHasta, textoRelativo } = require(path.join(RAIZ, 'lib/portal/fechas.ts'))
const { urlServicio } = require(path.join(RAIZ, 'lib/portal/urlServicio.ts'))

let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }

// Alabanza (cobalto): sección Voces (Voz 1, Voz 2) y Banda (Bajo, Batería); Producción: Sonido (sin sección)
const eqA = { name: 'Alabanza', color: 'cobalto' }, eqP = { name: 'Producción', color: 'rosa' }
const V = { name: 'Voces', sort_order: 1 }, BA = { name: 'Banda', sort_order: 2 }
const POS = [
  { id: 'p-voz1', name: 'Voz 1', team_id: 'A', sort_order: 1, section: V, teams: eqA }, { id: 'p-voz2', name: 'Voz 2', team_id: 'A', sort_order: 2, section: V, teams: eqA },
  { id: 'p-bajo', name: 'Bajo', team_id: 'A', sort_order: 3, section: BA, teams: eqA }, { id: 'p-bat', name: 'Batería', team_id: 'A', sort_order: 4, section: BA, teams: eqA },
  { id: 'p-son', name: 'Sonido', team_id: 'P', sort_order: 1, section: null, teams: eqP }]
const fila = (m, pos, nom, ape = 'X') => ({ member_id: m, team_position_id: pos.id, posicion: null, member: { nombre: nom, apellido: ape, avatar_url: m === 'ana' ? 'http://foto' : null }, team_position: { name: pos.name, team_id: pos.team_id, sort_order: pos.sort_order, section: pos.section, teams: pos.teams } })
const P = Object.fromEntries(POS.map(p => [p.id, p]))
const inv = (m, team, status, extra = {}) => ({ member_id: m, team_id: team, status, ...extra })

console.log('la nómina que viaja')
const filas = [fila('ana', P['p-voz2'], 'Ana'), fila('ana', P['p-bajo'], 'Ana'), fila('beto', P['p-voz1'], 'Beto'), fila('cami', P['p-bat'], 'Cami'), fila('dani', P['p-son'], 'Dani')]
t('confirmó / sin confirmar; quien declinó no aparece y su posición pasa a faltar; declinar por conflicto igual', () => {
  const r = armarEquipoDelServicio({ filas, posiciones: POS, cupos: [], invitaciones: [inv('ana', 'A', 'confirmado'), inv('beto', 'A', 'pendiente'), inv('cami', 'A', 'declinado'), inv('dani', 'P', 'declinado', { declined_reason: 'conflict' })] })
  const quien = r.banda.map(b => `${b.member.nombre}:${b.posicion}:${b.estado}`).sort()
  assert.deepEqual(quien, ['Ana:Bajo:confirmo', 'Ana:Voz 2:confirmo', 'Beto:Voz 1:sin-confirmar'])
  assert.ok(!JSON.stringify(r).includes('declin'), 'ni el texto «declinado» ni «declined» viajan')
  assert.deepEqual(r.vacantes.map(v => `${v.teamName}:${v.posicion}`).sort(), ['Alabanza:Batería', 'Producción:Sonido'], 'la posición de quien declinó vuelve a faltar')
  assert.equal(r.banda[0].member.avatar_url, 'http://foto'); assert.deepEqual([r.banda[0].seccion, r.banda[0].teamName, r.banda[0].teamColor], ['Voces', 'Alabanza', 'cobalto']) })
t('sin convocatoria, o con el rol cambiado, cuenta como «sin confirmar»; los cupos pedidos mandan; las posiciones de equipos que no están en el servicio no faltan', () => {
  const r = armarEquipoDelServicio({ filas: filas.slice(0, 3), posiciones: [...POS, { id: 'x', name: 'Luces', team_id: 'Z', sort_order: 1, section: null, teams: { name: 'Otro', color: null } }], cupos: [{ team_position_id: 'p-voz1', slots_needed: 2 }],
    invitaciones: [inv('ana', 'A', 'confirmado', { needs_reassignment_confirm: true })] })
  assert.deepEqual(r.banda.map(b => b.estado), ['sin-confirmar', 'sin-confirmar', 'sin-confirmar'])
  assert.deepEqual(r.vacantes.map(v => v.posicion).sort(), ['Batería', 'Voz 1'], 'Voz 1 pide 2 cupos y hay 1; Luces es de otro equipo; Sonido no tiene a nadie en este servicio (su equipo no está)') })
t('un servicio con la persona sin posición en un equipo archivado o fila heredada (sin id) no rompe', () => {
  const r = armarEquipoDelServicio({ filas: [{ member_id: 'ana', posicion: 'Guitarra vieja', member: { nombre: 'Ana' }, team_position: null }], posiciones: [], cupos: [], invitaciones: [] })
  assert.deepEqual([r.banda[0].posicion, r.banda[0].teamId, r.banda[0].estado, r.banda[0].seccionOrden], ['Guitarra vieja', null, 'sin-confirmar', 9999]); assert.equal(r.vacantes.length, 0) })

console.log('agrupar por equipo y sección')
const rA = armarEquipoDelServicio({ filas, posiciones: POS, cupos: [], invitaciones: [inv('ana', 'A', 'confirmado'), inv('beto', 'A', 'confirmado'), inv('cami', 'A', 'pendiente'), inv('dani', 'P', 'pendiente')] })
t('equipos por nombre, secciones por orden, una fila por persona con todas sus posiciones, y «Tú»', () => {
  const g = agruparEquipo(rA.banda, rA.vacantes, 'ana')
  assert.deepEqual(g.map(e => e.team.name), ['Alabanza', 'Producción'])
  const al = g[0]; assert.deepEqual(al.grupos.map(x => x.titulo), ['Voces', 'Banda'])
  const voces = al.grupos[0]; assert.deepEqual(voces.filas.map(f => `${f.nombre}|${f.posiciones}|${f.esYo}`), ['Beto X|Voz 1|false', 'Ana X|Voz 2|true'])
  const banda = al.grupos[1]; assert.deepEqual(banda.filas.map(f => f.tipo === 'persona' ? `${f.nombre}|${f.posiciones}` : 'vacante'), ['Ana X|Bajo', 'Cami X|Batería'])
  assert.equal(g[1].grupos[0].titulo, null, 'un equipo sin secciones no pone título') })
t('el grupo dice la posición debajo del nombre solo si mezcla posiciones; una persona con dos posiciones sale en una sola fila', () => {
  const g = agruparEquipo(rA.banda, rA.vacantes, 'ana')
  assert.equal(g[0].grupos[0].mezcla, true, 'Voz 1 y Voz 2'); assert.equal(g[1].grupos[0].mezcla, false, 'Sonido solo')
  const rr = armarEquipoDelServicio({ filas: [fila('ana', P['p-voz1'], 'Ana'), fila('ana', P['p-voz2'], 'Ana')], posiciones: POS, cupos: [], invitaciones: [inv('ana', 'A', 'confirmado')] })
  const gg = agruparEquipo(rr.banda, [], 'ana'); assert.equal(gg[0].grupos[0].filas.length, 1); assert.deepEqual(gg[0].grupos[0].filas[0].posiciones, ['Voz 1', 'Voz 2']) })
t('las vacantes van al final de su sección, sin número, y un equipo sin gente que confirmó igual aparece con sus vacantes', () => {
  const g = agruparEquipo(rA.banda, rA.vacantes, 'ana')
  assert.deepEqual(g[0].grupos[0].filas.map(f => f.tipo), ['persona', 'persona'], 'las posiciones de Voces están cubiertas')
  const r2 = armarEquipoDelServicio({ filas: [fila('cami', P['p-bat'], 'Cami')], posiciones: POS, cupos: [], invitaciones: [inv('cami', 'A', 'declinado')] })
  const g2 = agruparEquipo(r2.banda, r2.vacantes, 'ana'); assert.deepEqual(g2.map(e => e.team.name), ['Alabanza']); assert.deepEqual(g2[0].grupos.flatMap(x => x.filas).map(f => f.tipo + ':' + (f.posicion || '')).sort(), ['vacante:Bajo', 'vacante:Batería', 'vacante:Voz 1', 'vacante:Voz 2'])
  assert.ok(!JSON.stringify(g2).includes('Cami'), 'quien declinó no queda en ninguna parte') })
t('con secciones y posiciones sueltas, las sueltas van al final como «Otros»', () => {
  const sueltas = [{ ...P['p-son'], team_id: 'A', teams: eqA }]
  const r = armarEquipoDelServicio({ filas: [fila('ana', P['p-voz1'], 'Ana'), fila('dani', sueltas[0], 'Dani')], posiciones: [], cupos: [], invitaciones: [] })
  assert.deepEqual(agruparEquipo(r.banda, [], null)[0].grupos.map(x => x.titulo), ['Voces', 'Otros']) })

console.log('«Hoy», «Mañana» y la URL')
t('el día de Chile, no el del aparato: a las 23:30 del sábado en Santiago ya es sábado aunque en UTC sea domingo', () => {
  assert.equal(hoyEnSantiago(new Date('2026-10-18T02:30:00Z')), '2026-10-17'); assert.equal(hoyEnSantiago(new Date('2026-01-10T02:30:00Z')), '2026-01-09'); assert.equal(hoyEnSantiago(new Date('2026-10-17T12:00:00Z')), '2026-10-17') })
t('días hasta una fecha y su texto; cruzando el cambio de hora no se corre un día', () => {
  assert.equal(diasHasta('2026-10-18', '2026-10-17'), 1); assert.equal(diasHasta('2026-10-17', '2026-10-17'), 0); assert.equal(diasHasta('2026-10-12', '2026-10-17'), -5)
  assert.equal(diasHasta('2026-09-08', '2026-09-05'), 3, 'Chile cambia la hora el primer sábado de septiembre'); assert.equal(diasHasta('2027-04-05', '2027-04-03'), 2)
  assert.deepEqual([0, 1, 5, -1, NaN].map(textoRelativo), ['Hoy', 'Mañana', 'En 5 días', null, null]) })
t('la URL del servicio, con y sin equipo, y codificada', () => {
  assert.equal(urlServicio('/portal', 's1', 'tA'), '/portal?servicio=s1&equipo=tA'); assert.equal(urlServicio('/portal/tok', 's1'), '/portal/tok?servicio=s1'); assert.equal(urlServicio('/portal', 'a b&c', null), '/portal?servicio=a+b%26c') })

console.log(`${n} comprobaciones OK`)
