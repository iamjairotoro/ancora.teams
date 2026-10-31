// «Servicios» del LÍDER (etapa 1): las rutas GET /api/lider/servicios y /api/lider/servicio y el recorte de lib/lider/servicioLider.ts. Lo que se comprueba:
//  · quién entra: líder y administrador sí; sin rol, 403; sin sesión, 401; un servicio que no existe, de otra organización o un id mal escrito responden EXACTAMENTE lo mismo que «sin rol» (no se averigua qué ids existen);
//  · Cache-Control: no-store en TODAS las respuestas, también las de error;
//  · el recorte: los equipos ajenos llevan solo nombre del equipo, de la posición, de la persona y «Confirmó»/«Sin responder» (nunca «Declinó»); las listas de campos de ESTE archivo son propias (si alguien agrega
//    un campo a la respuesta sin actualizarlas, la prueba falla), y los valores «canario» sembrados en las filas (correo, teléfono, nacimiento, motivos, bloqueos…) no pueden aparecer en ningún lugar;
//  · solo lectura: ninguna de las rutas escribe nada. Correr: `npm run test:auth`.
const { assert, db, estado, prueba, terminar, correr, stubs, resolver, RAIZ, fijarReloj, soltarReloj } = require('../portal/_banco')
const path = require('path')
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder'
stubs['next/server'].NextResponse.json = (b, init) => ({ status: (init && init.status) || 200, body: JSON.parse(JSON.stringify(b)), headers: (init && init.headers) || {} })
let sesion = { email: null }
const lc = s => String(s || '').toLowerCase()
const emailDe = id => lc((db.members.find(m => m.id === id) || {}).email)
const RPC = {
  is_org_admin: a => db.organization_members.some(o => emailDe(o.person_id) === lc(a.p_email) && o.organization_id === a.p_organization_id && ['owner', 'admin'].includes(o.role)),
  is_any_team_leader: a => db.team_members.some(t => emailDe(t.member_id) === lc(a.p_email) && t.organization_id === a.p_organization_id && t.is_leader === true),
}
stubs['@/lib/supabase-server'] = { createServerSupabase: () => ({ auth: { getUser: async () => ({ data: { user: sesion.email ? { email: sesion.email } : null } }) }, rpc: async (fn, a) => { assert.ok(RPC[fn], `función desconocida ${fn}`); return { data: RPC[fn](a) } } }) }
const real = n => require(resolver(path.join(RAIZ, n)))
const lista = real('app/api/lider/servicios/route'), detalle = real('app/api/lider/servicio/route'), fuente = n => require('fs').readFileSync(path.join(RAIZ, n), 'utf8')

