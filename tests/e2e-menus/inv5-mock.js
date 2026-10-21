// Datos simulados para el inventario de TEXTO del área 1 (Servicio). Estados por localStorage: __vacio=1 (sin servicios), __error=1 (la carga de servicios falla), __lento=1 (la carga de servicios tarda 25 s).
const SESION = () => JSON.stringify({ access_token: 'a.b.c', refresh_token: 'r', token_type: 'bearer', expires_in: 99999, expires_at: Math.floor(Date.now() / 1000) + 99999, user: { id: 'u1', aud: 'authenticated', email: 'ana@ejemplo.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01' } })
const MOCK = `(() => {
  /* RELOJ FIJO: lunes 19 de octubre de 2026, 12:00 en Chile */
  const RD = Date, T = new RD('2026-10-19T15:00:00Z').getTime(); window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(T) } static now() { return T } }
  const original = window.fetch.bind(window)
  const L = k => { try { return localStorage.getItem(k) } catch { return null } }
  const j = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/*' } })
  const ORG = '00000000-0000-0000-0000-000000000001'
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' })
  const dia = n => { const [y, m, d] = fmt.format(new Date()).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10) }
  const N = [['m1','Ana','Mora','ana@ejemplo.test'],['m2','Juan','Pérez','juan@ejemplo.test'],['m3','María','Castro','maria@ejemplo.test'],['m4','Pedro','Soto','pedro@ejemplo.test'],['m5','Luis','Muñoz','luis@ejemplo.test'],['m6','Sofía','Vera',''],['m7','Tomás','Paz','tomas@ejemplo.test'],['m8','Valentina','Rojas','vale@ejemplo.test']]
  const members = N.map(([id,nombre,apellido,email]) => ({ id, nombre, apellido, email, telefono: '', organization_id: ORG, avatar_url: null, instalado_pwa_at: null, last_seen: null, fecha_nacimiento: null }))
  const teams = L('__sinequipos') === '1' ? [] : [{ id:'t1', organization_id: ORG, name:'Alabanza', sort_order:1, archived_at:null, color:'cobalto', library_access:true }, { id:'t2', organization_id: ORG, name:'Producción', sort_order:2, archived_at:null, color:'naranja', library_access:false }]
  const positions = [['p1','t1','Voz principal','VX1'],['p2','t1','Coros','VX2'],['p3','t1','Guitarra acústica','AG1'],['p4','t1','Bajo','BA'],['p5','t2','Sonido','SON'],['p6','t2','Proyección','PRO']].map(([id,team_id,name,code],i) => ({ id, team_id, organization_id: ORG, name, code, sort_order:i, archived_at:null, default_slots:1, section_id:null }))
  const tm = [['x1','m1','t1',true],['x2','m2','t1',false],['x3','m3','t1',false],['x4','m4','t1',false],['x5','m5','t1',false],['x6','m6','t2',false],['x7','m7','t2',true],['x8','m5','t2',false]].map(([id,member_id,team_id,is_leader]) => ({ id, member_id, team_id, is_leader, organization_id: ORG }))
  const links = [['x1','p1'],['x2','p2'],['x3','p2'],['x4','p3'],['x5','p4'],['x6','p5'],['x7','p5'],['x8','p6']].map(([team_member_id,team_position_id]) => ({ team_member_id, team_position_id }))
  const tools = [['k1','t1','setlist',1],['k2','t1','checklist',2],['k3','t1','schedule',3],['k4','t1','notes',4],['k5','t1','file_upload',5],['k6','t2','setlist',1],['k7','t2','notes',2]].map(([id,team_id,tool_type,sort_order]) => ({ id, team_id, tool_type, sort_order, created_at: '2026-01-01' })).concat(L('__dosChecklist') === '1' ? [{ id: 'k2b', team_id: 't1', tool_type: 'checklist', sort_order: 6, created_at: '2026-01-01' }] : [])
  const sv = (id, n, extra = {}) => ({ id, fecha: dia(n), titulo: 'Servicio ' + id, hora_inicio: '10:00:00', hora_fin: '14:00:00', tipo: 'servicio', kind: 'service', parent_service_id: null, lugar: null, direccion: null, maps_link: null, organization_id: ORG, created_at: '2026-01-01', ...extra })
  const services = L('__vacio') === '1' ? [] : [sv('pasado', -7), sv('conv', 6), sv('ens', 8, { tipo: 'ensayo', kind: 'rehearsal', titulo: 'Ensayo conv', parent_service_id: 'conv', lugar: 'Sala de ensayo' }), sv('eq', 13), sv('sin', 20)]
  const inv = (service_id, member_id, team_id, status, extra = {}) => ({ id: 'i-'+service_id+member_id+team_id, service_id, member_id, team_id, status, declined_reason: null, superseded_by: null, sent_at: '2026-10-10', token: 'tk'+member_id, created_at: '2026-10-10', needs_reassignment_confirm: false, email_status: 'enviado', email_error: null, email_attempted_at: '2026-10-10', confirmed_posiciones: null, comentario: null, ...extra })
  const invitations = [inv('conv','m1','t1','confirmado'), inv('conv','m2','t1','confirmado'), inv('conv','m3','t1','pendiente', { email_status: 'falló', email_error: 'El servidor de correo rechazó la dirección.' }), inv('conv','m4','t1','declinado'), inv('conv','m5','t1','pendiente', { needs_reassignment_confirm: true }), inv('conv','m6','t2','pendiente'), inv('conv','m7','t2','confirmado'), inv('conv','m5','t2','declinado', { declined_reason: 'conflict', superseded_by: 'i-convm5t1' })]
  const b = (service_id, team_position_id, member_id, slot_index = 1) => ({ id: service_id+team_position_id+slot_index, service_id, team_position_id, member_id, slot_index, posicion: null })
  const banda = [b('conv','p1','m1'), b('conv','p2','m2'), b('conv','p2','m3',2), b('conv','p3','m4'), b('conv','p4','m5'), b('conv','p5','m6'), b('conv','p6','m7'), b('eq','p1','m1'), b('eq','p2','m2'), b('eq','p2','m3',2), b('eq','p3','m4'), b('eq','p5','m6'), b('eq','p6','m7')]
  const slots = [{ id:'sl1', service_id:'conv', team_position_id:'p2', slots_needed:2 }, { id:'sl2', service_id:'eq', team_position_id:'p2', slots_needed:3 }]
  const songs = [['s1','Cuán grande es Él','Chris Tomlin','G',72],['s2','Sublime gracia','Hillsong','D',68],['s3','Tu fidelidad','Marcos Witt','C',80],['s4','Santo','Un artista','E',90]].map(([id,nombre,artista,tono_original,bpm]) => ({ id, nombre, artista, tono_original, bpm, organization_id: ORG, duracion_min: 4, tags: [], created_at: '2026-01-01' }))
  const blk = (service_id, orden, tipo, titulo, song_id, lead_id, extra = {}) => ({ id: 'bl'+service_id+orden, service_id, orden, tipo, titulo, song_id, lead_id, tono: song_id ? 'G' : null, duracion_min: tipo === 'cancion' ? 240 : 300, notas: null, ...extra })
  const blocks = [blk('conv',1,'bloque','Preroll',null,null), blk('conv',2,'bloque','MC / Bienvenida',null,null), blk('conv',3,'cancion','Cuán grande es Él','s1','m1'), blk('conv',4,'cancion','Sublime gracia','s2','m2',{ notas: 'Entra el coro en el segundo verso' }), blk('conv',5,'bloque','Prédica',null,null,{ duracion_min: 2700 }), blk('conv',6,'bloque','Ofrenda',null,null), blk('eq',1,'cancion','Tu fidelidad','s3','m1'), blk('eq',2,'bloque','Prédica',null,null,{ duracion_min: 2700 })]
  const tpl = (id, tool, name, content, extra = {}) => ({ id, organization_id: ORG, team_id: null, tool, name, content, default_for_kind: null, archived_at: null, created_by: 'm1', created_at: '2026-01-01', ...extra })
  const templates = [tpl('tp1','order','Culto dominical',[{tipo:'bloque',titulo:'Preroll',duracion_min:180},{tipo:'cancion_marker'},{tipo:'bloque',titulo:'Prédica',duracion_min:2700}],{ default_for_kind:'service' }), tpl('tp2','checklist','Montaje',[{texto:'Afinar instrumentos'},{texto:'Probar micrófonos'}],{ team_id:'t1' }), tpl('tp3','schedule','Domingo',[{texto:'Llegada',offset_min:-90},{texto:'Prueba de sonido',offset_min:-60}],{ team_id:'t1' })]
  const checklists = [{ id:'ck1', service_id:'conv', team_id:'t1', team_tool_id:'k2', template_id:null, created_at:'2026-10-10' }]
  const checkItems = [{ id:'ci1', service_checklist_id:'ck1', texto:'Afinar instrumentos', checked:true, sort_order:1, assigned_member_id:'m4' }, { id:'ci2', service_checklist_id:'ck1', texto:'Probar micrófonos', checked:false, sort_order:2, assigned_member_id:null }]
  const sched = [{ id:'sc1', service_id:'conv', team_id:'t1', team_tool_id:'k3', hora:'08:30', texto:'Llegada', sort_order:1 }, { id:'sc2', service_id:'conv', team_id:'t1', team_tool_id:'k3', hora:'09:00', texto:'Prueba de sonido', sort_order:2 }]
  const notes = [{ id:'n1', service_id:'conv', team_id:'t1', team_tool_id:'k4', texto:'Traer cables extra.', updated_at:'2026-10-10' }]
  const tabla = { members, teams, team_positions: positions, team_members: tm, team_member_positions: links, team_tools: tools, services, invitations, banda_assignments: banda, service_position_slots: slots, songs, service_blocks: blocks, tool_templates: templates, service_applied_templates: [], messages: [{ id: 'ms1', member_id: 'm1', recipient_member_id: null, service_id: null, content: 'Hola equipo', created_at: '2026-10-10T10:00:00Z', member: { nombre: 'Ana', apellido: 'Ruiz' }, recipient: null, service: null }], service_checklists: checklists, service_checklist_items: checkItems, service_schedule_items: sched, service_notes: notes, team_sections: [], organization_members: [{ person_id: 'm1', organization_id: ORG, role: 'owner', created_at: '2026-01-01' }] }
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input.url || String(input))
    if (url.includes('placeholder.supabase.co')) {
      const u = new URL(url)
      if (u.pathname.includes('/auth/v1/user')) return j({ id: 'u1', email: 'ana@ejemplo.test', aud: 'authenticated', app_metadata: {}, user_metadata: {} })
      if (u.pathname.includes('/rpc/is_org_admin') || u.pathname.includes('/rpc/is_org_owner') || u.pathname.includes('/rpc/is_any_team_leader')) return j(true)
      if (u.pathname.includes('/rpc/')) return j([])
      const t = (u.pathname.split('/rest/v1/')[1] || '').split('/')[0]
      if (t === 'services' && u.searchParams.get('select') === '*' && !u.searchParams.has('id')) {
        if (L('__error') === '1') return j({ message: 'boom' }, 500)
        if (L('__lento') === '1') await new Promise(r => setTimeout(r, 25000))
      }
      // escrituras (upsert) de la nómina y de los cupos: se guardan en memoria para que la recarga del servicio devuelva lo escrito
      // crear un servicio (insert + select + single): se guarda en memoria y se devuelve la fila nueva
      if (t === 'services' && init && init.method === 'POST') {
        try { const b = JSON.parse(init.body); const fila = { id: 'nuevo-' + Date.now(), tipo: 'servicio', organization_id: ORG, created_at: '2026-10-21', ...(Array.isArray(b) ? b[0] : b) }; tabla.services.push(fila); return j(fila) } catch { return j({}, 400) }
      }
      if ((t === 'banda_assignments' || t === 'service_position_slots') && init && init.method && init.method !== 'GET') {
        try { const b = JSON.parse(init.body); const fila = Array.isArray(b) ? b[0] : b
          const i = tabla[t].findIndex(r => r.service_id === fila.service_id && r.team_position_id === fila.team_position_id && (t === 'service_position_slots' || (r.slot_index ?? 1) === (fila.slot_index ?? 1)))
          if (i >= 0) tabla[t][i] = { ...tabla[t][i], ...fila }; else tabla[t].push({ id: t + '-' + tabla[t].length + '-' + Date.now(), ...fila }) } catch {}
        return j([])
      }
      if (t && tabla[t]) {
        let rows = tabla[t].slice()
        for (const [k, v] of u.searchParams.entries()) { if (['select','order','limit'].includes(k)) continue
          if (v.startsWith('eq.')) rows = rows.filter(r => String(r[k]) === v.slice(3))
          else if (v.startsWith('in.(')) { const ids = v.slice(4, -1).split(','); rows = rows.filter(r => ids.includes(String(r[k]))) } }
        const sel = u.searchParams.get('select') || ''
        if (t === 'services') rows.sort((x, y) => x.fecha.localeCompare(y.fecha))
        if (t === 'service_blocks') rows = rows.sort((x, y) => x.orden - y.orden).map(r => ({ ...r, song: songs.find(s => s.id === r.song_id) || null, lead: members.find(m => m.id === r.lead_id) || null }))
        if (t === 'banda_assignments') rows = rows.map(r => ({ ...r, member: members.find(m => m.id === r.member_id) || null, team_position: positions.find(p => p.id === r.team_position_id) || null }))
        if (t === 'invitations' && sel.includes('member:members')) rows = rows.map(r => ({ ...r, member: members.find(m => m.id === r.member_id) || null }))
        if (t === 'team_members' && sel.includes('member:members')) rows = rows.map(r => ({ ...r, member: members.find(m => m.id === r.member_id) }))
        const unico = ((init && init.headers && JSON.stringify(init.headers)) || '').includes('vnd.pgrst.object')
        return j(unico ? (rows[0] || null) : rows)
      }
      if (u.pathname.includes('/rest/v1/')) return j([])
      return j({})
    }
    if (url.startsWith('/api/portal/preferencias')) return j({ theme: null, chart: {} })
    if (url.startsWith('/api/service-blocks')) { const id = new URL(url, 'http://x').searchParams.get('serviceId'); return j({ blocks: blocks.filter(x => x.service_id === id).map(r => ({ ...r, song: songs.find(s => s.id === r.song_id) || null, lead: members.find(m => m.id === r.lead_id) || null })) }) }
    return original(input, init)
  } })()`
module.exports = { MOCK, SESION }
