// Botones de texto restantes · estilo nuevo (anc-bt, app/ancora-boton.css), solo teléfono. Cada grupo agrega sus casos aquí. La medición en un navegador real está en tests/e2e-menus/botones-texto.js.
// Grupo (b): botones con ícono claro — Añadir (Plus), Gestionar equipo(s) (SlidersHorizontal), Cerrar sesión (LogOut), Agregar canción y Agregar persona (Plus).
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, ''), plano = t => sinCom(t).replace(/\s+/g, ' ')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('botones de texto · estilo nuevo')
const bt = (v, ico, txt) => `className="anc-bt anc-bt--${v}"`
const boton = (cl, icono, texto) => new RegExp(`<button[^>]*${cl}[\\s\\S]*?><${icono} className="anc-bt__ico" aria-hidden="true" /><span className="anc-bt__txt">${texto}</span></button>`)

t('Añadir (Orden del servicio): botón primario (negro) con Plus; el CSS del botón antiguo (píldora negra de 44 px) se fue y queda solo lo que ocupa junto al «⋯»', () => {
  const x = plano(leer('components/orden/OrdenTelefono.tsx')), c = plano(leer('components/orden/orden-telefono.module.css'))
  assert.match(x, /className=\{`\$\{ui\.anadir\} anc-bt anc-bt--p`\} onClick=\{onAnadir\}><Plus className="anc-bt__ico" aria-hidden="true" \/><span className="anc-bt__txt">\{T\.anadir\}<\/span>/)
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
t('Cerrar sesión (Admin): en teléfono botón secundario con LogOut al final de la pantalla que conserva su color de aviso (--anc-no) con la variable del botón --bt-s-fg; en escritorio (esta pantalla también se ve ahí) la fila de lista de siempre, sin cambios', () => {
  const x = plano(leer('components/admin-movil/PantallaAdmin.tsx')), c = plano(leer('components/admin-movil/pantalla-admin.module.css'))
  assert.match(x, /\{telefono \? <button type="button" className=\{`anc-bt anc-bt--s \$\{ui\.salirBt\}`\} onClick=\{onSignOut\}><LogOut className="anc-bt__ico" aria-hidden="true" \/><span className="anc-bt__txt">\{T\.cerrarSesion\}<\/span><\/button> : <div className=\{ui\.lista\}> <button type="button" className=\{`\$\{ui\.fila\} \$\{ui\.salir\}`\} onClick=\{onSignOut\}> <LogOut size=\{20\} strokeWidth=\{1\.75\} aria-hidden="true" \/><span className=\{ui\.ftxt\}><span className=\{ui\.ft\}>\{T\.cerrarSesion\}<\/span><\/span> <\/button> <\/div>\}/)
  assert.ok(/const telefono = useTelefonoYa\(\)/.test(x) && c.includes('.salirBt{ --bt-s-fg:var(--anc-no); }') && c.includes('.salir{ color:var(--anc-no); }')) })
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
t('no se inventó ningún ícono: solo Plus, SlidersHorizontal y LogOut (más la X de «Cancelar» desde el grupo e), que ya usaban estas pantallas', () => {
  const archivos = ['components/orden/OrdenTelefono.tsx', 'components/servicio-movil/ChecklistLider.tsx', 'app/portal/_components/disponibilidad/Disponibilidad.tsx', 'components/lider-movil/EquipoPropio.tsx', 'app/portal/_components/perfil/Perfil.tsx', 'components/admin-movil/PantallaAdmin.tsx', 'components/canciones/SongList.tsx']
  const usados = new Set(); for (const f of archivos) for (const m of leer(f).matchAll(/<(\w+) className="anc-bt__ico"/g)) usados.add(m[1]); assert.deepEqual([...usados].sort(), ['LogOut', 'Plus', 'SlidersHorizontal', 'X'])  /* la X llega con el grupo (e): «Cancelar» de la hoja del equipo del líder */ })

// Grupo (c): pastillas de herramientas del equipo → cuadrícula de 2 columnas de botones secundarios con su ícono; «Añadir herramienta» en fila ancha con Plus.
t('Herramientas del equipo (VistaEquipo): botones secundarios con su ícono en cuadrícula de 2 columnas; la herramienta de solo lectura es un <span> con la misma forma; «Añadir» ocupa la fila entera', () => {
  const x = plano(leer('components/servicio-movil/VistaEquipo.tsx')), c = plano(leer('components/servicio-movil/pantallas.module.css')), i = plano(leer('components/servicio-movil/iconos.tsx'))
  assert.match(x, /<button key=\{t\.clave\} type="button" className=\{`\$\{ui\.fichaHerr\} anc-bt anc-bt--s`\} onClick=\{[\s\S]*?\}><IconoHerramienta tipo=\{t\.tipo\} className="anc-bt__ico" \/><span className="anc-bt__txt">\{t\.nombre\}<\/span><\/button>/)
  assert.match(x, /<span key=\{t\.clave\} className=\{`\$\{ui\.fichaHerr\} \$\{ui\.fichaHerrQuieta\} anc-bt anc-bt--s`\}><IconoHerramienta tipo=\{t\.tipo\} className="anc-bt__ico" \/><span className="anc-bt__txt">\{t\.nombre\}<\/span><\/span>/)
  assert.match(x, /\{p\.onAnadirHerramienta && <button type="button" className=\{`\$\{ui\.fichaHerr\} \$\{ui\.fichaHerrAnadir\} anc-bt anc-bt--s`\} onClick=\{p\.onAnadirHerramienta\}><Plus className="anc-bt__ico" aria-hidden="true" \/><span className="anc-bt__txt">\{T\.anadirHerramienta\}<\/span><\/button>\}/)
  assert.ok(c.includes('.fichasHerr{ display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:var(--anc-btn-sep); }') && c.includes('.fichaHerrAnadir{ grid-column:1 / -1; }') && c.includes('.fichaHerr svg{ color:var(--anc-modo-ink); }'))
  assert.ok(!/\.fichaHerr\{/.test(c), 'la píldora antigua (.fichaHerr) se fue: la forma ahora la da anc-bt')
  assert.ok(/className\?: string/.test(i) && /const p = \{ size, className,/.test(i), 'IconoHerramienta acepta la clase del ícono del botón') })
t('VistaEquipo solo se usa en las pantallas de teléfono (admin y líder): la cuadrícula no toca el escritorio', () => {
  for (const f of ['components/servicio-movil/PantallaEquipo.tsx', 'components/lider-movil/EquipoPropio.tsx', 'components/lider-movil/EquipoAjeno.tsx']) assert.ok(/VistaEquipo/.test(leer(f))) })

// Grupo (d): el selector «Este mes · 3 meses · Este año» del Resumen del líder usa el componente Segmentado (sin ícono), igual que los demás selectores.
t('Resumen del líder: el periodo es un Segmentado sin ícono (las pastillas de equipo de arriba se quedan); se fueron los estilos propios .segmentos/.segmento y su aria-pressed', () => {
  const x = plano(leer('components/lider-movil/ResumenLider.tsx')), c = plano(leer('components/lider-movil/lider-movil.module.css'))
  assert.match(x, /import Segmentado from '@\/app\/portal\/_components\/segmentado\/Segmentado'/)
  assert.match(x, /<Segmentado opciones=\{PERIODOS\.map\(p => \(\{ valor: p\.clave, texto: p\.texto \}\)\)\} valor=\{periodo\} onCambio=\{setPeriodo\} etiqueta=\{TR\.periodoEtiqueta\} \/>/)
  assert.ok(!/icono/.test(x.slice(x.indexOf('<Segmentado'), x.indexOf('<Segmentado') + 220)), 'sin ícono')
  assert.ok(/className=\{`\$\{ui\.pildora\}/.test(x), 'las pastillas de equipo se quedan'); assert.ok(!/segmento/.test(c) && !/segmento/.test(x.replace(/Segmentado/g, '')))
  assert.ok(/ResumenLider/.test(leer('app/home/resumen/page.tsx')) && /telefono === false\) router\.replace\('\/home'\)/.test(leer('app/home/resumen/page.tsx')), 'solo teléfono: en escritorio la página redirige') })

// Grupo (e): pares de botones de formularios y hojas. Confirmar/Guardar/Listo = Check; Cancelar/Cerrar = X; Asignar, Abrir servicio, Generar enlace, Revocar y Copiar: sin ícono, texto centrado (--c).
t('Mis datos (Perfil): en teléfono Guardar (primario, Check) y Cancelar (secundario, X) apilados; en escritorio, los dos botones de siempre lado a lado', () => {
  const x = plano(leer('app/portal/_components/perfil/MisDatos.tsx')), c = plano(leer('app/portal/_components/perfil/perfil.module.css'))
  assert.match(x, /\{telefono \? <div className=\{ui\.accionesBt\}> <button type="submit" className="anc-bt anc-bt--p" disabled=\{guardando\}><Check className="anc-bt__ico" aria-hidden="true" \/><span className="anc-bt__txt">\{guardando \? 'Guardando…' : 'Guardar'\}<\/span><\/button> <button type="button" className="anc-bt anc-bt--s" onClick=\{\(\) => onCerrar\(false\)\} disabled=\{guardando\}><X className="anc-bt__ico" aria-hidden="true" \/><span className="anc-bt__txt">Cancelar<\/span><\/button> <\/div> : <div className=\{ui\.acciones\}> <button type="submit" className=\{`\$\{ui\.btn\} \$\{ui\.btnA\}`\}/)
  assert.ok(c.includes('.accionesBt{ display:flex; flex-direction:column; gap:var(--anc-btn-sep); }') && c.includes('.acciones{ display:flex; gap:0.5rem; }')) })
t('Listo y Asignar (hoja de posición, admin y líder): Listo primario con Check; Asignar secundario sin ícono, centrado y del ancho de su texto dentro de la fila', () => {
  for (const [f, T, A] of [['components/servicio-movil/HojasEquipo.tsx', 'T', 'T'], ['components/lider-movil/HojaPosicionLider.tsx', 'TS', 'TE']]) {
    const x = plano(leer(f))
    assert.ok(x.includes(`<button type="button" className="anc-bt anc-bt--p" style={{ marginTop: '0.875rem' }} onClick={() => cerrar()}><Check className="anc-bt__ico" aria-hidden="true" /><span className="anc-bt__txt">{${T}.listo}</span></button>`), f + ' Listo')
    assert.ok(x.includes('className={`${ui.asignarBoton} anc-bt anc-bt--s anc-bt--c`}') && x.includes(`<span className="anc-bt__txt">{${A}.asignar}</span>`), f + ' Asignar') }
  const c = plano(leer('components/servicio-movil/pantallas.module.css'))
  assert.ok(c.includes('.asignarBoton.asignarBoton{ width:auto; flex:none; }') && !/(^|[ }])\.asignarBoton\{|\.asignarBoton:focus/.test(c)) })
t('Cancelar / Cerrar de las hojas (equipo del líder, agregar persona, ficha de persona, añadir y menú del Orden ×2): botón secundario con X', () => {
  const casos = [['components/lider-movil/EquipoPropio.tsx', 'ui.cancelarHoja', 'Cancelar', 1], ['components/lider-movil/HojaAgregarPersona.tsx', 'ui.cancelarHoja', 'Cancelar', 1], ['components/lider-movil/HojaPersona.tsx', 'ui.cancelarHoja', '{TP.cerrarFicha}', 1], ['components/orden/HojasOrden.tsx', 'ui.cancelar', '{T.cancelar}', 2]]
  for (const [f, cl, txt, n] of casos) { const x = plano(leer(f)), esperado = `<button type="button" className={\`anc-bt anc-bt--s \${${cl}}\`} onClick={() => cerrar()}><X className="anc-bt__ico" aria-hidden="true" /><span className="anc-bt__txt">${txt}</span></button>`
    assert.equal(x.split(esperado).length - 1, n, f); assert.ok(!/pantallas\.boton/.test(x), f + ': ya no usa la pastilla antigua') } })
t('Enlace de acceso (ficha de persona): en teléfono Generar/Regenerar (primario) y Revocar (secundario) sin ícono y centrados, Copiar sin ícono, Cerrar con X; en escritorio los botones de siempre', () => {
  const x = plano(leer('components/persona/AccessLinkControl.tsx'))
  assert.ok(/const telefono = useTelefonoYa\(\)/.test(x))
  assert.ok(x.includes('className="anc-bt anc-bt--p anc-bt--c" disabled={busy || status.kind === \'loading\'} onClick={generate}>') && x.includes('className="anc-bt anc-bt--s anc-bt--c" disabled={busy} onClick={revoke}>'))
  assert.ok(x.includes('className="anc-bt anc-bt--p anc-bt--c" onClick={copy}>') && x.includes('<X className="anc-bt__ico" aria-hidden="true" /><span className="anc-bt__txt">Cerrar</span>'))
  assert.ok(x.includes('className={styles.btn} disabled={busy || status.kind === \'loading\'} onClick={generate}>') && x.includes('className={`${styles.btn} ${styles.btnQuiet}`} disabled={busy} onClick={revoke}>Revocar</button>'), 'escritorio igual') })
t('Abrir servicio (Home del admin): botón primario centrado sin ícono con el color de acento de siempre; «Responder» del portal sigue con su botón de antes', () => {
  const f = plano(leer('components/servicio-movil/FichaServicio.tsx')), c = plano(leer('components/servicio-movil/ficha.module.css')), h = plano(leer('components/home/HomeAdminMovil.tsx'))
  assert.ok(f.includes('nuevo ? <button type="button" className={`anc-bt anc-bt--p anc-bt--c ${ui.responderBt}`} onClick={onClick}><span className="anc-bt__txt">{texto}</span></button> : <button type="button" className={ui.responder} onClick={onClick}>{texto}</button>'))
  assert.ok(c.includes('.responderBt{ --bt-p-bg:var(--anc-accent); --bt-p-fg:var(--anc-on-accent); }') && h.includes('<BotonResponder nuevo texto={T.abrirServicio}'))
  assert.ok(!/BotonResponder nuevo/.test(plano(leer('app/portal/_components/servicios/FichaPortal.tsx')))) })
t('el centrado sin ícono es una clase aparte (--c): los botones con ícono que ya existían no cambian de alineación', () => {
  const c = plano(leer('app/ancora-boton.css'))
  assert.ok(c.includes('.anc-bt.anc-bt.anc-bt--c { justify-content:center; }') && c.includes('justify-content:flex-start')) })
console.log(`${n} comprobaciones OK`)
