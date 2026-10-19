// Lectura de los archivos de interfaz para las pruebas de textos: app/, components/ y lib/ (.ts y .tsx), sin comentarios, sin pruebas y sin lib/textos.
const fs = require('fs'), path = require('path')
const RAIZ = path.resolve(__dirname, '..', '..')
const EXCLUIDOS = [/^lib\/textos\//]
function recorrer(dir, out) {
  for (const n of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, n.name)
    if (n.isDirectory()) { if (n.name !== 'node_modules' && n.name !== '.next') recorrer(rel, out) }
    else if (/\.(ts|tsx)$/.test(n.name) && !EXCLUIDOS.some(r => r.test(rel))) out.push(rel)
  }
  return out
}
/** Quita comentarios de bloque y de línea (no toca «//» dentro de una URL: exige un espacio o inicio de línea antes). */
const sinComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).replace(/(^|\s)\/\/[^\n]*/g, (m, p) => p)
function archivosDeInterfaz() { return ['app', 'components', 'lib'].flatMap(d => recorrer(d, [])).sort() }
function lineas(rel) { return sinComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8')).split('\n') }
module.exports = { RAIZ, archivosDeInterfaz, lineas }
