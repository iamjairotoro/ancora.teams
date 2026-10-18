// Ayudantes del paso 0a del punto 50: secreto interno obligatorio (y rotativo), pertenencia de ids a la organización y listas blancas de campos. Sin base ni red. Correr: `npm run test:auth`.
const { assert, db, ID, mundo, estado, from, prueba, terminar, correr, resolver, RAIZ } = require('../portal/_banco')
const path = require('path')
const { verificarSecretoInterno, secretosInternos } = require(resolver(path.join(RAIZ, 'lib/auth/secretoInterno')))
const { sonDeLaOrganizacion, todosSonDeLaOrganizacion } = require(resolver(path.join(RAIZ, 'lib/auth/pertenencia')))
const { soloPermitidos } = require(resolver(path.join(RAIZ, 'lib/auth/camposPermitidos')))
const admin = { from }
const req = secreto => ({ headers: { get: n => (n === 'x-internal-secret' ? secreto : null) } })

correr(async () => {
  console.log('secreto interno')
  await prueba('sin ningún secreto definido en el entorno responde 401, aunque la cabecera venga (nunca «sin secreto, pasa»)', async () => {
    for (const env of [{}, { INTERNAL_API_SECRET: '' }, { INTERNAL_API_SECRET: '   ' }, { INTERNAL_API_SECRET_NUEVO: undefined }]) {
      for (const h of [null, '', 'cualquiera']) { const r = verificarSecretoInterno(req(h), env); assert.equal(r.ok, false); assert.equal(r.response.status, 401) } } })
  await prueba('con secreto definido: la cabecera correcta pasa; vacía, ausente o distinta da 401', async () => {
    const env = { INTERNAL_API_SECRET: 'secreto-largo-de-prueba-123' }
    assert.equal(verificarSecretoInterno(req('secreto-largo-de-prueba-123'), env).ok, true)
    for (const h of [null, '', 'secreto-largo-de-prueba-124', 'SECRETO-LARGO-DE-PRUEBA-123', 'secreto-largo-de-prueba-123 ', 'x']) assert.equal(verificarSecretoInterno(req(h), env).ok, false, String(h)) })
  await prueba('rotación: durante la ventana valen el viejo y el nuevo; un tercero no; el nuevo solo ya sirve', async () => {
    const env = { INTERNAL_API_SECRET: 'viejo-viejo-viejo-viejo', INTERNAL_API_SECRET_NUEVO: 'nuevo-nuevo-nuevo-nuevo' }
    assert.equal(verificarSecretoInterno(req('viejo-viejo-viejo-viejo'), env).ok, true); assert.equal(verificarSecretoInterno(req('nuevo-nuevo-nuevo-nuevo'), env).ok, true); assert.equal(verificarSecretoInterno(req('otro'), env).ok, false)
    assert.deepEqual(secretosInternos({ INTERNAL_API_SECRET_NUEVO: 'solo-el-nuevo' }), ['solo-el-nuevo']); assert.equal(verificarSecretoInterno(req('solo-el-nuevo'), { INTERNAL_API_SECRET_NUEVO: 'solo-el-nuevo' }).ok, true) })

  console.log('pertenencia a la organización')
  await prueba('ids de la organización pasan; uno ajeno, uno inexistente o uno que no es uuid hacen fallar todo; los vacíos se ignoran', async () => {
    mundo(); const { ME, O1, TA } = ID, O = ID.ORG
    assert.equal(await sonDeLaOrganizacion(admin, 'members', O, [ME, O1, ME]), true); assert.equal(await sonDeLaOrganizacion(admin, 'members', O, []), true); assert.equal(await sonDeLaOrganizacion(admin, 'members', O, [null, undefined, '']), true)
    assert.equal(await sonDeLaOrganizacion(admin, 'members', O, [ME, ID.AJ.member]), false, 'una persona de otra organización'); assert.equal(await sonDeLaOrganizacion(admin, 'members', O, ['00000000-0000-0000-0000-00000000ffff']), false, 'no existe')
    assert.equal(await sonDeLaOrganizacion(admin, 'members', O, ["x' or '1'='1"]), false, 'no es uuid: ni siquiera consulta'); assert.equal(await sonDeLaOrganizacion(admin, 'teams', O, [TA]), true); assert.equal(await sonDeLaOrganizacion(admin, 'teams', O, [ID.AJ.team]), false) })
  await prueba('varias tablas a la vez: basta un id ajeno para que falle; y la comprobación no escribe nada', async () => {
    mundo(); estado.escrituras.length = 0; const O = ID.ORG
    assert.equal(await todosSonDeLaOrganizacion(admin, O, { members: [ID.ME], teams: [ID.TA], services: [ID.S1 || Object.values(db.services)[1].id], songs: [ID.SG1] }), true)
    assert.equal(await todosSonDeLaOrganizacion(admin, O, { members: [ID.ME], services: [ID.AJ.service] }), false); assert.equal(await todosSonDeLaOrganizacion(admin, O, { songs: [ID.AJ.song] }), false); assert.equal(await todosSonDeLaOrganizacion(admin, O, {}), true)
    assert.equal(estado.escrituras.length, 0) })

  console.log('listas blancas de campos')
  await prueba('solo pasan las columnas de la lista; las demás se reportan (no se ignoran en silencio); un cuerpo que no es objeto se rechaza', async () => {
    const r = soloPermitidos({ titulo: 'Culto', hora_inicio: '10:00', organization_id: 'otra', id: 'x' }, ['titulo', 'hora_inicio', 'hora_fin'])
    assert.deepEqual(r.datos, { titulo: 'Culto', hora_inicio: '10:00' }); assert.deepEqual(r.rechazados.sort(), ['id', 'organization_id'])
    for (const mal of [null, undefined, 'x', 5, []]) assert.deepEqual(soloPermitidos(mal, ['a']).rechazados, ['(cuerpo)']) })
  terminar()
})
