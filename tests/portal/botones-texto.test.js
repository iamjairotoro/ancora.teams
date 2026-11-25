// Botones de texto restantes · estilo nuevo (anc-bt, app/ancora-boton.css), solo teléfono. Cada grupo agrega sus casos aquí. La medición en un navegador real está en tests/e2e-menus/botones-texto.js.
// Grupo (b): botones con ícono claro — Añadir (Plus), Gestionar equipo(s) (SlidersHorizontal), Cerrar sesión (LogOut), Agregar canción y Agregar persona (Plus).
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, ''), plano = t => sinCom(t).replace(/\s+/g, ' ')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('botones de texto · estilo nuevo')
const bt = (v, ico, txt) => `className="anc-bt anc-bt--${v}"`
const boton = (cl, icono, texto) => new RegExp(`<button[^>]*${cl}[\\s\\S]*?><${icono} className="anc-bt__ico" aria-hidden="true" /><span className="anc-bt__txt">${texto}</span></button>`)

t('Añadir (Orden del servicio): botón secundario con Plus; el CSS del botón antiguo (píldora negra de 44 px) se fue y queda solo lo que ocupa junto al «⋯»', () => {
  const x = plano(leer('components/orden/OrdenTelefono.tsx')), c = plano(leer('components/orden/orden-telefono.module.css'))
  assert.match(x, /className=\{`\$\{ui\.anadir\} anc-bt anc-bt--s`\} onClick=\{onAnadir\}><Plus className="anc-bt__ico" aria-hidden="true" \/><span className="anc-bt__txt">\{T\.anadir\}<\/span>/)
  assert.ok(c.includes('.anadir{ flex:1; min-width:0; }') && !/\.anadir:focus-visible/.test(c)) })
t('Añadir ítem y Nueva sección (Checklist del líder): dos botones secundarios con Plus, apilados y separados 8 px (--anc-btn-sep)', () => {
  const x = plano(leer('components/servicio-movil/ChecklistLider.tsx')), c = plano(leer('components/servicio-movil/checklist-lider.module.css'))
  assert.match(x, boton('anc-bt anc-bt--s', 'Plus', '\\{T\\.anadirItem\\}')); assert.match(x, boton('anc-bt anc-bt--s', 'Plus', '\\{T\\.nuevaSeccion\\}'))
  assert.ok(!/\.anadir\b/.test(c) && c.includes('.pie{ display:flex; flex-wrap:wrap; gap:var(--anc-btn-sep); }')) })
