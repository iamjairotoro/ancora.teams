// Banco de pruebas del servidor del portal (punto 54). Sin dependencias nuevas: usa el `typescript` del proyecto para leer los .ts tal cual, y un emulador MÍNIMO de
// PostgREST (filtros eq/in/not, order, range, proyección de columnas, relaciones y el tope de 1000 filas por respuesta) en lugar de la base. DATOS INVENTADOS: ninguna
// persona real, ninguna clave, ninguna URL. Los textos «SECRETO_…» solo existen para comprobar que NO salen.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs'), Module = require('module')
const RAIZ = path.resolve(__dirname, '..', '..')
const ts = require(path.join(RAIZ, 'node_modules', 'typescript'))

// ── leer .ts y resolver «@/…» ──
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true } }).outputText, file)
const resolver = base => { for (const c of [base + '.ts', path.join(base, 'index.ts'), base + '.js']) if (fs.existsSync(c)) return c; throw new Error('no existe ' + base) }

// ── la «base» ──
const U = i => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const ID = { ME: U(1), O1: U(2), O2: U(3), TA: U(20), TT: U(21), TB: U(22), P1: U(30), P2: U(31), P3: U(32), SG1: U(40), SG2: U(41) }
const S = k => U(100 + k)
const db = {}
const REL = { invitations: { team: ['teams', 'team_id'], service: ['services', 'service_id'], member: ['members', 'member_id'] },
  banda_assignments: { team_position: ['team_positions', 'team_position_id'], member: ['members', 'member_id'], service: ['services', 'service_id'] },
  team_positions: { teams: ['teams', 'team_id'] }, service_blocks: { song: ['songs', 'song_id'], lead: ['members', 'lead_id'] } }
const partir = s => { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = '' } else cur += ch } if (cur.trim()) out.push(cur.trim()); return out }
function proyectar(tabla, fila, sel) {
  if (!fila) return null; const out = {}
  for (const it of partir(sel)) {
    if (it === '*') { Object.assign(out, fila); continue }
    const m = it.match(/^(?:(\w+):)?(\w+)\(([\s\S]*)\)$/)
    if (m) { const clave = m[1] || m[2], def = REL[tabla] && REL[tabla][clave]; assert.ok(def, `relación desconocida ${tabla}.${clave}`); const [t2, fk] = def; out[clave] = proyectar(t2, db[t2].find(r => r.id === fila[fk]), m[3]) } else out[it] = fila[it]
  }
  return out
}
const TOPE = 1000      // tope de filas por respuesta de PostgREST (Supabase): sin .range() la respuesta se corta aquí
const estado = { consultas: 0, acceso: true }
const from = tabla => { estado.consultas++; const f = []; let sel = '*', unico = false, ordenes = [], rango = null
  const api = { select(s) { sel = s || '*'; return api }, eq(c, v) { f.push(r => r[c] === v); return api }, in(c, vs) { f.push(r => vs.includes(r[c])); return api },
    not(c, op, v) { assert.equal(op, 'is'); f.push(r => (v === null ? r[c] != null : r[c] !== v)); return api }, order(c) { ordenes.push(c); return api }, range(a, b) { rango = [a, b]; return api },
    single() { unico = true; return api }, maybeSingle() { unico = true; return api },
    then(res, rej) { let rows = (db[tabla] || []).filter(r => f.every(x => x(r)))
      if (ordenes.length) rows = rows.slice().sort((a, b) => { for (const c of ordenes) { if (a[c] > b[c]) return 1; if (a[c] < b[c]) return -1 } return 0 })
      rows = rango ? rows.slice(rango[0], Math.min(rango[1] + 1, rango[0] + TOPE)) : rows.slice(0, TOPE)
      const data = unico ? (rows[0] ? proyectar(tabla, rows[0], sel) : null) : rows.map(r => proyectar(tabla, r, sel)); return Promise.resolve({ data, error: null }).then(res, rej) } }
  return api }

// ── las rutas, con lo de afuera simulado ──
const json = (b, init) => ({ status: (init && init.status) || 200, body: JSON.parse(JSON.stringify(b)) })
const stubs = { 'next/server': { NextResponse: { json }, NextRequest: class {} }, 'server-only': {}, '@/lib/supabase/admin': { createAdminSupabase: () => ({ from }) },
  '@/lib/auth/libraryAccess': { libraryAccessOrFalse: async () => estado.acceso }, '@/lib/auth/requirePortalIdentity': { requirePortalIdentity: async () => ({ ok: true, identity: { memberId: ID.ME } }) },
  '@/lib/auth/secrets': { newSecret: () => 's' }, '@/lib/portal/rsvp': { isToken: v => typeof v === 'string' && v.length > 0 } }
const origLoad = Module._load, origResolve = Module._resolveFilename
Module._load = function (req, ...r) { return stubs[req] || origLoad.call(this, req, ...r) }
Module._resolveFilename = function (req, ...r) { return req.startsWith('@/') ? resolver(path.join(RAIZ, req.slice(2))) : origResolve.call(this, req, ...r) }
const me = require(path.join(RAIZ, 'app/api/portal/me/route.ts')), mp = require(path.join(RAIZ, 'app/api/member-portal/route.ts'))
const TOKEN_ENLACE = 'tok1'      // la invitación i1 de la persona de prueba
const llamar = async (modo) => { estado.consultas = 0; const r = modo === 'me' ? await me.GET({}) : await mp.GET({ nextUrl: { searchParams: new URLSearchParams('token=' + TOKEN_ENLACE) } }); return { ...r, consultas: estado.consultas } }

