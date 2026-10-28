// Checklist por posición (lógica pura): quién ve y marca qué, «Cambiar» de equipo, dos posiciones en el mismo equipo, posición que cambia después de confirmar, plantillas y textos. Correr: `node tests/portal/checklist-posiciones.test.js`
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const C = require(resolver(path.join(RAIZ, 'lib/checklist/posiciones'))), T = require(resolver(path.join(RAIZ, 'lib/textos/checklist')))

const ANA = 'ana', BETO = 'beto', CARLA = 'carla', TEAM_A = 'montaje', TEAM_B = 'alabanza'
const SON = { id: 'p-sonido', nombre: 'Sonido', orden: 1 }, PRO = { id: 'p-proy', nombre: 'Proyección', orden: 2 }, LUC = { id: 'p-luces', nombre: 'Luces', orden: 3 }
const POS = [SON, PRO, LUC]
const conv = (memberId, teamId, status, ids = null) => ({ memberId, teamId, status, confirmedPositionIds: ids })
const g = (id, positionId, titulo, orden = 1) => ({ id, positionId, titulo, orden })
const it = (id, positionId, groupId, texto, orden = 1, extra = {}) => ({ id, positionId, groupId, texto, checked: false, orden, ...extra })
const GRUPOS = [g('g1', SON.id, 'Antes del servicio', 1), g('g2', SON.id, 'Al terminar', 2), g('g3', PRO.id, 'Antes del servicio'), g('g4', LUC.id, 'Antes del servicio'), g('gg', null, 'Varios')]
const ITEMS = [it('i1', SON.id, 'g1', 'Sacar cosas', 1), it('i2', SON.id, 'g1', 'Probar micrófonos', 2, { checked: true, checkedBy: ANA, checkedAt: '2026-11-01T10:30:00Z' }), it('i3', SON.id, 'g2', 'Guardar cables'), it('i4', SON.id, 'g2', 'Apagar consola', 2),
  it('i5', PRO.id, 'g3', 'Encender proyector'), it('i6', PRO.id, 'g3', 'Probar letras', 2, { checked: true, checkedBy: BETO, checkedAt: '2026-11-01T10:40:00Z' }), it('i7', PRO.id, 'g3', 'Apagar proyector', 3),
  it('i8', LUC.id, 'g4', 'Encender luces'), it('i9', LUC.id, 'g4', 'Apagar luces', 2), it('i10', null, 'gg', 'Cerrar la bodega')]
const entrada = (nomina, convocatorias, extra = {}) => ({ teamId: TEAM_A, posiciones: POS, nomina, convocatorias, grupos: GRUPOS, items: ITEMS, ...extra })
const ids = v => v.posiciones.map(p => p.positionId)
const textos = v => v.posiciones.flatMap(p => p.grupos.flatMap(x => x.items.map(i => i.texto)))
// domingo normal: Ana en Sonido, Beto en Proyección (ambos confirmaron), Luces sin persona
const NOMINA = [{ memberId: ANA, positionId: SON.id }, { memberId: BETO, positionId: PRO.id }, { memberId: null, positionId: LUC.id }]
const CONVS = [conv(ANA, TEAM_A, 'confirmado', [SON.id]), conv(BETO, TEAM_A, 'confirmado', [PRO.id])]