const ORG = 'org-1', ORG2 = 'org-2'
const TA = 'team-a', TB = 'team-b', TC = 'team-c'
const U = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const S1 = U(1), S2 = U(2), SX = U(3), SPASADO = U(4), NOEXISTE = U(99)
const CANARIOS = ['canario-correo', '+56 9 CANARIO', '1999-12-31', 'CANARIO-MOTIVO', 'CANARIO-COMENTARIO', 'CANARIO-TOKEN', 'CANARIO-BLOQUEO', 'CANARIO-AVATAR']
const mundo = () => {
  estado.escrituras.length = 0; estado.fallan.clear()
  const m = (id, nombre, apellido, email, extra = {}) => ({ id, nombre, apellido, email, telefono: '+56 9 CANARIO', fecha_nacimiento: '1999-12-31', avatar_url: 'CANARIO-AVATAR', organization_id: ORG, ...extra })
  db.members = [m('m-ana', 'Ana', 'Lider', 'ana@canario-correo.test'), m('m-beto', 'Beto', 'Otro', 'beto@canario-correo.test'), m('m-cami', 'Cami', 'Sinrol', 'cami@canario-correo.test'), m('m-dani', 'Dani', 'Admin', 'dani@canario-correo.test'),
    m('m-p1', 'Paula', 'Propia', 'p1@canario-correo.test'), m('m-p2', 'Pablo', 'Propio', 'p2@canario-correo.test'), m('m-a1', 'Alba', 'Ajena', 'a1@canario-correo.test'), m('m-a2', 'Aldo', 'Ajeno', 'a2@canario-correo.test'), m('m-a3', 'Aitana', 'Declinó', 'a3@canario-correo.test')]
  db.teams = [{ id: TA, name: 'Alabanza', color: 'cobalto', sort_order: 1, organization_id: ORG, archived_at: null }, { id: TB, name: 'Producción', color: 'rosa', sort_order: 2, organization_id: ORG, archived_at: null },
    { id: TC, name: 'Archivado', color: null, sort_order: 3, organization_id: ORG, archived_at: '2026-01-01' }, { id: 'team-x', name: 'De otra org', color: null, sort_order: 1, organization_id: ORG2, archived_at: null }]
  db.team_positions = [{ id: 'pos-1', name: 'Voz', team_id: TA, sort_order: 1 }, { id: 'pos-2', name: 'Bajo', team_id: TA, sort_order: 2 }, { id: 'pos-3', name: 'Sonido', team_id: TB, sort_order: 1 }, { id: 'pos-4', name: 'Luces', team_id: TB, sort_order: 2 }]
  db.team_members = [{ member_id: 'm-ana', team_id: TA, organization_id: ORG, is_leader: true }, { member_id: 'm-beto', team_id: TB, organization_id: ORG, is_leader: true }, { member_id: 'm-cami', team_id: TA, organization_id: ORG, is_leader: false }]
  db.organization_members = [{ person_id: 'm-dani', organization_id: ORG, role: 'admin' }]
  db.team_tools = [{ id: 'tool-a-check', team_id: TA, tool_type: 'checklist', label: null, sort_order: 1 }, { id: 'tool-a-sched', team_id: TA, tool_type: 'schedule', label: null, sort_order: 2 }, { id: 'tool-b-check', team_id: TB, tool_type: 'checklist', label: 'Checklist de Producción', sort_order: 1 }]
  const svc = (id, fecha, org = ORG) => ({ id, fecha, titulo: 'Servicio Ancora — ' + fecha, kind: 'service', hora_inicio: '10:00:00', hora_fin: '14:00:00', organization_id: org, secreto: 'CANARIO-BLOQUEO' })
  db.services = [svc(S1, '2026-11-01'), svc(S2, '2026-11-08'), svc(SX, '2026-11-01', ORG2), svc(SPASADO, '2026-10-01')]
  db.banda_assignments = [
    { service_id: S1, member_id: 'm-p1', team_position_id: 'pos-1', slot_index: 1 }, { service_id: S1, member_id: 'm-p2', team_position_id: 'pos-2', slot_index: 1 }, { service_id: S1, member_id: null, team_position_id: 'pos-2', slot_index: 2 },
    { service_id: S1, member_id: 'm-a1', team_position_id: 'pos-3', slot_index: 1 }, { service_id: S1, member_id: 'm-a2', team_position_id: 'pos-4', slot_index: 1 }, { service_id: S1, member_id: 'm-a3', team_position_id: 'pos-4', slot_index: 2 },
    { service_id: S2, member_id: 'm-a1', team_position_id: 'pos-3', slot_index: 1 }]
  const inv = (member_id, team_id, status) => ({ service_id: S1, member_id, team_id, status, declined_reason: 'CANARIO-MOTIVO', comentario: 'CANARIO-COMENTARIO', token: 'CANARIO-TOKEN' })
  db.invitations = [inv('m-p1', TA, 'confirmado'), inv('m-p2', TA, 'declinado'), inv('m-a1', TB, 'confirmado'), inv('m-a2', TB, 'pendiente'), inv('m-a3', TB, 'declinado')]
  db.date_blocks = [{ member_id: 'm-p1', blocked_date: '2026-11-01', motivo: 'CANARIO-BLOQUEO' }]
}
const GET = async (ruta, email, url = 'http://x/') => { sesion = { email }; const u = new URL(url); return ruta.GET({ nextUrl: u, url }) }
const ver = (email, id) => GET(detalle, email, `http://x/api/lider/servicio?id=${id}`)
const sinCache = r => assert.equal((r.headers || {})['Cache-Control'], 'no-store', `falta no-store (estado ${r.status})`)
// Listas de campos PROPIAS de esta prueba: agregar un campo a la respuesta exige actualizarlas aquí, a propósito.
const CAMPOS = {
  raiz: ['equipos', 'servicio'], servicio: ['fecha', 'horas', 'id', 'kind', 'titulo'], equipoAjeno: ['color', 'id', 'nombre', 'personas', 'tuEquipo'],
  equipoPropio: ['checklists', 'color', 'id', 'nombre', 'personas', 'tuEquipo'], personaPropia: ['apellido', 'estado', 'nombre', 'posicion'], personaAjena: ['apellido', 'estado', 'nombre', 'posicion'], checklist: ['id', 'nombre'],
}
const llaves = o => Object.keys(o).sort()

