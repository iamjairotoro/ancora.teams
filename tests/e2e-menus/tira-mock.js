// La tira de días del Home (capturas y pruebas del flujo): el portal del músico (portal-mock) con /api/portal/bloqueos CON ESTADO (bloquear y quitar bloqueo cambian lo que devuelve el simulador, como la base) y el Home del administrador
// o del líder (homeadmin-mock) con las filas por equipo de team_blocks_in_range (la base ya recorta: con ?__lider=1 solo salen las del equipo que lidera, t1). Fechas relativas a hoy (Chile). Sin base real.
const portal = require('./portal-mock.js'), homeadmin = require('./homeadmin-mock.js')
const COMUN = `
  const L = (k, d = '') => { try { const v = localStorage.getItem(k); return v === null ? d : v } catch { return d } }
  const j = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json' } })
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' })
  const dia = n => { const [y, m, d] = f.format(new Date()).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10) }
  const original = window.fetch.bind(window)`
exports.SESION = portal.SESION
exports.PORTAL = portal.MOCK + `;(() => {${COMUN}
  const tA = { id: 'tA', name: 'Alabanza', color: 'rosa' }, tM = { id: 'tM', name: 'Montaje', color: 'turquesa' }
  const filas = L('__sinbloqueos') === '1' ? [] : [{ id: 'b1', blocked_date: dia(1), team_id: 'tA', member_id: 'm1', reason: 'Viaje' }, { id: 'b2', blocked_date: dia(11), team_id: null, member_id: 'm1', reason: 'Familia' }]
  const log = (window.__bloqueosLog = [])
  window.fetch = async (input, init) => {
    const u = typeof input === 'string' ? input : (input.url || String(input)), m = ((init && init.method) || 'GET').toUpperCase()
    if (u.startsWith('/api/portal/bloqueos')) {
      if (L('__bloqueoserror') === '1' && m === 'GET') return j({ error: 'x' }, 500)
      if (m === 'GET') return j({ blocks: filas, teams: [tA, tM] })
      const b = JSON.parse(init.body || '{}'); log.push({ m, b })
      if (L('__falla') === '1') return j({ error: 'No se pudo guardar el bloqueo' }, 500)
      for (let i = filas.length - 1; i >= 0; i--) if (filas[i].blocked_date === b.date) filas.splice(i, 1)
      if (m === 'POST') { filas.push({ id: 'n' + log.length, blocked_date: b.date, team_id: null, member_id: 'm1', reason: b.reason || null }); return j({ block: filas[filas.length - 1], blocks: filas.filter(x => x.blocked_date === b.date) }) }
      return j({ ok: true })
    }
    return original(input, init)
  }
})()`
exports.ADMIN = homeadmin.MOCK + `;(() => {${COMUN}
  const lider = new URLSearchParams(location.search).get('__lider') === '1'
  const filas = L('__sinbloqueos') === '1' ? [] : [
    { member_id: 'm2', team_id: 't1', blocked_date: dia(4), reason: 'Trabajo' }, { member_id: 'm5', team_id: 't1', blocked_date: dia(4), reason: null }, { member_id: 'm5', team_id: 't2', blocked_date: dia(4), reason: null },
    { member_id: 'm6', team_id: 't2', blocked_date: dia(4), reason: 'Familia' }, { member_id: 'm3', team_id: 't1', blocked_date: dia(2), reason: 'Viaje' }, { member_id: 'm4', team_id: 't1', blocked_date: dia(7), reason: 'Estudios' }]
  window.fetch = async (input, init) => {
    const u = typeof input === 'string' ? input : (input.url || String(input))
    if (u.includes('placeholder.supabase.co') && u.includes('/rpc/team_blocks_in_range')) return j(lider ? filas.filter(x => x.team_id === 't1') : filas)
    return original(input, init)
  }
})()`
