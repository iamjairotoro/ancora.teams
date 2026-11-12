// «Nueva canción» paso A: la lógica de la ventana «Datos» / «Más datos» (lib/nuevaCancion.ts), el estado de borrador (publicada, migración 056) y dónde se filtra. DATOS INVENTADOS. Sin red ni base real.
const { assert, db, mundo, estado, prueba, terminar, correr, stubs, resolver, RAIZ } = require('./_banco')
stubs['@/lib/auth/libraryAccess'] = { requireLibraryAccess: async () => ({ ok: true }) }
const CATALOGO = require(resolver(require('path').join(RAIZ, 'app/api/all-songs/route')))
const path = require('path'), fs = require('fs')
const N = require(path.join(RAIZ, 'lib/nuevaCancion.ts')), P = require(path.join(RAIZ, 'lib/publicada.ts')), G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts')), E = require(path.join(RAIZ, 'lib/editorAcordes.ts'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const base = (o = {}) => ({ ...N.datosVacios(), nombre: 'Canción de prueba', tono: 'F', ...o })
const SONG = '11111111-1111-4111-8111-111111111111'
let n = 0; const nuevoId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
const TEXTO = 'VERSO 1:\nLínea de prueba\n\nCORO:\nOtra línea'
const cuerpo = (o = {}) => ({ songId: SONG, tono: 'G', letra: TEXTO, secciones: E.aSecciones({ texto: TEXTO, anclas: [], interludios: [] }), base: 'a'.repeat(32), ...o })
const estadoDe = song => ({ song: { id: SONG, organization_id: 'ORG', tono_original: null, letra: null, ...song }, secciones: [] })
const valoresSongs = (e, d) => G.planificar(e, d, new Date('2026-11-10T15:00:00Z'), nuevoId).find(o => o.tabla === 'songs').valores

