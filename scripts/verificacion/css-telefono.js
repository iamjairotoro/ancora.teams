// La lista de los CSS que sirven a teléfono y que usan los tokens de tipografía (app/ancora-tipo.css). La comparten el codemod del paso 0 (tipografia-codemod.js) y la prueba tests/portal/tipografia-tokens.test.js.
// NO están: globals.css, songs.css, app.module.css, ui.module.css, ancora-tokens-v5.css (compartidos con el escritorio) ni team-blocks-calendar.module.css (calendario compartido) ni linea-con-acordes.module.css (la guardan tests byte a byte); quedan para el paso 1.
const fs = require('fs'), path = require('path')
const R = path.join(__dirname, '..', '..')
const walk = d => fs.existsSync(path.join(R, d)) ? fs.readdirSync(path.join(R, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : []
const CARPETAS = ['app/portal', 'components/servicio-movil', 'components/home', 'components/lider-movil', 'components/admin-movil', 'components/personas', 'components/canciones', 'components/orden', 'components/campos', 'components/modo', 'components/arranque', 'components/ventanas', 'components/persona']
const SUELTOS = ['app/songs-movil.css', 'app/chats-movil.css', 'app/admin-movil.css', 'components/personas-list.module.css', 'components/team-color.module.css']
// linea-con-acordes.module.css: los tests del editor v2 la comparan byte a byte con el commit anterior al editor; no se toca.
const EXCLUIDOS = new Set(['components/team-blocks-calendar.module.css', 'components/canciones/linea-con-acordes.module.css'])
module.exports = { R, archivos: () => [...CARPETAS.flatMap(walk).filter(f => f.endsWith('.css')), ...SUELTOS].filter(f => fs.existsSync(path.join(R, f)) && !EXCLUIDOS.has(f)).sort() }
if (require.main === module) { const a = module.exports.archivos(); console.log(a.length); console.log(a.join('\n')) }
