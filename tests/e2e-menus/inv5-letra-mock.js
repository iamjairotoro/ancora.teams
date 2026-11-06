// El mock de administración (inv5) con LETRA en la primera canción («Cuán grande es Él»), para que las comparaciones de escritorio y tableta lleguen de verdad al detalle con letra. Uso: MOCK_FILE=./inv5-letra-mock.js
const M = require('./inv5-mock.js'), ancla = "organization_id: ORG, duracion_min: 4, tags: [], created_at: '2026-01-01' }))"
if (M.MOCK.split(ancla).length !== 2) throw new Error('inv5-mock.js cambió: no encuentro dónde poner la letra')
module.exports = { SESION: M.SESION, MOCK: M.MOCK.replace(ancla, ancla + "\n  songs[0].letra = 'VERSO 1:\\nEl esplendor de un rey\\nvestido en majestad\\n\\nCORO:\\nCuán grande es Él'") }