correr(async () => {
  await prueba('duración: «6:59» → 419 s, «7» → 420 s, vacío → null, y lo que no se entiende → undefined; ida y vuelta', () => {
    assert.equal(N.duracionASegundos('6:59'), 419); assert.equal(N.duracionASegundos(' 0:30 '), 30); assert.equal(N.duracionASegundos('7'), 420); assert.equal(N.duracionASegundos('3.5'), 210)
    assert.equal(N.duracionASegundos(''), null); assert.equal(N.duracionASegundos('   '), null)
    for (const x of ['abc', '6:75', '6:', ':30', '0:00', '0', '-3', '1:2:3', '6,5']) assert.equal(N.duracionASegundos(x), undefined, x)
    assert.equal(N.segundosADuracion(419), '6:59'); assert.equal(N.segundosADuracion(60), '1:00'); assert.equal(N.segundosADuracion(null), ''); assert.equal(N.segundosADuracion(N.duracionASegundos('4:05')), '4:05') })

  await prueba('validar: el título siempre es obligatorio; el tono solo para «Crear y escribir la letra»; BPM y duración, si vienen, deben ser válidos; un tono con mal formato nunca pasa', () => {
    assert.deepEqual(N.validarNueva(base(), 'escribir'), {}); assert.deepEqual(N.validarNueva(base(), 'solo'), {})
    assert.equal(N.validarNueva(base({ nombre: '' }), 'solo').nombre, N.TEXTOS_NUEVA.faltaNombre); assert.equal(N.validarNueva(base({ nombre: '   ' }), 'escribir').nombre, N.TEXTOS_NUEVA.faltaNombre)
    assert.equal(N.validarNueva(base({ tono: '' }), 'escribir').tono, N.TEXTOS_NUEVA.faltaTono, 'escribir sin tono: no')
    assert.deepEqual(N.validarNueva(base({ tono: '' }), 'solo'), {}, 'solo crear sin tono: sí')
    for (const a of ['escribir', 'solo']) { assert.equal(N.validarNueva(base({ tono: 'sol' }), a).tono, N.TEXTOS_NUEVA.tonoNoValido, 'sol'); assert.equal(N.validarNueva(base({ tono: 'Gm7' }), a).tono, N.TEXTOS_NUEVA.tonoNoValido, 'Gm7') }
    assert.deepEqual(N.validarNueva(base({ tono: 'Bbm', bpm: '72.5', duracion: '6:59' }), 'escribir'), {})
    for (const b of ['0', '-4', 'abc', '1e', 'NaN']) assert.ok(N.validarNueva(base({ bpm: b }), 'solo').bpm, 'bpm ' + b)
    assert.deepEqual(N.validarNueva(base({ bpm: '  ' }), 'solo'), {}, 'BPM en blanco = sin BPM')
    assert.ok(N.validarNueva(base({ duracion: '6:75' }), 'solo').duracion); assert.deepEqual(N.validarNueva(base({ duracion: '' }), 'solo'), {}) })

  await prueba('payload: nace como BORRADOR (publicada = false), sin letra, con lo vacío en null, y trae los mismos campos que el formulario de siempre', () => {
    const p = N.payloadNueva(base({ nombre: '  Canción de prueba ', artista: ' Grupo Inventado ', tono: 'F', bpm: '72', compas: '4/4', duracion: '6:59', autor: 'Autor Inventado', ccli: '000', link_spotify: 'https://youtu.be/x', notas: ' nota ' }))
    assert.equal(p.publicada, false); assert.equal(p.letra, null); assert.equal(p.nombre, 'Canción de prueba'); assert.equal(p.artista, 'Grupo Inventado'); assert.equal(p.tono_original, 'F'); assert.equal(p.bpm, 72); assert.equal(p.compas, '4/4'); assert.equal(p.duracion_min, 419); assert.equal(p.notas, 'nota'); assert.equal(p.autor, 'Autor Inventado')
    const v = N.payloadNueva(base({ tono: '' })); assert.equal(v.tono_original, null); assert.equal(v.bpm, null); assert.equal(v.compas, null); assert.equal(v.duracion_min, null); assert.equal(v.traductor, null); assert.equal(v.caratula_url, null); assert.equal(v.artista, '')
    const viejo = leer('components/canciones/CancionesPanel.tsx').match(/const payload = \{[\s\S]*?\n    \}/)[0].match(/\b[a-z_]+(?=:)/g).filter(k => k !== 'letra').sort()
    assert.deepEqual(Object.keys(v).filter(k => k !== 'letra' && k !== 'publicada').sort(), viejo, 'los mismos campos que saveSong del formulario viejo') })

  await prueba('esBorrador / soloPublicadas: solo publicada === false es borrador; sin la columna (undefined) o null cuenta como publicada', () => {
    assert.equal(P.esBorrador({ publicada: false }), true); assert.equal(P.esBorrador({ publicada: true }), false); assert.equal(P.esBorrador({}), false); assert.equal(P.esBorrador({ publicada: null }), false); assert.equal(P.esBorrador(null), false)
    const l = [{ id: 1, publicada: true }, { id: 2, publicada: false }, { id: 3 }, { id: 4, publicada: null }]
    assert.deepEqual(P.soloPublicadas(l).map(x => x.id), [1, 3, 4]); assert.equal(l.length, 4, 'no modifica la lista') })

  await prueba('guardado del editor: un borrador con letra se publica solo en el MISMO update de songs; una ya publicada, sin la columna, o un guardado sin letra, no llevan `publicada`', () => {
    assert.deepEqual(valoresSongs(estadoDe({ publicada: false }), cuerpo()), { letra: TEXTO, tono_original: 'G', publicada: true })
    assert.deepEqual(valoresSongs(estadoDe({ publicada: true }), cuerpo()), { letra: TEXTO, tono_original: 'G' })
    assert.deepEqual(valoresSongs(estadoDe({}), cuerpo()), { letra: TEXTO, tono_original: 'G' }, 'sin la columna')
    assert.deepEqual(valoresSongs(estadoDe({ publicada: null }), cuerpo()), { letra: TEXTO, tono_original: 'G' })
    const sinLetra = valoresSongs(estadoDe({ publicada: false }), cuerpo({ letra: '   ', secciones: [] })); assert.equal('publicada' in sinLetra, false, 'sin letra sigue en borrador'); assert.equal(sinLetra.letra, '   ')
    const soloEspacios = valoresSongs(estadoDe({ publicada: false }), cuerpo({ letra: '', secciones: [] })); assert.equal('publicada' in soloEspacios, false) })

  await prueba('leerEstado: pide `publicada`; si la base aún no tiene la columna repite la lectura sin ella (el guardado sigue como siempre)', async () => {
    const llamadas = []
    const admin = { from: () => { let cols = ''; const api = { select(c) { cols = c; return api }, eq() { return api }, maybeSingle() { llamadas.push(cols); return Promise.resolve(cols.includes('publicada') ? { data: null, error: { message: 'column songs.publicada does not exist' } } : { data: { id: SONG, organization_id: 'ORG', tono_original: 'G', letra: 'x' }, error: null }) }, then(r) { return Promise.resolve({ data: [], error: null }).then(r) } }; return api } }
    const e = await G.leerEstado(admin, SONG); assert.equal(e.song.id, SONG); assert.equal(llamadas.length, 2); assert.ok(llamadas[0].includes('publicada')); assert.ok(!llamadas[1].includes('publicada'))
    const conColumna = { from: () => { const api = { select() { return api }, eq() { return api }, maybeSingle() { return Promise.resolve({ data: { id: SONG, organization_id: 'ORG', tono_original: null, letra: null, publicada: false }, error: null }) }, then(r) { return Promise.resolve({ data: [], error: null }).then(r) } }; return api } }
    assert.equal((await G.leerEstado(conColumna, SONG)).song.publicada, false)
    const roto = { from: () => { const api = { select() { return api }, eq() { return api }, maybeSingle() { return Promise.resolve({ data: null, error: { message: 'boom' } }) } }; return api } }
    await assert.rejects(() => G.leerEstado(roto, SONG), /lectura songs/, 'un error real sigue siendo error') })

  await prueba('FILTROS de publicada = true: catálogo de músicos, ficha del músico y selectores de setlist; con repetición sin filtro si la columna no existe; el panel del administrador NO filtra', () => {
    const cat = leer('app/api/all-songs/route.ts'); assert.match(cat, /\.select\(SONG_CATALOG_COLUMNS\)\.eq\('publicada', true\)\.order\('nombre'\)/); assert.match(cat, /if \(error\) \(\{ data, error \} = await admin\.from\('songs'\)\.select\(SONG_CATALOG_COLUMNS\)\.order\('nombre'\)\)/)
    const fic = leer('app/api/portal/cancion/route.ts'); assert.match(fic, /\.select\(SONG_LYRIC_COLUMNS\)\.eq\('id', id\)\.eq\('publicada', true\)\.maybeSingle\(\)/); assert.match(fic, /if \(error\) \(\{ data, error \} = await admin\.from\('songs'\)\.select\(SONG_LYRIC_COLUMNS\)\.eq\('id', id\)\.maybeSingle\(\)\)/)
    const pag = leer('app/admin/page.tsx'); assert.match(pag, /songs: soloPublicadas\(songs\),/); assert.match(pag, /import \{ soloPublicadas \} from '@\/lib\/publicada'/); assert.match(pag, /songs=\{songs\} onRefreshSongs/, 'el panel Canciones recibe TODAS (ve los borradores)')
    assert.equal((pag.match(/soloPublicadas\(/g) || []).length, 1) })

  await prueba('catálogo de los músicos (/api/all-songs), con la ruta de verdad: no trae los borradores y sí las publicadas', async () => {
    mundo(); estado.fallan.clear(); db.songs.forEach(x => { x.publicada = true })
    const antes = (await CATALOGO.GET({ headers: { get: () => null } })).body.songs.map(x => x.id)
    assert.ok(antes.length >= 2); const borrador = db.songs[0]; borrador.publicada = false
    const despues = (await CATALOGO.GET({ headers: { get: () => null } })).body.songs.map(x => x.id)
    assert.ok(!despues.includes(borrador.id) && despues.length === antes.length - 1, 'sale solo el borrador'); assert.ok(antes.includes(borrador.id)) })

  await prueba('el formulario viejo y todo lo existente no cambian: el alta de escritorio no manda `publicada` (la base le pone true), y editar un borrador con él no lo publica', () => {
    const panel = leer('components/canciones/CancionesPanel.tsx'), payload = panel.match(/const payload = \{[\s\S]*?\n    \}/)[0]
    assert.ok(!/publicada/.test(payload), 'saveSong no toca publicada')
    assert.match(panel, /onAdd=\{\(\) => \{ if \(telefono && isAdmin\) setNuevaAbierta\(true\); else setEditing\(newEmpty\(\)\) \}\}/, 'solo teléfono y administrador usan el flujo nuevo')
    assert.match(panel, /const \{ error \} = editing\.id \? await supabase\.from\('songs'\)\.update\(payload\)/)
    assert.match(panel, /from\('songs'\)\.update\(\{ publicada: true \}\)\.eq\('id', id\)/, 'Publicar solo cambia publicada')
    assert.match(panel, /esBorrador\(selectedSong\) && \(/); assert.match(panel, /draft: esBorrador\(s\)/, 'la lista lleva la etiqueta Borrador')
    assert.match(panel, /setNuevaAbierta\(false\); onRefreshSongs\(\); if \(accion === 'escribir'\) \{ setEditorAcordes\(c\); setEditorNueva\(true\) \}/, '«Solo crear» no abre el editor; «Crear y escribir» sí, en su versión de canción nueva') })

  await prueba('la ventana: inserta con payloadNueva y pide el registro creado; valida antes de escribir; sin adjuntos; el tono de «Crear y escribir» se enfoca si falta', () => {
    const v = leer('components/canciones/NuevaCancionMovil.tsx')
    assert.match(v, /supabase\.from\('songs'\)\.insert\(payloadNueva\(d\)\)\.select\('\*'\)\.single\(\)/); assert.match(v, /const e = validarNueva\(d, accion\)\s*\n\s*if \(Object\.keys\(e\)\.length\) \{/)
    assert.match(v, /if \(creando\) return/, 'no se crea dos veces'); assert.ok(!/AttachmentsList|PanelSubida|useSubidaAdjuntos|song_attachments|song-attachments/.test(v), 'la ventana «Datos» no lleva adjuntos'); assert.match(v, /e\.nombre \? tituloRef : e\.tono \? tonoRef/)
    assert.match(v, /T\.crearEscribir/); assert.match(v, /T\.soloCrear/); assert.match(v, /role="dialog" aria-modal="true"/)
    const css = leer('components/canciones/nueva-cancion-movil.module.css'); assert.match(css, /\.input\{[^}]*font-size:16px/, 'campos de 16 px: no se amplía la página'); assert.match(css, /\.principal\{ min-height:52px/) })

  await prueba('la migración 056: una sola sentencia que agrega la columna con valor por defecto true y NOT NULL, sin tocar nada más', () => {
    const m = leer('migrations/056-cancion-publicada.sql').trim()
    assert.equal(m, 'alter table public.songs add column if not exists publicada boolean not null default true;')
    assert.ok(!/drop|delete|update|truncate/i.test(m)); assert.ok(fs.existsSync(path.join(RAIZ, 'migrations/056-verificacion.sql'))) })
  terminar()
})