function mundo() {
  const { ME, O1, O2, TA, TT, TB, P1, P2, P3, SG1, SG2 } = ID
  db.members = [{ id: ME, nombre: 'Ana', apellido: 'Prueba', email: 'ana@ejemplo.test', instrumentos: [] }, { id: O1, nombre: 'Beto', apellido: 'Prueba' }, { id: O2, nombre: 'Cami', apellido: 'Prueba' }]
  db.teams = [{ id: TA, name: 'Alabanza', color: 'cobalto' }, { id: TT, name: 'Técnica', color: 'rosa' }, { id: TB, name: 'Bienvenida', color: null }]
  db.team_positions = [{ id: P1, name: 'Bajo', team_id: TA }, { id: P2, name: 'Teclado', team_id: TT }, { id: P3, name: 'Recepción', team_id: TB }]
  db.songs = [
    { id: SG1, nombre: 'Canción Uno', artista: 'Artista A', tono_original: 'SECRETO_TONO_ORIGINAL', bpm: 987654, compas: 'SECRETO_COMPAS', link_spotify: 'SECRETO_LINK_YOUTUBE', link_letras: 'SECRETO_LINK_LETRAS', link_recursos: 'SECRETO_LINK_RECURSOS',
      duracion_min: 5, notas: 'SECRETO_NOTAS_DE_LA_CANCION', caratula_url: 'SECRETO_CARATULA', letra: 'SECRETA_LETRA', spotify_url: 'SECRETO_SPOTIFY_URL', apple_music_url: 'SECRETO_APPLE' },
    { id: SG2, nombre: 'Canción Dos', artista: 'Artista B', tono_original: 'SECRETO_TONO_ORIGINAL_2', bpm: 123456, compas: 'SECRETO_COMPAS_2', link_spotify: 'SECRETO_LINK_YOUTUBE_2', link_letras: 'SECRETO_LINK_LETRAS_2', link_recursos: 'SECRETO_LINK_RECURSOS_2',
      duracion_min: 4, notas: 'SECRETO_NOTAS_DE_LA_CANCION_2', caratula_url: 'SECRETO_CARATULA_2', letra: 'SECRETA_LETRA_2', spotify_url: null }]
  const svc = (k, fecha, tipo = 'servicio') => ({ id: S(k), fecha, tipo, titulo: 'S' + k, hora_inicio: '10:00:00', hora_fin: '12:00:00', lugar: 'Templo' })
  // 2099 = abierto siempre; 2020 = cerrado siempre (la prueba no depende del reloj)
  db.services = [svc(9, '2020-01-05'), svc(1, '2099-01-04'), svc(2, '2099-01-11'), svc(3, '2099-01-18'), svc(4, '2099-01-25'), svc(5, '2099-03-01'), svc(6, '2099-02-01', 'ensayo'), svc(7, '2099-02-08', 'ensayo')]
  let n = 0; const bid = () => 'b' + (++n)
  const asig = (k, m, pos, slot = 1) => ({ id: bid(), service_id: S(k), member_id: m, posicion: null, team_position_id: pos, slot_index: slot })
  db.banda_assignments = [asig(1, ME, P1), asig(1, ME, P2), asig(1, O1, P1, 2), asig(1, O2, P3), asig(2, ME, P1), asig(2, O1, P1, 2), asig(4, ME, P1), asig(9, ME, P1), asig(5, O1, P1), asig(1, null, P2, 2)]
  let i = 0
  const inv = (k, m, team, status, extra = {}) => ({ id: 'i' + (++i), service_id: S(k), member_id: m, team_id: team, token: 'tok' + i, status, sent_at: '2026-10-01', comentario: null, needs_reassignment_confirm: false, declined_reason: null, superseded_by: null, responded_at: null, ...extra })
  db.invitations = [inv(1, ME, TA, 'confirmado'), inv(1, ME, TT, 'declinado', { declined_reason: 'conflict', superseded_by: 'i1' }), inv(1, ME, TB, 'pendiente'), inv(1, O1, TA, 'confirmado'),
    inv(2, ME, TA, 'pendiente'), inv(3, O1, TA, 'confirmado'), inv(4, ME, TA, 'pendiente', { sent_at: null }), inv(6, ME, null, 'confirmado'), inv(7, ME, null, 'pendiente'), inv(7, O1, null, 'pendiente'),
    inv(9, ME, TA, 'confirmado'), inv(5, O1, TA, 'pendiente')]
  const blk = (k, orden, tipo, titulo, song, lead) => ({ id: 'bl' + (++n), service_id: S(k), orden, tipo, titulo, song_id: song, lead_id: lead, tono: song ? 'SECRETO_TONO_DEL_BLOQUE' : null, duracion_min: 5, notas: orden === 1 ? 'NOTA_DEL_BLOQUE_QUE_SI_VA' : null })
  db.service_blocks = [blk(1, 1, 'cancion', 'Canción Uno', SG1, O1), blk(1, 2, 'bloque', 'Ofrenda', null, null), blk(1, 3, 'cancion', 'Canción Dos', SG2, null), blk(2, 1, 'cancion', 'Canción Uno', SG1, ME),
    blk(6, 1, 'cancion', 'Canción Uno', SG1, null), blk(6, 2, 'bloque', 'Receso', null, null), blk(7, 1, 'cancion', 'Canción Dos', SG2, null), blk(7, 2, 'bloque', 'Oración', null, null), blk(4, 1, 'cancion', 'Canción Uno', SG1, null)]
}

let total = 0
const prueba = async (nombre, f) => { await f(); total++; console.log('  ok', nombre) }
const terminar = () => console.log(`\n${total} comprobaciones OK`)
const correr = main => main().catch(e => { console.log('FALLÓ:', e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n') : e); process.exit(1) })
module.exports = { assert, db, ID, S, estado, mundo, llamar, prueba, terminar, correr, me, mp }