correr(async () => {
  await prueba('el músico ve SOLO los ítems de su posición, con sus totales; no ve las demás ni «General»', async () => {
    const v = C.vistaDelMusico(ANA, entrada(NOMINA, CONVS)); assert.deepEqual(ids(v), [SON.id]); assert.deepEqual(textos(v), ['Sacar cosas', 'Probar micrófonos', 'Guardar cables', 'Apagar consola'])
    assert.equal(v.total, 4); assert.equal(v.listos, 1, '1 de 4 listos'); assert.deepEqual(v.posiciones[0].grupos.map(x => x.titulo), ['Antes del servicio', 'Al terminar'], 'los títulos se mantienen como grupos dentro de la posición')
    const b = C.vistaDelMusico(BETO, entrada(NOMINA, CONVS)); assert.deepEqual(ids(b), [PRO.id]); assert.ok(!textos(b).includes('Cerrar la bodega') && !textos(b).includes('Sacar cosas')) })
  await prueba('el líder ve TODO: todas las posiciones de la nómina con su estado, «General» y los totales del equipo', async () => {
    const v = C.vistaDelLider(entrada(NOMINA, CONVS)); assert.deepEqual(ids(v), [SON.id, PRO.id, LUC.id, null]); assert.deepEqual(v.posiciones.map(p => p.estado), ['confirmada', 'confirmada', 'sin-persona', 'general'])
    assert.equal(v.total, 10); assert.equal(v.listos, 2); assert.ok(textos(v).includes('Cerrar la bodega')) })
  await prueba('persona con DOS posiciones en el mismo equipo: ve ambos grupos de posición, con los totales sumados y sin las demás', async () => {
    const nomina = [{ memberId: ANA, positionId: SON.id }, { memberId: ANA, positionId: PRO.id }, { memberId: null, positionId: LUC.id }], convs = [conv(ANA, TEAM_A, 'confirmado', [SON.id, PRO.id])]
    const v = C.vistaDelMusico(ANA, entrada(nomina, convs)); assert.deepEqual(ids(v), [SON.id, PRO.id], 'ambas, en el orden de la nómina'); assert.equal(v.total, 7); assert.equal(v.listos, 2)
    assert.deepEqual(v.posiciones.map(p => p.nombre), ['Sonido', 'Proyección']); assert.ok(!textos(v).includes('Encender luces'))
    for (const item of ITEMS.filter(i => i.positionId === SON.id || i.positionId === PRO.id)) assert.ok(C.puedeMarcar({ rol: 'musico', memberId: ANA, teamId: TEAM_A, positionIdDelItem: item.positionId, nomina, convocatorias: convs }), item.texto)
    assert.ok(!C.puedeMarcar({ rol: 'musico', memberId: ANA, teamId: TEAM_A, positionIdDelItem: LUC.id, nomina, convocatorias: convs }), 'no puede marcar la tercera')
    const solo1 = C.vistaDelMusico(ANA, entrada(nomina, [conv(ANA, TEAM_A, 'confirmado', [SON.id])])); assert.deepEqual(ids(solo1), [SON.id], 'confirmó solo una: ve solo esa'); assert.equal(C.vistaDelLider(entrada(nomina, [conv(ANA, TEAM_A, 'confirmado', [SON.id])])).posiciones.find(p => p.positionId === PRO.id).estado, 'pendiente', 'la otra queda «Pendiente de confirmar» para el líder') })
  await prueba('«Cambiar» de equipo: ANTES ve el checklist del equipo A; DESPUÉS (A declinada por conflicto, B confirmada) deja de ver el de A y ve el de B', async () => {
    const POS_B = [{ id: 'p-voz', nombre: 'Voz principal', orden: 1 }], NOMINA_B = [{ memberId: ANA, positionId: 'p-voz' }]
    const GB = [g('gb', 'p-voz', 'Antes del servicio')], IB = [it('b1', 'p-voz', 'gb', 'Calentar la voz'), it('b2', 'p-voz', 'gb', 'Revisar el tono', 2)]
    const antes = [conv(ANA, TEAM_A, 'confirmado', [SON.id]), { ...conv(ANA, TEAM_B, 'declinado'), declinedReason: 'conflict' }]
    const despues = [{ ...conv(ANA, TEAM_A, 'declinado', null), declinedReason: 'conflict' }, conv(ANA, TEAM_B, 'confirmado', ['p-voz'])]
    const verA = cs => C.vistaDelMusico(ANA, entrada(NOMINA, cs)), verB = cs => C.vistaDelMusico(ANA, { teamId: TEAM_B, posiciones: POS_B, nomina: NOMINA_B, convocatorias: cs, grupos: GB, items: IB })
    assert.ok(C.puedeVerEquipo(ANA, TEAM_A, antes) && !C.puedeVerEquipo(ANA, TEAM_B, antes)); assert.deepEqual(ids(verA(antes)), [SON.id]); assert.deepEqual(verB(antes).posiciones, [], 'antes no ve el de B')
    assert.ok(!C.puedeVerEquipo(ANA, TEAM_A, despues) && C.puedeVerEquipo(ANA, TEAM_B, despues)); assert.deepEqual(verA(despues).posiciones, [], 'deja de ver el checklist del equipo que deja (aunque siga en la nómina de A)'); assert.equal(verA(despues).total, 0)
    assert.deepEqual(textos(verB(despues)), ['Calentar la voz', 'Revisar el tono'], 've el del otro equipo'); assert.ok(!C.puedeMarcar({ rol: 'musico', memberId: ANA, teamId: TEAM_A, positionIdDelItem: SON.id, nomina: NOMINA, convocatorias: despues }), 'ya no puede marcar en A')
    assert.ok(C.puedeMarcar({ rol: 'musico', memberId: ANA, teamId: TEAM_B, positionIdDelItem: 'p-voz', nomina: NOMINA_B, convocatorias: despues }))
    const lider = C.vistaDelLider(entrada(NOMINA, despues)); assert.equal(lider.posiciones.find(p => p.positionId === SON.id).estado, 'sin-persona', 'el líder de A ve la posición sin persona; los ítems y lo marcado siguen ahí'); assert.equal(lider.total, 10) })
  await prueba('convocada sin responder: el líder ve «pendiente» y los ítems solo el líder; declinada: la posición queda sin persona', async () => {
    const pend = [conv(ANA, TEAM_A, 'pendiente'), conv(BETO, TEAM_A, 'confirmado', [PRO.id])]
    assert.deepEqual(C.vistaDelMusico(ANA, entrada(NOMINA, pend)).posiciones, [], 'sin confirmar no ve nada'); assert.ok(!C.puedeMarcar({ rol: 'musico', memberId: ANA, teamId: TEAM_A, positionIdDelItem: SON.id, nomina: NOMINA, convocatorias: pend }))
    const l = C.vistaDelLider(entrada(NOMINA, pend)); const son = l.posiciones.find(p => p.positionId === SON.id); assert.equal(son.estado, 'pendiente'); assert.deepEqual(son.pendientes, [ANA]); assert.ok(son.grupos.some(x => x.items.length > 0), 'el líder sí ve sus ítems')
    const dec = C.vistaDelLider(entrada(NOMINA, [conv(ANA, TEAM_A, 'declinado'), conv(BETO, TEAM_A, 'confirmado', [PRO.id])])); assert.equal(dec.posiciones.find(p => p.positionId === SON.id).estado, 'sin-persona') })
  await prueba('posición sin persona (vacante): solo el líder, con el estado «sin-persona»; el músico de otra posición no la ve', async () => {
    const l = C.vistaDelLider(entrada(NOMINA, CONVS)); const luces = l.posiciones.find(p => p.positionId === LUC.id); assert.equal(luces.estado, 'sin-persona'); assert.equal(luces.total, 2); assert.equal(luces.listos, 0)
    for (const m of [ANA, BETO]) assert.ok(!ids(C.vistaDelMusico(m, entrada(NOMINA, CONVS))).includes(LUC.id)) })
  await prueba('posición que cambia DESPUÉS de confirmar: los ítems siguen a la posición, lo marcado se conserva (quién y cuándo) y la posición nueva queda pendiente', async () => {
    const reasignada = [{ memberId: ANA, positionId: LUC.id }, { memberId: BETO, positionId: PRO.id }, { memberId: null, positionId: SON.id }]   // Ana pasó de Sonido a Luces; su foto sigue diciendo Sonido
    const v = C.vistaDelMusico(ANA, entrada(reasignada, CONVS)); assert.deepEqual(ids(v), [], 'confirmó Sonido pero ya no la tiene; Luces aún no la confirma: no ve ítems de ninguna')
    const l = C.vistaDelLider(entrada(reasignada, CONVS)); const son = l.posiciones.find(p => p.positionId === SON.id), luc = l.posiciones.find(p => p.positionId === LUC.id)
    assert.equal(son.estado, 'sin-persona'); assert.deepEqual(luc.pendientes, [ANA]); assert.equal(luc.estado, 'pendiente')
    const marcado = son.grupos.flatMap(x => x.items).find(i => i.id === 'i2'); assert.equal(marcado.checked, true); assert.equal(marcado.checkedBy, ANA); assert.equal(marcado.checkedAt, '2026-11-01T10:30:00Z', 'lo ya marcado se conserva con quién y cuándo')
    const reconfirma = [conv(ANA, TEAM_A, 'confirmado', [LUC.id]), conv(BETO, TEAM_A, 'confirmado', [PRO.id])]; assert.deepEqual(ids(C.vistaDelMusico(ANA, entrada(reasignada, reconfirma))), [LUC.id], 'al reconfirmar ve los ítems de la posición nueva') })
  await prueba('convocatoria confirmada sin foto (heredada, null): cuenta con todas sus posiciones actuales del equipo', async () => {
    const v = C.vistaDelMusico(ANA, entrada(NOMINA, [conv(ANA, TEAM_A, 'confirmado', null)])); assert.deepEqual(ids(v), [SON.id]) })
  await prueba('quién puede marcar: el líder cualquier ítem (también «General»); el músico solo los de su posición, nunca «General»; marcar guarda quién y cuándo y desmarcar lo borra', async () => {
    const base = { teamId: TEAM_A, nomina: NOMINA, convocatorias: CONVS }
    assert.ok(C.puedeMarcar({ ...base, rol: 'lider', memberId: 'lider', positionIdDelItem: LUC.id })); assert.ok(C.puedeMarcar({ ...base, rol: 'lider', memberId: 'lider', positionIdDelItem: null }))
    assert.ok(C.puedeMarcar({ ...base, rol: 'musico', memberId: ANA, positionIdDelItem: SON.id })); assert.ok(!C.puedeMarcar({ ...base, rol: 'musico', memberId: ANA, positionIdDelItem: PRO.id }), 'ni la de otro'); assert.ok(!C.puedeMarcar({ ...base, rol: 'musico', memberId: ANA, positionIdDelItem: null }), 'ni «General»')
    assert.ok(!C.puedeMarcar({ ...base, rol: 'musico', memberId: CARLA, positionIdDelItem: SON.id }), 'quien no está en el equipo, nada')
    assert.deepEqual(C.registrarMarca(true, ANA, '2026-11-01T10:30:00Z'), { checked: true, checkedBy: ANA, checkedAt: '2026-11-01T10:30:00Z' }); assert.deepEqual(C.registrarMarca(false, ANA, 'x'), { checked: false, checkedBy: null, checkedAt: null }) })
  await prueba('un ítem de una posición que ya no está en el servicio no se pierde: el líder lo ve en «General»; el músico no', async () => {
    const extra = [...ITEMS, it('i11', 'p-archivada', null, 'Algo de una posición vieja')]; const l = C.vistaDelLider(entrada(NOMINA, CONVS, { items: extra }))
    assert.ok(l.posiciones.find(p => p.positionId === null).grupos.flatMap(x => x.items).some(i => i.texto === 'Algo de una posición vieja')); assert.ok(!textos(C.vistaDelMusico(ANA, entrada(NOMINA, CONVS, { items: extra }))).includes('Algo de una posición vieja')) })
  await prueba('plantillas: se guardan por POSICIÓN (sin marcas ni personas) y se aplican a quien tenga la posición ese domingo', async () => {
    const vista = C.vistaDelLider(entrada(NOMINA, CONVS)); const p = C.plantillaDesdeVista(vista)
    assert.equal(p.version, 2); assert.deepEqual(p.posiciones.map(x => x.positionId), [SON.id, PRO.id, LUC.id, null]); assert.ok(!JSON.stringify(p).includes(ANA) && !JSON.stringify(p).includes('checked'), 'sin personas ni marcas')
    assert.deepEqual(p.posiciones[0].grupos, [{ titulo: 'Antes del servicio', items: ['Sacar cosas', 'Probar micrófonos'] }, { titulo: 'Al terminar', items: ['Guardar cables', 'Apagar consola'] }])
    const a = C.aplicarPlantilla(p, POS); assert.deepEqual(a.fuera, []); assert.equal(a.aplicar.length, 4) })
  await prueba('plantilla con una posición que ese domingo NO existe: no se aplica y se informa cuál y cuántos ítems (no se pierde en silencio)', async () => {
    const p = C.plantillaDesdeVista(C.vistaDelLider(entrada(NOMINA, CONVS))); const sinLuces = [SON, PRO]; const a = C.aplicarPlantilla(p, sinLuces)
    assert.deepEqual(a.fuera, [{ nombre: 'Luces', items: 2 }]); assert.deepEqual(a.aplicar.map(x => x.positionId), [SON.id, PRO.id, null]); assert.ok(!a.aplicar.some(x => x.positionId === LUC.id))
    assert.equal(T.plantillaFuera(['Luces']), 'Esta posición no existe este domingo y no se aplicó: Luces.'); assert.equal(T.plantillaFuera(['Luces', 'Cámaras']), 'Estas posiciones no existen este domingo y no se aplicaron: Luces, Cámaras.') })
  await prueba('plantilla con la posición renombrada o con otro id: se empareja por nombre solo si es único; si hay dos con el mismo nombre, no se adivina', async () => {
    const p = { version: 2, posiciones: [{ positionId: 'id-viejo', nombre: ' sonido ', grupos: [{ titulo: null, items: ['A', 'B'] }] }] }
    assert.deepEqual(C.aplicarPlantilla(p, POS).aplicar.map(x => x.positionId), [SON.id], 'por nombre (sin mayúsculas ni tildes) y único')
    const dos = [SON, { id: 'p-sonido-2', nombre: 'Sonido', orden: 9 }]; const r = C.aplicarPlantilla(p, dos); assert.deepEqual(r.aplicar, []); assert.deepEqual(r.fuera, [{ nombre: ' sonido ', items: 2 }])
    const dosEntradas = { version: 2, posiciones: [{ positionId: SON.id, nombre: 'Sonido', grupos: [{ titulo: null, items: ['A'] }] }, { positionId: 'otro', nombre: 'Sonido', grupos: [{ titulo: null, items: ['B'] }] }] }
    const d = C.aplicarPlantilla(dosEntradas, POS); assert.equal(d.aplicar.length, 1); assert.deepEqual(d.fuera, [{ nombre: 'Sonido', items: 1 }], 'dos entradas a la misma posición: la segunda queda fuera') })
  await prueba('«empezar con el del domingo pasado» copia los ítems por posición SIN marcar', async () => {
    const pasada = C.vistaDelLider(entrada(NOMINA, CONVS)); const a = C.copiarDelDomingoPasado(pasada, POS)
    assert.equal(a.aplicar.flatMap(x => x.grupos.flatMap(gr => gr.items)).length, 10); assert.ok(!JSON.stringify(a).includes('checked'), 'solo textos: nada marcado'); assert.ok(a.aplicar.flatMap(x => x.grupos.flatMap(gr => gr.items)).includes('Probar micrófonos')) })
  await prueba('textos: la pantalla NO promete actualización en vivo; dice cuándo se actualiza (al abrir, al volver a la app y con el botón); tuteo', async () => {
    const todo = Object.values(T.TEXTOS_CHECKLIST).join(' ') + ' ' + [T.listosDe(1, 4), T.faltan(3), T.marcadoPor('Jairo', '10:30'), T.loMarcasteTu('10:30')].join(' ')
    assert.ok(!/al instante|en vivo|tiempo real|automáticamente/i.test(todo), 'ninguna promesa de «en vivo»'); assert.ok(/al abrir esta pantalla/.test(T.TEXTOS_CHECKLIST.actualizaNota) && /vuelves a la app/.test(T.TEXTOS_CHECKLIST.actualizaNota) && /Actualizar/.test(T.TEXTOS_CHECKLIST.actualizaNota)); assert.equal(T.TEXTOS_CHECKLIST.actualizar, 'Actualizar')
    assert.equal(T.listosDe(3, 9), '3 de 9 listos'); assert.equal(T.faltan(6), 'Faltan 6'); assert.equal(T.marcadoPor('Jairo', '10:30'), 'Jairo · 10:30'); assert.equal(T.loMarcasteTu('10:30'), 'Lo marcaste tú · 10:30'); assert.equal(T.itemsDe(1), '1 ítem'); assert.equal(T.itemsDe(0), '0 ítems')
    assert.ok(!/\b(tenés|podés|revisá|tocá)\b/i.test(todo)); assert.ok(!/Todo el equipo lo ve/.test(fs.readFileSync(path.join(RAIZ, 'lib/textos/checklist.ts'), 'utf8').replace(/\/\/[^\n]*/g, '')), 'la frase del mockup no está en la app') })
  terminar()
})
