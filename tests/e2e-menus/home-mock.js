// «Supabase» falso dentro de la página para /home: sesión de Google simulada (cookie), rol por localStorage.__rol (admin | lider | ninguno) y datos con fechas RELATIVAS a hoy en Chile.
const SESION = () => JSON.stringify({ access_token: 'a.b.c', refresh_token: 'r', token_type: 'bearer', expires_in: 99999, expires_at: Math.floor(Date.now() / 1000) + 99999, user: { id: 'u1', aud: 'authenticated', email: 'ana@ejemplo.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01' } })
const MOCK = `(() => {
  /* RELOJ FIJO: lunes 19 de octubre de 2026, 12:00 en Chile */
  const RD = Date, T = new RD('2026-10-19T15:00:00Z').getTime(); window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(T) } static now() { return T } }
  const original = window.fetch.bind(window)
  const rol = () => { try { return localStorage.getItem('__rol') } catch { return null } }
  const j = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/*' } })
  const ORG = '00000000-0000-0000-0000-000000000001'
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' })
  const dia = n => { const [y, m, d] = fmt.format(new Date()).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10) }
  const nac = (n, anio) => anio + dia(n).slice(4)
  const N = [['m1','Ana','Mora',nac(0,1990)],['m2','Juan','Pérez',nac(3,1985)],['m3','María','Castro',nac(10,1992)],['m4','Pedro','Soto',nac(20,1980)],['m5','Luis','Muñoz',null],['m6','Sofía','Vera',nac(25,1999)],['m7','Tomás','Paz',null],['m8','Valentina','Rojas',nac(40,1995)],['m9','Sin','Equipo',null]]
  const members = N.map(([id,nombre,apellido,fecha_nacimiento]) => ({ id, nombre, apellido, fecha_nacimiento, email: id+'@ejemplo.test', organization_id: ORG, avatar_url: null, instalado_pwa_at: null, last_seen: null }))
  members[0].email = 'ana@ejemplo.test'
  const teams = [{ id:'t1', organization_id: ORG, name:'Alabanza', sort_order:1, archived_at:null, color:'cobalto' }, { id:'t2', organization_id: ORG, name:'Producción', sort_order:2, archived_at:null, color:'naranja' }, { id:'t3', organization_id: ORG, name:'Bienvenida', sort_order:3, archived_at:null, color:'turquesa' }]
  const positions = [['p1','t1','Voz principal','VX1'],['p2','t1','Coros','VX2'],['p3','t1','Guitarra acústica','AG1'],['p4','t1','Bajo','BA'],['p5','t2','Sonido','SON'],['p6','t3','Recepción','REC']].map(([id,team_id,name,code],i) => ({ id, team_id, organization_id: ORG, name, code, sort_order:i, archived_at:null, default_slots:1 }))
  const tm = [['x1','m1','t1',true],['x2','m2','t1',false],['x3','m3','t1',false],['x4','m4','t1',true],['x5','m5','t1',false],['x6','m6','t2',false],['x7','m7','t2',true],['x8','m8','t3',false],['x9','m5','t2',false]].map(([id,member_id,team_id,is_leader]) => ({ id, member_id, team_id, is_leader, organization_id: ORG }))
  const links = [['x1','p1'],['x2','p2'],['x3','p2'],['x4','p3'],['x5','p4'],['x6','p5'],['x7','p5'],['x8','p6']].map(([team_member_id,team_position_id]) => ({ team_member_id, team_position_id }))
  const sv = (id, n, extra = {}) => ({ id, fecha: dia(n), titulo: 'Servicio ' + id, hora_inicio: '10:00:00', hora_fin: '14:00:00', tipo: 'servicio', kind: 'service', organization_id: ORG, created_at: '2026-01-01', ...extra })
  const services = [sv('past', -7), sv('s1', 6), sv('s2', 13), sv('s3', 20), sv('ens', 8, { tipo: 'ensayo', kind: 'rehearsal', titulo: 'Ensayo' })]
  const inv = (service_id, member_id, team_id, status, extra = {}) => ({ id: service_id+member_id+team_id, service_id, member_id, team_id, status, declined_reason: null, superseded_by: null, sent_at: '2026-10-01', token: 'tk'+member_id, created_at: '2026-10-01', ...extra })
  const invitations = [inv('s1','m1','t1','confirmado'), inv('s1','m2','t1','confirmado'), inv('s1','m3','t1','pendiente'), inv('s1','m4','t1','declinado'), inv('s1','m6','t2','confirmado'), inv('s1','m7','t2','pendiente'), inv('s2','m1','t1','pendiente'), inv('s2','m2','t1','pendiente', { sent_at: null }), inv('past','m1','t1','confirmado'), inv('past','m2','t1','confirmado'), inv('past','m6','t2','declinado'), inv('past','m3','t1','confirmado'), inv('past','m4','t1','confirmado'), inv('past','m7','t2','confirmado')]
  const b = (service_id, team_position_id, member_id, slot_index = 1) => ({ id: service_id+team_position_id+slot_index, service_id, team_position_id, member_id, slot_index, posicion: null })
  const banda = [b('s1','p1','m1'), b('s1','p2','m2'), b('s1','p2','m3',2), b('s1','p3','m4'), b('s1','p5','m6'), b('s1','p5','m7',2), b('s2','p1','m1'), b('s2','p2','m2'), b('past','p1','m1'), b('past','p2','m2'), b('past','p5','m6'), b('past','p2','m3',2), b('past','p3','m4'), b('past','p5','m7',2)]
  const slots = [{ service_id:'s1', team_position_id:'p2', slots_needed:2 }, { service_id:'s1', team_position_id:'p5', slots_needed:2 }, { service_id:'s1', team_position_id:'p4', slots_needed:1 }]
  const bloqueos = [{ member_id:'m3', team_id:'t1', blocked_date: dia(2), reason: null }, { member_id:'m6', team_id:'t2', blocked_date: dia(2), reason: null }, { member_id:'m2', team_id:'t1', blocked_date: dia(9), reason: null }]
  const tabla = { members, teams, team_positions: positions, team_members: tm, team_member_positions: links, services, invitations, banda_assignments: banda, service_position_slots: slots, service_blocks: [], song_sections: [] }
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input.url || String(input))
    if (url.includes('placeholder.supabase.co')) {
      const u = new URL(url)
      if (u.pathname.includes('/auth/v1/user')) return j({ id: 'u1', email: 'ana@ejemplo.test', aud: 'authenticated', app_metadata: {}, user_metadata: {} })
      if (u.pathname.includes('/rpc/is_org_admin')) return j(rol() === 'admin')
      if (u.pathname.includes('/rpc/is_org_owner')) return j(rol() === 'admin')
      if (u.pathname.includes('/rpc/is_any_team_leader')) return j(rol() === 'lider' || rol() === 'admin')
      if (u.pathname.includes('/rpc/team_blocks_in_range')) return j(bloqueos)
      if (u.pathname.includes('/rpc/blocked_others_summary')) return j([])
      const m = [null, (u.pathname.split('/rest/v1/')[1] || '').split('/')[0]]
      if (m[1] && tabla[m[1]]) {
        let rows = tabla[m[1]].slice()
        for (const [k, v] of u.searchParams.entries()) { if (['select','order','limit'].includes(k)) continue
          if (v.startsWith('eq.')) rows = rows.filter(r => String(r[k]) === v.slice(3))
          else if (v.startsWith('in.(')) { const ids = v.slice(4, -1).split(','); rows = rows.filter(r => ids.includes(String(r[k]))) } }
        if (m[1] === 'members' && rol() === 'lider') { /* el líder lee a todos (la base hoy está abierta) */ }
        if (m[1] === 'services') rows.sort((x, y) => x.fecha.localeCompare(y.fecha))
        if (m[1] === 'team_members' && (u.searchParams.get('select') || '').includes('member:members')) rows = rows.map(r => ({ ...r, member: members.find(x => x.id === r.member_id) }))
        if (m[1] === 'banda_assignments' && (u.searchParams.get('select') || '').includes('member:members')) rows = rows.map(r => ({ ...r, member: members.find(x => x.id === r.member_id), team_position: positions.find(p => p.id === r.team_position_id) }))
        const unico = ((init && init.headers && JSON.stringify(init.headers)) || '').includes('vnd.pgrst.object')
        return j(unico ? (rows[0] || null) : rows)
      }
      if (u.pathname.includes('/rest/v1/') || u.pathname.includes('/rpc/')) return j([])
      return j({})
    }
    if (url.startsWith('/api/admin/servicios-resumen')) {
      const eq = (teamId, nombre, color, asignados, convocados, confirmados, sinResponder, vacantes, estado) => ({ teamId, nombre, color, asignados, convocados, confirmados, rechazos: convocados - confirmados - sinResponder, sinResponder, vacantes, estado })
      const rs = (id, n, extra, equipos) => ({ id, fecha: dia(n), titulo: 'Servicio ' + id, horaInicio: '10:00:00', horaFin: '14:00:00', tipo: 'servicio', terminado: false, equipos, ...extra })
      return j({ generado: new Date().toISOString(), servicios: [
        rs('s1', 6, {}, [eq('t1','Alabanza','cobalto',4,4,2,1,1,'convocado'), eq('t2','Producción','naranja',2,2,1,1,0,'convocado'), eq('t3','Bienvenida','turquesa',1,0,0,0,1,'sin-convocar')]),
        rs('ens', 8, { tipo: 'ensayo', titulo: 'Ensayo', horaInicio: '19:30:00', horaFin: '21:00:00' }, [eq('t1','Alabanza','cobalto',3,3,1,2,0,'convocado')]),
        rs('s2', 13, {}, [eq('t1','Alabanza','cobalto',2,1,0,1,1,'convocado')]),
        rs('s3', 20, {}, [eq('t1','Alabanza','cobalto',0,0,0,0,2,'sin-convocar')]),
        rs('past', -7, { terminado: true }, [eq('t1','Alabanza','cobalto',3,3,3,0,0,'convocado')])] })
    }
    if (url.startsWith('/api/portal/preferencias')) return j({ theme: null, chart: {} })
    return original(input, init)
  } })()`
module.exports = { MOCK, SESION }
