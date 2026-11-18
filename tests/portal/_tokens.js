// Los CSS de teléfono usan tokens de tipografía (app/ancora-tipo.css: var(--w-…) y var(--fs-…)). Las pruebas que miran el TEXTO de esos CSS (regex sobre font-size o font-weight) siguen leyendo los valores
// de siempre: al requerir este archivo, fs.readFileSync devuelve esos CSS con cada token ya sustituido por su valor. `leerCrudo` devuelve el archivo tal cual está en disco.
const fs = require('fs'), path = require('path')
const leerCrudo = fs.readFileSync.bind(fs)
const R = path.join(__dirname, '..', '..')
let tokens = null
const cargar = () => { if (tokens) return tokens; tokens = {}; const t = leerCrudo(path.join(R, 'app/ancora-tipo.css'), 'utf8'); for (const m of t.matchAll(/(--(?:w|fs)-[\w-]+)\s*:\s*([^;]+);/g)) tokens[m[1]] = m[2].trim(); return tokens }
const sustituir = css => { const t = cargar(); return css.replace(/var\((--(?:w|fs)-[\w-]+)\)/g, (m, k) => (k in t ? t[k] : m)) }
if (!fs.readFileSync.__tokens) {
  const lista = new Set(require('../../scripts/verificacion/css-telefono.js').archivos().map(f => path.join(R, f)))
  const viejo = fs.readFileSync
  fs.readFileSync = function (p, o) { const r = viejo.apply(fs, arguments); return typeof p === 'string' && lista.has(path.resolve(p)) && typeof r === 'string' ? sustituir(r) : r }
  fs.readFileSync.__tokens = true
}
module.exports = { leerCrudo, sustituir, cargar }