correr(async () => {
  fijarReloj('2026-10-31T16:00:00Z')
  try {
    mundo()
    console.log('quién entra y cómo responde')
    await prueba('un líder recibe el detalle; un administrador también', async () => { assert.equal((await ver('ana@canario-correo.test', S1)).status, 200); assert.equal((await ver('dani@canario-correo.test', S1)).status, 200) })
    const sinRol = await ver('cami@canario-correo.test', S1)
    await prueba('una persona sin rol recibe el 403 genérico', async () => { assert.equal(sinRol.status, 403); assert.deepEqual(sinRol.body, { error: 'No autorizado' }) })
    await prueba('un servicio que no existe, uno de OTRA organización y un id mal escrito responden EXACTAMENTE lo mismo que «sin rol» (cuerpo, estado y cabeceras)', async () => {
      for (const id of [NOEXISTE, SX, 'no-es-un-id', '', "' or 1=1 --"]) { const r = await ver('ana@canario-correo.test', id); assert.equal(r.status, sinRol.status, id); assert.deepEqual(r.body, sinRol.body, id); assert.deepEqual(r.headers, sinRol.headers, id) }
      const sinId = await GET(detalle, 'ana@canario-correo.test', 'http://x/api/lider/servicio'); assert.deepEqual(sinId.body, sinRol.body); assert.equal(sinId.status, 403)
    })
    await prueba('sin sesión: 401, y la lista de una persona sin rol también es 403', async () => { assert.equal((await ver(null, S1)).status, 401); assert.equal((await GET(lista, null)).status, 401); assert.equal((await GET(lista, 'cami@canario-correo.test')).status, 403) })
    await prueba('Cache-Control: no-store en el 200, el 401, el 403 y la falla de lectura', async () => {
      sinCache(await ver('ana@canario-correo.test', S1)); sinCache(await ver(null, S1)); sinCache(sinRol); sinCache(await GET(lista, 'ana@canario-correo.test')); sinCache(await GET(lista, null)); sinCache(await GET(lista, 'cami@canario-correo.test'))
      estado.fallan.add('banda_assignments'); const f = await ver('ana@canario-correo.test', S1); assert.equal(f.status, 500); sinCache(f); estado.fallan.clear()
      estado.fallan.add('services'); const g = await GET(lista, 'ana@canario-correo.test'); assert.equal(g.status, 500); sinCache(g); estado.fallan.clear()
    })

    console.log('el recorte')
    const rA = await ver('ana@canario-correo.test', S1), rB = await ver('beto@canario-correo.test', S1)
    await prueba('la respuesta tiene SOLO los campos de la lista (raíz, servicio, equipos, personas, checklists)', async () => {
      for (const r of [rA, rB]) {
        assert.deepEqual(llaves(r.body), CAMPOS.raiz); assert.deepEqual(llaves(r.body.servicio), CAMPOS.servicio)
        for (const e of r.body.equipos) {
          assert.deepEqual(llaves(e), e.tuEquipo ? CAMPOS.equipoPropio : CAMPOS.equipoAjeno)
          for (const p of e.personas) assert.deepEqual(llaves(p), e.tuEquipo ? CAMPOS.personaPropia : CAMPOS.personaAjena)
          if (e.tuEquipo) for (const c of e.checklists) assert.deepEqual(llaves(c), CAMPOS.checklist)
        }
      }
    })
    await prueba('ningún valor canario (correo, teléfono, nacimiento, foto, motivo, comentario, token, bloqueo) aparece en la respuesta', async () => {
      for (const r of [rA, rB, await ver('dani@canario-correo.test', S1), await GET(lista, 'ana@canario-correo.test')]) { const t = JSON.stringify(r.body); for (const c of CANARIOS) assert.ok(!t.includes(c), `apareció «${c}»`) }
    })
    await prueba('el líder de Alabanza ve Alabanza como «Tu equipo» (primero) con TODO su equipo y los demás equipos con lo mínimo; el archivado no sale', async () => {
      assert.deepEqual(rA.body.equipos.map(e => [e.nombre, e.tuEquipo]), [['Alabanza', true], ['Producción', false]])
      assert.deepEqual(rA.body.equipos[0].personas, [{ nombre: 'Paula', apellido: 'Propia', posicion: 'Voz', estado: 'confirmo' }, { nombre: 'Pablo', apellido: 'Propio', posicion: 'Bajo', estado: 'declino' }])
    })
    await prueba('de un equipo AJENO solo salen nombre, posición y «Confirmó» o «Sin responder»: el que declinó y el que no ha respondido se ven igual (nunca «Declinó»)', async () => {
      const prod = rA.body.equipos.find(e => e.nombre === 'Producción')
      assert.deepEqual(prod.personas, [{ nombre: 'Alba', apellido: 'Ajena', posicion: 'Sonido', estado: 'confirmo' }, { nombre: 'Aitana', apellido: 'Declinó', posicion: 'Luces', estado: 'sin-responder' }, { nombre: 'Aldo', apellido: 'Ajeno', posicion: 'Luces', estado: 'sin-responder' }])
      assert.ok(!rA.body.equipos.filter(e => !e.tuEquipo).some(e => e.personas.some(p => p.estado === 'declino')))
    })
    await prueba('el líder de Producción ve Producción como suyo y Alabanza como ajeno (cada quien ve lo suyo); su «Declinó» sí lo ve en su equipo', async () => {
      assert.deepEqual(rB.body.equipos.map(e => [e.nombre, e.tuEquipo]), [['Producción', true], ['Alabanza', false]])
      assert.ok(rB.body.equipos[0].personas.some(p => p.estado === 'declino'))
      assert.ok(!rB.body.equipos[1].personas.some(p => p.estado === 'declino'))
    })
    await prueba('las herramientas de checklist que salen son SOLO las de los equipos que lidera (no los ids de otro equipo); la que tiene nombre lo conserva y la otra se llama «Checklist»', async () => {
      assert.deepEqual(rA.body.equipos[0].checklists, [{ id: 'tool-a-check', nombre: 'Checklist' }])
      assert.deepEqual(rB.body.equipos[0].checklists, [{ id: 'tool-b-check', nombre: 'Checklist de Producción' }])
      assert.ok(!JSON.stringify(rA.body).includes('tool-b-check'))
      assert.ok(!JSON.stringify(rA.body).includes('tool-a-sched'), 'solo los checklists')
    })
    await prueba('las posiciones vacías (sin persona) no salen', async () => { assert.equal(rA.body.equipos[0].personas.length, 2) })

    console.log('la lista')
    const l = await GET(lista, 'ana@canario-correo.test')
    await prueba('la lista trae solo los servicios de la organización desde hoy, con id, fecha, título (sin la fecha), tipo y horas', async () => {
      assert.equal(l.status, 200); assert.deepEqual(l.body.servicios.map(s => s.id), [S1, S2]); assert.deepEqual(llaves(l.body), ['servicios'])
      for (const s of l.body.servicios) assert.deepEqual(llaves(s), CAMPOS.servicio)
      assert.deepEqual(l.body.servicios[0], { id: S1, fecha: '2026-11-01', titulo: 'Servicio Ancora', kind: 'service', horas: '10:00 – 14:00' })
    })

    console.log('solo lectura')
    await prueba('ninguna llamada escribió en la base', async () => { assert.equal(estado.escrituras.length, 0) })
    await prueba('el código de las rutas y del recorte no contiene ninguna escritura ni llama a funciones de la base', async () => {
      for (const f of ['app/api/lider/servicios/route.ts', 'app/api/lider/servicio/route.ts', 'lib/lider/servicioLider.ts']) { const c = fuente(f).replace(/\/\/.*$/gm, ''); assert.ok(!/\.(insert|update|upsert|delete)\(|\.rpc\(/.test(c), f) }
    })
  } finally { soltarReloj() }
  terminar()
})
