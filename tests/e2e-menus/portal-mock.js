// Portal del músico simulado (Inicio / Servicios): servicios con fechas relativas a hoy (Chile), convocatorias de dos equipos, un ensayo, un día bloqueado, favoritas y un cumpleaños de la semana. Interruptores en localStorage: __sinbiblioteca=1, __sinfav=1, __sincumple=1, __vacio=1.
exports.SESION = () => 'x'
exports.MOCK = `(() => {
  const L = (k, d = '') => { try { const v = localStorage.getItem(k); return v === null ? d : v } catch { return d } }
  const j = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json' } })
  const original = window.fetch.bind(window)
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' })
  const diaChile = n => { const [y, m, d] = f.format(new Date()).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10) }
  const dow = iso => (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7
  const sv = (id, n, extra = {}) => ({ id, fecha: diaChile(n), tipo: 'servicio', titulo: 'Servicio Ancora — x', hora_inicio: '10:00:00', hora_fin: '14:00:00', lugar: 'Templo', ...extra })
  const tA = { id: 'tA', name: 'Alabanza', color: 'rosa' }, tM = { id: 'tM', name: 'Montaje', color: 'turquesa' }
  const inv = (id, status, extra = {}) => ({ id, status, token: 't' + id, sent_at: '2026-01-01', needs_reassignment_confirm: false, declined_reason: null, ...extra })
  const tarjeta = (s, team, i, pos) => ({ service: s, team, posiciones: pos, invitation: i, reemplazadaPor: null, cerrada: false, banda: [], setlist: [], nominaSent: true })
  const S1 = sv('s1', 4), S2 = sv('s2', 11), E1 = sv('e1', 2, { tipo: 'ensayo', titulo: 'Ensayo', hora_inicio: '19:30:00', hora_fin: '21:00:00' }), S3 = sv('s3', 18)
  const servicios = L('__vacio') === '1' ? [] : [tarjeta(S1, tA, inv('i1', 'pendiente'), ['Voces']), tarjeta(S2, tA, inv('i2', 'confirmado'), ['Voces']), tarjeta(S3, tM, inv('i3', 'pendiente'), ['Montaje'])]
  const ensayos = L('__vacio') === '1' ? [] : [tarjeta(E1, tA, inv('i4', 'confirmado'), ['Voces'])]
  const hoy = diaChile(0), manana = diaChile(1), cumple = dow(manana) > dow(hoy) ? manana : hoy
  const cumpleanos = L('__sincumple') === '1' ? [] : [{ id: 'c1', nombre: 'Beto', apellido: null, avatar_url: null, dia: +cumple.slice(8), mes: +cumple.slice(5, 7), enDias: cumple === hoy ? 0 : 1 }]
  const songs = [['sg1', 'Cuán grande es Él', 'G', 72], ['sg2', 'Sublime gracia', 'D', 68], ['sg3', 'Tú eres roca', 'A', null], ['sg4', 'Otra canción', 'C', 80]].map(([id, nombre, t, b]) => ({ id, nombre, artista: 'Artista', tono_original: t, bpm: b }))
  window.fetch = async (input, init) => {
    const u = typeof input === 'string' ? input : (input.url || String(input)), m = ((init && init.method) || 'GET').toUpperCase()
    if (u.startsWith('/api/portal/me')) return j({ member: { id: 'm1', nombre: 'Claudia', apellido: 'Ruiz', email: "c@x.cl" }, services: servicios, ensayos, equipos: [{ ...tA, posiciones: ['Voces'] }, { ...tM, posiciones: ['Montaje'] }], libraryAccess: L('__sinbiblioteca') !== '1', administracion: null, cumpleanos })
    if (u.startsWith('/api/all-services')) return j({ services: L('__vacio') === '1' ? [] : [S1, S2, E1, S3] })
    if (u.startsWith('/api/all-songs')) return j({ songs })
    if (u.startsWith('/api/portal/favoritos')) return j({ songIds: L('__sinfav') === '1' ? [] : ['sg1', 'sg2', 'sg3'] })
    if (u.startsWith('/api/portal/bloqueos')) return j({ blocks: [{ id: 'b1', blocked_date: diaChile(1), team_id: 'tA', member_id: 'm1' }], teams: [tA, tM] })
    if (u.startsWith('/api/portal/cancion?')) return j({ song: { id: 'sg1', nombre: 'Cuán grande es Él', original_title: 'How Great Is Our God', autor: 'Chris Tomlin', traductor: 'Ana Ruiz', ccli: '4348399', copyright: '© 2004 Alletrop Music', letra: 'VERSO 1:\\nEl esplendor de un rey\\nvestido en majestad\\nla tierra alegre está\\n\\nCORO:\\nCuán grande es Él\\ncuán grande es Él\\ncantará mi corazón\\n\\nVERSO 2:\\nDía a día él nos da\\nsu luz y su verdad' }, adjuntos: [], audios: [] })
    if (u.startsWith('/api/portal/')) return j({ ok: true })
    return original(input, init)
  }
})()`
