// El admin simulado (inv5-mock) + el resumen de servicios por equipo con fechas relativas a hoy: próximo servicio con Alabanza 2/5 (5 convocados), Producción 3/3 (3 convocados), Logística y Montaje; un ensayo y servicios siguientes. Interruptores: __sinresumen=1 (sin servicios), __resumenerror=1.
const inv5 = require('./inv5-mock.js')
exports.SESION = inv5.SESION
exports.MOCK = inv5.MOCK + `;(() => {
  const L = (k, d = '') => { try { const v = localStorage.getItem(k); return v === null ? d : v } catch { return d } }
  const j = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json' } })
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' })
  const dia = n => { const [y, m, d] = f.format(new Date()).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10) }
  const eq = (teamId, nombre, color, o = {}) => ({ teamId, nombre, color, asignados: 0, convocados: 0, confirmados: 0, rechazos: 0, sinResponder: 0, vacantes: 0, estado: 'convocado', ...o })
  const sv = (id, n, equipos, o = {}) => ({ id, fecha: dia(n), titulo: 'Servicio Ancora', horaInicio: '10:00:00', horaFin: '14:00:00', tipo: 'servicio', terminado: false, equipos, ...o })
  const servicios = L('__sinresumen') === '1' ? [] : [
    sv('r1', 2, [eq('t1', 'Alabanza', 'rosa', { asignados: 3, convocados: 3, confirmados: 1, sinResponder: 2 })], { tipo: 'ensayo', titulo: 'Ensayo', horaInicio: '19:30:00', horaFin: '21:00:00' }),
    sv('p', 4, [eq('t1', 'Alabanza', 'rosa', { asignados: 2, vacantes: 3, convocados: 5, confirmados: 0, sinResponder: 5 }), eq('t2', 'Producción', 'cobalto', { asignados: 3, vacantes: 0, convocados: 3, confirmados: 0, sinResponder: 3 }), eq('t3', 'Logística', 'violeta', { asignados: 3, vacantes: 0, estado: 'sin-convocar' }), eq('t4', 'Montaje', 'turquesa', { asignados: 2, vacantes: 0, estado: 'sin-convocar' })]),
    sv('q', 11, [eq('t1', 'Alabanza', 'rosa', { estado: 'sin-convocar', vacantes: 3 }), eq('t2', 'Producción', 'cobalto', { estado: 'sin-convocar', vacantes: 2 }), eq('t3', 'Logística', 'violeta', { estado: 'sin-convocar', vacantes: 2 })]),
    sv('s', 18, [])]
  const original = window.fetch.bind(window)
  window.fetch = async (input, init) => { const u = typeof input === 'string' ? input : (input.url || String(input)); if (u.startsWith('/api/admin/servicios-resumen')) return L('__resumenerror') === '1' ? j({ error: 'x' }, 500) : j({ generado: 'x', servicios }); return original(input, init) }
})()`
