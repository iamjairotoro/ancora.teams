// Portal del músico simulado (Inicio / Servicios): servicios con fechas relativas a hoy (Chile), convocatorias de dos equipos, un ensayo, un día bloqueado, favoritas y un cumpleaños de la semana. Interruptores en localStorage: __sinbiblioteca=1, __sinfav=1, __sincumple=1, __vacio=1, __modo=admin|lider (botón «Modo Admin» / «Modo Líder»).
exports.SESION = () => 'x'
exports.MOCK = `(() => {
  const L = (k, d = '') => { try { const v = localStorage.getItem(k); return v === null ? d : v } catch { return d } }
  const j = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json' } })
  const original = window.fetch.bind(window)
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' })
  const diaChile = n => { const [y, m, d] = f.format(new Date()).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10) }
  const dow = iso => (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7
  const sv = (id, n, extra = {}) => ({ id, fecha: diaChile(n), tipo: 'servicio', titulo: 'Servicio Ancora — x', hora_inicio: '10:00:00', hora_fin: '14:00:00', lugar: 'Templo', ...extra })
  const tA = { id: 'tA', name: 'Alabanza', color: 'rosa' }, tM = { id: 'tM', name: 'Montaje', color: 'turquesa' }, tP = { id: 'tP', name: 'Producción', color: 'cobalto' }
  const inv = (id, status, extra = {}) => ({ id, status, token: 't' + id, sent_at: '2026-01-01', needs_reassignment_confirm: false, declined_reason: null, ...extra })
  const tarjeta = (s, team, i, pos) => ({ service: s, team, posiciones: pos, invitation: i, reemplazadaPor: null, cerrada: false, banda: [], setlist: [], nominaSent: true })
  const b = (id, n, ap, pos, sec, so, po, est, team = tA) => ({ member_id: id, member: { nombre: n, apellido: ap, avatar_url: null }, posicion: pos, teamId: team.id, teamName: team.name, teamColor: team.color, seccion: sec, seccionOrden: so, posOrden: po, estado: est })
  const bandaS2 = [b('m1', 'Claudia', 'Ruiz', 'Voz', 'Voces', 0, 0, 'confirmo'), b('m5', 'Manuel', 'Burgos', 'Voz', 'Voces', 0, 1, 'sin-confirmar'), b('m6', 'pepe', 'diaz', 'Coro', 'Voces', 0, 2, 'sin-confirmar'), b('m7', 'Ana', 'Contreras', 'Guitarra eléctrica', 'Banda', 1, 0, 'confirmo'), b('m8', 'Jairo', 'Toro', 'Bass', 'Banda', 1, 1, 'confirmo'), b('m9', 'Luis', 'Mora', 'Cámara', 'Cámaras', 5, 0, 'confirmo', tM), b('m10', 'Eva', 'Sol', 'Luces', 'Cámaras', 5, 1, 'sin-confirmar', tM)]
  const vacS2 = [{ teamId: 'tA', teamName: 'Alabanza', teamColor: 'rosa', posicion: 'Keys', seccion: 'Banda', seccionOrden: 1, posOrden: 3 }, { teamId: 'tA', teamName: 'Alabanza', teamColor: 'rosa', posicion: 'Drums', seccion: 'Banda', seccionOrden: 1, posOrden: 4 }]
  const bl = (o, id, nombre, art, tono, bpm, lead, notas) => ({ id: 'b' + o, orden: o, tipo: 'cancion', titulo: nombre, tono, song_id: id, lead_id: lead ? lead[0] : null, lead_es_yo: !!lead && lead[0] === 'm1', lead: lead ? { nombre: lead[1] } : null, notas: notas || null, song: { id, nombre, artista: art, bpm } })
  const setlistS2 = [bl(1, 'sg1', 'All Hail King Jesus', 'Bethel Music', 'G', 72, ['m2', 'Claudia Coilla'], 'Entrar solo con piano. Repetir el coro dos veces.'), bl(2, 'sg2', 'Cornerstone', 'Hillsong Worship', 'C', 71.5, ['m1', 'Claudia Ruiz']), bl(3, 'sg3', 'Great Are You Lord', 'All Sons & Daughters', 'A', 72, ['m5', 'Manuel Burgos'], 'Cierre en silencio, sin banda.'), bl(4, 'sg4', 'Otra canción', '', null, null, null)]
  const sinBib = sl => L('__sinbiblioteca') === '1' ? sl.map(({ lead_id, ...r }) => ({ ...r, song: r.song && { id: r.song.id, nombre: r.song.nombre, artista: r.song.artista } })) : sl      // como el servidor: sin biblioteca no viaja el BPM ni lead_id
  const S1 = sv('s1', 4), S2 = sv('s2', 11), E1 = sv('e1', 2, { tipo: 'ensayo', titulo: 'Ensayo', hora_inicio: '19:30:00', hora_fin: '21:00:00' }), S3 = sv('s3', 18)
  // __doble=1: convocado a DOS equipos en el mismo servicio (Alabanza · Bass y Producción · Sonido), las dos sin responder (punto 4: «Convocado a dos equipos»)
  const doble = L('__doble') === '1'
  const servicios = L('__vacio') === '1' ? [] : [tarjeta(S1, tA, inv('i1', 'pendiente'), [doble ? 'Bass' : 'Voces']), ...(doble ? [tarjeta(S1, tP, inv('i1b', 'pendiente'), ['Sonido'])] : []), { ...tarjeta(S2, tA, inv('i2', 'confirmado'), ['Voz']), banda: bandaS2, vacantes: vacS2, setlist: sinBib(setlistS2) }, tarjeta(S3, tM, inv('i3', 'pendiente'), ['Montaje'])]
  const ensayos = L('__vacio') === '1' ? [] : [tarjeta(E1, tA, inv('i4', 'confirmado'), ['Voces'])]
  const hoy = diaChile(0), manana = diaChile(1), cumple = dow(manana) > dow(hoy) ? manana : hoy
  const cumpleanos = L('__sincumple') === '1' ? [] : [{ id: 'c1', nombre: 'Beto', apellido: null, avatar_url: null, dia: +cumple.slice(8), mes: +cumple.slice(5, 7), enDias: cumple === hoy ? 0 : 1 }]
  const songs = [['sg1', 'Cuán grande es Él', 'G', 72], ['sg2', 'Sublime gracia', 'D', 68], ['sg3', 'Tú eres roca', 'A', null], ['sg4', 'Otra canción', 'C', 80]].map(([id, nombre, t, b]) => ({ id, nombre, artista: 'Artista', tono_original: t, bpm: b }))
  window.fetch = async (input, init) => {
    const u = typeof input === 'string' ? input : (input.url || String(input)), m = ((init && init.method) || 'GET').toUpperCase()
    // «Confirmo» / «No puedo» (con la regla de la base 037c): confirmar declina las PENDIENTES del mismo servicio que chocan, con motivo «conflict» y el equipo por el que se declinaron
    if (u.startsWith('/api/confirm-rsvp') && m === 'POST') {
      const b = JSON.parse(init.body), e = servicios.find(x => x.invitation && x.invitation.token === b.token)
      if (!e) return j({ error: 'Invitación no encontrada' }, 404)
      if (b.respuesta === 'si') { e.invitation = { ...e.invitation, status: 'confirmado', declined_reason: null }; e.reemplazadaPor = null
        servicios.filter(x => x !== e && x.service.id === e.service.id && x.invitation && x.invitation.status === 'pendiente').forEach(x => { x.invitation = { ...x.invitation, status: 'declinado', declined_reason: 'conflict' }; x.reemplazadaPor = { id: e.team.id, name: e.team.name } }) }
      else e.invitation = { ...e.invitation, status: 'declinado', declined_reason: null }
      return j({ ok: true })
    }
    if (u.startsWith('/api/portal/me')) return j({ member: { id: 'm1', nombre: 'Claudia', apellido: 'Ruiz', email: "c@x.cl" }, services: servicios, ensayos, equipos: [{ ...tA, posiciones: ['Voces'] }, { ...tM, posiciones: ['Montaje'] }], libraryAccess: L('__sinbiblioteca') !== '1', administracion: L('__modo') === 'admin' ? { destino: '/admin', rol: 'admin' } : L('__modo') === 'lider' ? { destino: '/home', rol: 'lider' } : null, cumpleanos })
    if (u.startsWith('/api/all-services')) return j({ services: L('__vacio') === '1' ? [] : [S1, S2, E1, S3] })
    if (u.startsWith('/api/all-songs')) return j({ songs })
    if (u.startsWith('/api/portal/favoritos')) return j({ songIds: L('__sinfav') === '1' ? [] : ['sg1', 'sg2', 'sg3'] })
    if (u.startsWith('/api/portal/bloqueos')) return j({ blocks: [{ id: 'b1', blocked_date: diaChile(1), team_id: 'tA', member_id: 'm1' }], teams: [tA, tM] })
    if (u.startsWith('/api/portal/cancion?')) return j({ song: { id: 'sg1', nombre: 'Cuán grande es Él', original_title: 'How Great Is Our God', autor: 'Chris Tomlin', traductor: 'Ana Ruiz', ccli: '4348399', copyright: '© 2004 Alletrop Music', letra: 'VERSO 1:\\nEl esplendor de un rey\\nvestido en majestad\\nla tierra alegre está\\n\\nCORO:\\nCuán grande es Él\\ncuán grande es Él\\ncantará mi corazón\\n\\nVERSO 2:\\nDía a día él nos da\\nsu luz y su verdad' }, adjuntos: [], audios: [] })
    if (u.startsWith('/api/portal/')) return j({ ok: true })
    return original(input, init)
  }
})()`