t('Bloquear un rango de fechas (Disponibilidad): en teléfono un botón secundario con Plus (el «+» deja de ser un carácter); en escritorio, el botón de siempre con su «+» escrito', () => {
  const x = plano(leer('app/portal/_components/disponibilidad/Disponibilidad.tsx'))
  assert.match(x, /\{telefono \? <button ref=\{rangoBtnRef\} type="button" className="anc-bt anc-bt--s" onClick=\{[\s\S]*?\}><Plus className="anc-bt__ico" aria-hidden="true" \/><span className="anc-bt__txt">Bloquear un rango de fechas \(ej\. vacaciones\)<\/span><\/button> : <button ref=\{rangoBtnRef\} type="button" className=\{ui\.rango\}/)
  assert.match(x, /\+ Bloquear un rango de fechas \(ej\. vacaciones\)/); assert.ok(/const telefono = useTelefonoYa\(\)/.test(x) && /import \{ useTelefonoYa \} from '@\/lib\/useTelefonoYa'/.test(x)) })
t('Gestionar equipo del líder: botón secundario con SlidersHorizontal; la cabecera de «Voluntarios» deja que baje a su propia línea (flex-wrap) en vez de apretar el título; ya no existe el enlace .enlaceGestionar', () => {
  const x = plano(leer('components/lider-movil/EquipoPropio.tsx')), c = plano(leer('components/servicio-movil/pantallas.module.css')), l = plano(leer('components/lider-movil/lider-movil.module.css'))
  assert.match(x, /accionVoluntarios=\{<button type="button" className="anc-bt anc-bt--s" onClick=\{\(\) => irA\('equipo', equipo\.id\)\}><SlidersHorizontal className="anc-bt__ico" aria-hidden="true" \/><span className="anc-bt__txt">\{TS\.gestionarEquipo\}<\/span><\/button>\}/)
  assert.ok(c.includes('.cabSeccion{ display:flex; flex-wrap:wrap; align-items:baseline; justify-content:space-between; gap:0.5rem; }') && !/enlaceGestionar/.test(l)) })
t('Cerrar sesión (Perfil): en teléfono un botón secundario con LogOut fuera de la tarjeta; en escritorio, la fila de siempre dentro de su tarjeta', () => {
  const x = plano(leer('app/portal/_components/perfil/Perfil.tsx'))
  assert.match(x, /\{telefono \? <button type="button" className="anc-bt anc-bt--s" onClick=\{cerrarSesion\}><LogOut className="anc-bt__ico" aria-hidden="true" \/><span className="anc-bt__txt">Cerrar sesión<\/span><\/button> : <div className=\{ui\.tarjeta\}> <button type="button" className=\{`\$\{ui\.fila\} \$\{ui\.centrada\}`\} onClick=\{cerrarSesion\}><LogOut size=\{18\} aria-hidden="true" \/>Cerrar sesión<\/button> <\/div>\}/) })
t('Cerrar sesión (Admin): botón secundario con LogOut al final de la pantalla, sin la fila de lista, y conserva su color de aviso (--anc-no) con la variable del botón --bt-s-fg', () => {
  const x = plano(leer('components/admin-movil/PantallaAdmin.tsx')), c = plano(leer('components/admin-movil/pantalla-admin.module.css'))
  assert.match(x, /<button type="button" className=\{`anc-bt anc-bt--s \$\{ui\.salir\}`\} onClick=\{onSignOut\}><LogOut className="anc-bt__ico" aria-hidden="true" \/><span className="anc-bt__txt">\{T\.cerrarSesion\}<\/span><\/button>/)
  assert.ok(c.includes('.salir{ --bt-s-fg:var(--anc-no); }') && !/\.salir svg|\.salir \.ftxt/.test(c)) })
t('Cerrar sesión (líder sin acceso, ×3): botón primario con LogOut en lugar del botón con estilos escritos en línea; estas páginas solo existen en teléfono (en escritorio redirigen a /home)', () => {
  for (const f of ['personas', 'resumen', 'servicios']) {
    const x = plano(leer(`app/home/${f}/page.tsx`)); assert.match(x, /<button type="button" className="anc-bt anc-bt--p" onClick=\{salir\}><LogOut className="anc-bt__ico" aria-hidden="true" \/><span className="anc-bt__txt">Cerrar sesión<\/span><\/button>/)
    assert.ok(/import \{ LogOut \} from 'lucide-react'/.test(x) && !/onClick=\{salir\} style=/.test(x)); assert.ok(/telefono === false\) router\.replace\('\/home'\)/.test(x), 'en escritorio redirige: el cambio no se ve ahí') } })
t('Agregar canción (Canciones del admin): en teléfono botón primario con Plus; en escritorio, el botón de siempre con su «+» escrito', () => {
  const x = plano(leer('components/canciones/SongList.tsx'))
  assert.match(x, /\{telefono \? <button type="button" className="anc-bt anc-bt--p" onClick=\{p\.onAdd\}><Plus className="anc-bt__ico" aria-hidden="true" \/><span className="anc-bt__txt">Agregar canción<\/span><\/button> : <button className="anc-btn anc-btn--accent" onClick=\{p\.onAdd\}>\+ Agregar canción<\/button>\}/) })
t('Agregar persona (líder, dos pantallas): botón primario con Plus (ya lo llevaban en una; la otra no tenía ícono)', () => {
  assert.match(plano(leer('components/lider-movil/PantallaEquipo.tsx')), boton('anc-bt anc-bt--p', 'Plus', '\\{TE\\.agregarPersona\\}'))
  assert.match(plano(leer('components/lider-movil/PersonasEquipoPropio.tsx')), boton('anc-bt anc-bt--p', 'Plus', '\\{TP\\.agregar\\}')) })
t('no se inventó ningún ícono: solo Plus, SlidersHorizontal y LogOut, que ya usaban estas pantallas', () => {
  const archivos = ['components/orden/OrdenTelefono.tsx', 'components/servicio-movil/ChecklistLider.tsx', 'app/portal/_components/disponibilidad/Disponibilidad.tsx', 'components/lider-movil/EquipoPropio.tsx', 'app/portal/_components/perfil/Perfil.tsx', 'components/admin-movil/PantallaAdmin.tsx', 'components/canciones/SongList.tsx']
  const usados = new Set(); for (const f of archivos) for (const m of leer(f).matchAll(/<(\w+) className="anc-bt__ico"/g)) usados.add(m[1]); assert.deepEqual([...usados].sort(), ['LogOut', 'Plus', 'SlidersHorizontal']) })
console.log(`${n} comprobaciones OK`)
