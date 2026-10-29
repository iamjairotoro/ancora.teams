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
    // «Cambiar» (038) NO crea una invitación: las dos filas ya existían; solo cambian el estado de la anterior (queda declinada por conflicto) y de la que ya estaba (queda confirmada).
    assert.deepEqual(despues.map(c => [c.memberId, c.teamId]), antes.map(c => [c.memberId, c.teamId]), 'mismas dos filas antes y después'); assert.equal(despues.length, antes.length)
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
  const NOMBRES = new Map([[SON.id, 'Sonido'], [PRO.id, 'Proyección'], [LUC.id, 'Luces']])
  const desdeFilas = (items = ITEMS, grupos = GRUPOS) => C.plantillaDesdeFilas({ grupos, items, nombres: NOMBRES })
  const sinExistentes = (posiciones = POS) => ({ posiciones, existentes: [] })
  await prueba('plantillas: se guardan como la MISMA lista plana de siempre ([{ texto }] con positionId, positionNombre y grupo opcionales), sin marcas ni personas, en el orden de las secciones', async () => {
    const p = desdeFilas(); assert.ok(Array.isArray(p) && p.length === 10); assert.ok(p.every(x => typeof x.texto === 'string'), 'cada ítem conserva «texto»')
    assert.ok(!JSON.stringify(p).includes(ANA) && !JSON.stringify(p).includes('checked') && !JSON.stringify(p).includes('2026-11-01'), 'sin personas ni marcas')
    assert.deepEqual(p.filter(x => x.positionId === SON.id).map(x => [x.grupo, x.texto]), [['Antes del servicio', 'Sacar cosas'], ['Antes del servicio', 'Probar micrófonos'], ['Al terminar', 'Guardar cables'], ['Al terminar', 'Apagar consola']])
    assert.deepEqual(p.find(x => x.texto === 'Cerrar la bodega'), { texto: 'Cerrar la bodega', positionId: null, grupo: 'Varios' }, '«General» se guarda con positionId null'); assert.equal(p.find(x => x.texto === 'Sacar cosas').positionNombre, 'Sonido')
    assert.deepEqual(C.leerPlantilla(JSON.parse(JSON.stringify(p))), p, 'ida y vuelta por JSON (la columna jsonb) sin pérdidas') })
  await prueba('aplicar a un checklist vacío: todo va a su posición y a su sección (las secciones que faltan se crean); «General» conserva su título', async () => {
    const r = C.planificarAplicacion(desdeFilas(), sinExistentes()); assert.equal(r.agregar.length, 10); assert.equal(r.omitir, 0); assert.deepEqual(r.aGeneral, []); assert.equal(r.sinPosiciones, 0)
    assert.deepEqual(r.agregar.filter(x => x.positionId === LUC.id).map(x => x.texto), ['Encender luces', 'Apagar luces']); assert.deepEqual(r.agregar.find(x => x.texto === 'Cerrar la bodega'), { positionId: null, grupo: 'Varios', texto: 'Cerrar la bodega' }) })
  await prueba('duplicados: se omiten los que ya están (texto sin mayúsculas ni tildes, misma posición y sección); aplicar dos veces no cambia nada; también se omiten los repetidos dentro de la propia plantilla', async () => {
    const ya = [{ positionId: SON.id, grupo: 'antes del SERVICIO', texto: 'SACAR   cosas' }, { positionId: PRO.id, grupo: 'Antes del servicio', texto: 'Encender proyector' }]
    const r = C.planificarAplicacion(desdeFilas(), { posiciones: POS, existentes: ya }); assert.equal(r.omitir, 2); assert.equal(r.agregar.length, 8); assert.ok(!r.agregar.some(x => x.texto === 'Sacar cosas'))
    const mismoTextoOtraSeccion = C.planificarAplicacion(desdeFilas(), { posiciones: POS, existentes: [{ positionId: SON.id, grupo: 'Al terminar', texto: 'Sacar cosas' }] }); assert.equal(mismoTextoOtraSeccion.omitir, 0, 'otra sección: no es el mismo ítem')
    const otraPosicion = C.planificarAplicacion(desdeFilas(), { posiciones: POS, existentes: [{ positionId: PRO.id, grupo: 'Antes del servicio', texto: 'Sacar cosas' }] }); assert.equal(otraPosicion.omitir, 0, 'otra posición: no es el mismo ítem')
    const primera = C.planificarAplicacion(desdeFilas(), sinExistentes()); const despues = { posiciones: POS, existentes: primera.agregar.map(a => ({ positionId: a.positionId, grupo: a.grupo, texto: a.texto })) }
    const segunda = C.planificarAplicacion(desdeFilas(), despues); assert.equal(segunda.agregar.length, 0, 'la segunda vez no agrega nada'); assert.equal(segunda.omitir, 10)
    const repetida = C.planificarAplicacion([{ texto: 'A', positionId: null, grupo: null }, { texto: ' a ', positionId: null, grupo: null }], sinExistentes()); assert.equal(repetida.agregar.length, 1); assert.equal(repetida.omitir, 1) })
  await prueba('posición que este domingo NO existe: sus ítems van a «General», en una sección con el nombre de la posición original, y se avisa cuántos (no se pierde nada)', async () => {
    const sinLuces = [SON, PRO], r = C.planificarAplicacion(desdeFilas(), sinExistentes(sinLuces))
    assert.equal(r.agregar.length, 10, 'no se pierde ninguno'); assert.deepEqual(r.aGeneral, [{ nombre: 'Luces', items: 2 }]); assert.deepEqual(r.agregar.filter(x => x.positionId === null && x.grupo === 'Luces · Antes del servicio').map(x => x.texto), ['Encender luces', 'Apagar luces'])
    assert.ok(!r.agregar.some(x => x.positionId === LUC.id), 'ninguno apunta a una posición que no existe')
    assert.deepEqual(T.avisoGeneral(r.aGeneral, true), ['2 ítems de «Luces» pasarán a General porque esa posición no existe este domingo.']); assert.deepEqual(T.avisoGeneral([{ nombre: 'Luces', items: 1 }], false), ['1 ítem de «Luces» pasó a General porque esa posición no existe este domingo.'])
    const yaEstaba = C.planificarAplicacion(desdeFilas(), { posiciones: sinLuces, existentes: [{ positionId: null, grupo: 'Luces · Antes del servicio', texto: 'Encender luces' }] }); assert.deepEqual(yaEstaba.aGeneral, [{ nombre: 'Luces', items: 1 }], 'el aviso cuenta solo lo que de verdad se agrega') })
  await prueba('la posición con otro id o renombrada se empareja por nombre solo si es único; si hay dos con el mismo nombre no se adivina (va a «General»)', async () => {
    const viejo = C.leerPlantilla([{ texto: 'A', positionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', positionNombre: ' sonido ', grupo: 'Antes' }])      // lo que llega de la base siempre pasa por leerPlantilla (nombres recortados)
    assert.deepEqual(C.planificarAplicacion(viejo, sinExistentes()).agregar, [{ positionId: SON.id, grupo: 'Antes', texto: 'A' }], 'por nombre, sin mayúsculas ni tildes')
    const dos = [SON, { id: 'p-sonido-2', nombre: 'Sonido', orden: 9 }], r = C.planificarAplicacion(viejo, sinExistentes(dos)); assert.deepEqual(r.agregar, [{ positionId: null, grupo: 'sonido · Antes', texto: 'A' }]); assert.deepEqual(r.aGeneral, [{ nombre: 'sonido', items: 1 }]) })
  await prueba('plantilla VIEJA (lista plana, sin positionId ni grupo): todos sus ítems van a «General» en una sola sección sin título, con el aviso «Esta plantilla no tiene posiciones…»', async () => {
    const vieja = C.leerPlantilla([{ texto: 'Cables' }, { texto: 'Probar micrófonos' }, { texto: 'Cables' }, { texto: 'Cerrar' }]); assert.equal(C.esPlantillaVieja(vieja), true); assert.equal(C.posicionesDePlantilla(vieja), 0)
    const r = C.planificarAplicacion(vieja, sinExistentes()); assert.deepEqual(r.agregar.map(x => [x.positionId, x.grupo, x.texto]), [[null, null, 'Cables'], [null, null, 'Probar micrófonos'], [null, null, 'Cerrar']]); assert.equal(r.sinPosiciones, 3); assert.equal(r.omitir, 1, 'el repetido de la propia plantilla')
    assert.equal(T.avisoSinPosiciones(3), 'Esta plantilla no tiene posiciones: los 3 ítems van a General y puedes moverlos después.'); assert.equal(T.avisoSinPosiciones(1), 'Esta plantilla no tiene posiciones: el ítem va a General y puedes moverlos después.')
    const texto = T.confirmarAplicar({ agregar: r.agregar.length, omitir: r.omitir, sinPosiciones: r.sinPosiciones, aGeneral: r.aGeneral }); assert.ok(texto.includes('Esta plantilla no tiene posiciones: los 3 ítems van a General y puedes moverlos después.'), texto)
    assert.equal(C.esPlantillaVieja(desdeFilas()), false, 'una plantilla nueva (aunque tenga ítems de «General») no es vieja'); assert.equal(C.esPlantillaVieja([{ texto: 'x', positionId: null }]), false) })
  await prueba('leer una plantilla de la base con cuidado: solo lista de ítems con texto de 1 a 200 caracteres; los campos opcionales solo con la forma correcta; el tope es de 500 ítems; lo demás se descarta', async () => {
    assert.deepEqual(C.leerPlantilla(null), []); assert.deepEqual(C.leerPlantilla({ texto: 'x' }), []); assert.deepEqual(C.leerPlantilla('x'), [])
    const l = C.leerPlantilla([{ texto: '  Hola  ' }, { texto: '' }, { texto: 'x'.repeat(201) }, null, 5, { nada: 1 }, { texto: 'B', positionId: 'no es un id!', positionNombre: 7, grupo: '' }, { texto: 'C', positionId: null, grupo: ' Sec ' }])
    assert.deepEqual(l, [{ texto: 'Hola' }, { texto: 'B' }, { texto: 'C', positionId: null, grupo: 'Sec' }]); assert.equal(C.leerPlantilla(Array.from({ length: 700 }, (_, i) => ({ texto: 't' + i }))).length, C.MAX_ITEMS_PLANTILLA) })
  await prueba('textos de plantillas: la confirmación dice cuántos se agregan y cuántos se omiten; tuteo; sin promesas de «en vivo»', async () => {
    const r = { agregar: 7, omitir: 2, sinPosiciones: 0, aGeneral: [] }
    assert.equal(T.confirmarAplicar(r), '¿Agregar 7 ítems a este checklist? 2 ya estaban y se omiten. No se borra ni se cambia nada de lo que ya hay.'); assert.equal(T.confirmarAplicar({ ...r, agregar: 1, omitir: 1 }), '¿Agregar 1 ítem a este checklist? 1 ya estaba y se omite. No se borra ni se cambia nada de lo que ya hay.')
    const P = require(resolver(path.join(RAIZ, 'lib/ventanas/partirMensaje'))).partirMensaje(T.confirmarAplicar(r)); assert.equal(P.titulo, '¿Agregar 7 ítems a este checklist?'); assert.ok(P.texto.startsWith('2 ya estaban y se omiten.'), 'la ventana la parte en título y detalle')
    assert.equal(T.aplicadoAviso({ agregar: 7, omitir: 2, sinPosiciones: 0, aGeneral: [] }), 'Se agregaron 7 ítems (2 ya estaban).'); assert.equal(T.detallePlantilla(7, 3), '7 ítems · 3 posiciones'); assert.equal(T.detallePlantilla(7, null), '7 ítems'); assert.equal(T.detallePlantilla(1, 1), '1 ítem · 1 posición')
    assert.equal(T.existeConfirmar('Sonido domingo', false), 'Ya existe «Sonido domingo». ¿Reemplazarla?'); assert.equal(T.existeConfirmar('Domingo', true), 'Ya existe «Domingo». Es la plantilla predeterminada de servicios: también cambia los servicios nuevos. ¿Reemplazarla?')
    const PM = require(resolver(path.join(RAIZ, 'lib/ventanas/partirMensaje'))).partirMensaje; assert.deepEqual(PM(T.existeConfirmar('Domingo', true)), { titulo: '¿Reemplazarla?', texto: 'Ya existe «Domingo». Es la plantilla predeterminada de servicios: también cambia los servicios nuevos.' }); assert.deepEqual(PM(T.existeConfirmar('X', false)), { titulo: '¿Reemplazarla?', texto: 'Ya existe «X».' })
    assert.equal(T.predeterminadaBloqueada('Domingo', 'Domingo (copia)'), '«Domingo» es la plantilla predeterminada de servicios y solo la puede reemplazar un administrador. Guarda con otro nombre, por ejemplo «Domingo (copia)».'); assert.equal(T.plantillaGuardada('X', false), 'Plantilla «X» guardada.'); assert.equal(T.plantillaGuardada('X', true), 'Plantilla «X» reemplazada.')
    const todo = [Object.values(T.TEXTOS_CHECKLIST).join(' '), T.confirmarAplicar({ agregar: 3, omitir: 0, sinPosiciones: 3, aGeneral: [{ nombre: 'Luces', items: 2 }] }), T.aplicadoAviso(r), T.predeterminadaBloqueada('a', 'b')].join(' ')
    assert.ok(!/al instante|en vivo|tiempo real|automáticamente/i.test(todo)); assert.ok(!/\b(tenés|podés|revisá|tocá|guardá)\b/i.test(todo)); assert.equal(T.TEXTOS_CHECKLIST.sinDomingoPasado, 'Todavía no hay un checklist anterior de este equipo') })
  await prueba('textos: la pantalla NO promete actualización en vivo; solo dice que el botón «Actualizar» sirve si no ves un cambio; tuteo', async () => {
    const todo = Object.values(T.TEXTOS_CHECKLIST).join(' ') + ' ' + [T.listosDe(1, 4), T.faltan(3), T.marcadoPor('Jairo', '10:30'), T.loMarcasteTu('10:30')].join(' ')
    assert.ok(!/al instante|en vivo|tiempo real|automáticamente/i.test(todo), 'ninguna promesa de «en vivo»'); assert.equal(T.TEXTOS_CHECKLIST.actualizaNota, 'Toca «Actualizar» si no ves un cambio.'); assert.equal(T.TEXTOS_CHECKLIST.actualizar, 'Actualizar')
    assert.equal(T.listosDe(3, 9), '3 de 9 listos'); assert.equal(T.faltan(6), 'Faltan 6'); assert.equal(T.marcadoPor('Jairo', '10:30'), 'Jairo · 10:30'); assert.equal(T.loMarcasteTu('10:30'), 'Lo marcaste tú · 10:30'); assert.equal(T.itemsDe(1), '1 ítem'); assert.equal(T.itemsDe(0), '0 ítems')
    assert.ok(!/\b(tenés|podés|revisá|tocá)\b/i.test(todo)); assert.ok(!/Todo el equipo lo ve/.test(fs.readFileSync(path.join(RAIZ, 'lib/textos/checklist.ts'), 'utf8').replace(/\/\/[^\n]*/g, '')), 'la frase del mockup no está en la app') })
  terminar()
})
