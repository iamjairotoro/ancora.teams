// Paso 1 de la tipografía: ROLES. Reescribe app/ancora-tipo.css y hace los pocos cambios por selector que un cambio de valores no alcanza. En escritorio todo sigue valiendo lo de siempre: cada token tiene su valor de antes por defecto
// y los valores nuevos viven SOLO dentro de @media (max-width:768px). Uso (una vez, sobre c577fd9): node scripts/verificacion/tipografia-paso1.js
const fs = require('fs'), path = require('path'), { R, archivos } = require('./css-telefono.js')
const leer = f => fs.readFileSync(path.join(R, f), 'utf8'), escribir = (f, t) => fs.writeFileSync(path.join(R, f), t)
const slug = v => 'fs-' + v.toLowerCase().replace(/var\(--esc,?\s*1?\)/g, 'esc').replace(/\./g, 'p').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const PESO = { 400: 'normal', 500: 'medio', 600: 'fuerte', 700: 'negrita', 800: 'negra' }
// ── valores de ANTES (por defecto = escritorio) ──
const viejo = leer('app/ancora-tipo.css'); if (/TELÉFONO/.test(viejo)) throw new Error('ya aplicado')
const defecto = new Map([...viejo.matchAll(/(--(?:w|fs)-[\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]))
const px = v => { let r; if (r = v.match(/^([\d.]+)rem$/)) return +r[1] * 13.6; if (r = v.match(/^([\d.]+)px$/)) return +r[1]; if (r = v.match(/^calc\(([\d.]+)px \* var\(--esc, 1\)\)$/)) return +r[1] * .85; if (r = v.match(/^max\((\d+)px, (.+)\)$/)) return Math.max(+r[1], px(r[2])); return NaN }
// ── 1) el calendario compartido pasa a tokens (valores de antes) ──
const CAL = 'components/team-blocks-calendar.module.css'
{ const t = leer(CAL); escribir(CAL, t.split(/(\/\*[\s\S]*?\*\/)/).map((z, i) => i % 2 ? z : z
    .replace(/(font-weight\s*:\s*)(\d{3})(?=\s*[;}])/g, (m, a, n) => `${a}var(--w-${PESO[n]})`)
    .replace(/(font-size\s*:\s*)([^;}!]+?)(?=\s*[;}])/g, (m, a, v) => { const k = slug(v.trim()); if (!defecto.has('--' + k)) defecto.set('--' + k, v.trim()); return `${a}var(--${k})` })).join('')) }
// ── 2) roles por tamaño (segundo valor real = rem × 13,6) ──
const ROL = { minimo: 'max(11px, .75rem)', etiqueta: 'max(12px, .75rem)', secundario: '.9375rem', cuerpo: '1rem', nombre: '1.0625rem', seccion: '1.125rem', grande: '1.25rem', dia: '1.5rem', fecha: '1.75rem', cifra: '1.625rem', titulo: '2.125rem' }
const rolDe = (k, v) => { if (k === '--fs-16px') return null; const r = px(v); if (isNaN(r)) throw new Error('sin px: ' + k)
  return r < 10.99 ? 'minimo' : r < 12 ? 'etiqueta' : r < 13.4 ? 'secundario' : r < 14 ? 'cuerpo' : r < 15 ? 'nombre' : r < 16.5 ? 'seccion' : r < 19 ? 'grande' : r < 21 ? 'dia' : r < 28 ? 'cifra' : 'titulo' }
// ── 3) cambios por selector (nombre del archivo → selector → rol de tamaño y/o peso) ──
const NOMBRE = { 'ficha.module.css': ['.nombre', '.grande .nombre'], 'pantallas.module.css': ['.tarjetaNombre', '.posNombre', '.posPersonaNombre', '.opcionNombre'], 'home-admin-movil.module.css': ['.tarjetaNombre', '.cobNombre'],
  'perfil.module.css': ['.nombre'], 'equipo-telefono.module.css': ['.nombre', '.yo .nombre'], 'servicio.module.css': ['.nombre'], 'lider-movil.module.css': ['.cabNombre', '.personaNombre'], 'canciones.module.css': ['.nombre'],
  'chats.module.css': ['.nombre'], 'chats-movil.css': ['.cm-nombre'], 'songs-movil.css': ['.anc .anc-songRow .anc-songTitle'], 'personas-list.module.css': ['.nm'], 'persona-celda.module.css': ['.nm'],
  'por-equipo.module.css': ['.nombre', '.nm'], 'pantalla-admin.module.css': ['.nombre'], 'checklist.module.css': ['.posNombre'], 'checklist-lider.module.css': ['.posNombre'], 'hoja-bloque-orden.module.css': ['.nombre'],
  'selector-parte.module.css': ['.nombre'], 'menu-parte.module.css': ['.nombre'], 'inicio-telefono.module.css': ['.favNombre'] }
const TAM = { nombre: NOMBRE, titulo: { 'lider-movil.module.css': ['.titulo'], 'components/orden/orden-telefono.module.css': ['.titulo'] }, fecha: { 'pantallas.module.css': ['.heroTit'], 'inicio.module.css': ['.fecha'], 'servicio.module.css': ['.fecha'] },
  cifra: { 'lider-movil.module.css': ['.cifraNum'], 'components/orden/orden-telefono.module.css': ['.pieV'], 'ficha.module.css': ['.grande .dia b'] } }
const PES = { cifra: { 'home-admin-movil.module.css': ['.cifraN', '.personas'], 'lider-movil.module.css': ['.cifraNum'], 'components/orden/orden-telefono.module.css': ['.pieV'], 'ficha.module.css': ['.dia b'], 'inicio.module.css': ['.bloque b'] },
  principal: { 'ficha.module.css': ['.responder'], 'disponibilidad.module.css': ['.reintentar'], 'nueva-cancion-movil.module.css': ['.principal'], 'songs-movil.css': ['.anc .anc-fichaBorr__publicar'] },
  nav: { 'portal-nav.module.css': ['.lb'] } }
const variantes = new Map()   // nombre → { base, rol, tipo }
const aplicar = (tabla, prop, tipo) => { const hecho = new Set(); for (const [rol, porArchivo] of Object.entries(tabla)) for (const [base, sels] of Object.entries(porArchivo)) { const fs_ = archivos().filter(a => a === base || a.endsWith('/' + base)); if (!fs_.length) throw new Error('sin archivo ' + base)
  for (const f of fs_) { const re = prop === 'font-size' ? /(font-size\s*:\s*)var\((--fs-[\w-]+)\)/ : /(font-weight\s*:\s*)var\((--w-\w+)\)/
  let t = leer(f); for (const sel of sels) { let n = 0
    t = t.replace(/([^{}]+)\{([^{}]*)\}/g, (m, s, b) => { const ss = s.replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' '); if (ss !== sel || !re.test(b)) return m
      return m.replace(re, (mm, a, tk) => { if (tipo === 'fs' && rolDe(tk, defecto.get(tk)) === rol) return mm; const nom = `${tk}--${rol}`; variantes.set(nom, { base: tk, rol, tipo }); n++; return `${a}var(${nom})` }) })
    hecho.add(`${f} ${sel}: ${n}`) }
  escribir(f, t) } } return [...hecho] }
const rep = [...aplicar(TAM, 'font-size', 'fs'), ...aplicar(PES, 'font-weight', 'w')]
// ── 4) cambios que solo valen en teléfono (dentro de @media) ──
const enTelefono = (archivo, despuesDe, css) => { const f = archivos().find(a => path.basename(a) === archivo); let t = leer(f); const i = t.indexOf(despuesDe); if (i < 0) throw new Error(`no encuentro «${despuesDe}» en ${archivo}`); const fin = t.indexOf('}', i) + 1
  t = t.slice(0, fin) + `\n@media (max-width:768px){ ${css} }` + t.slice(fin); escribir(f, t) }
// chips neutros: texto sin relleno (los de aviso, «Tu equipo» y los de estado conservan su fondo)
enTelefono('pantallas.module.css', '.chip{', '.chip{ background:none; padding-inline:0; }')
enTelefono('pantallas.module.css', '.chipOk{', '.chipEstado{ background:var(--anc-sunk); padding-inline:10px; }')
enTelefono('cancion-portal.module.css', '.chip{', '.chip{ background:none; box-shadow:none; padding-inline:0; }')
// calendario: los días de otro mes en peso normal; la etiqueta de la barra inferior activa en medio y la inactiva en normal (ver 3)
enTelefono('calendario-home.module.css', '.fuera .dia{', '.fuera .dia{ font-weight:var(--w-normal); }')
enTelefono('team-blocks-calendar.module.css', '.out:hover{', '.out .n{ font-weight:var(--w-normal); }')
{ const f = archivos().find(a => path.basename(a) === 'portal-nav.module.css'); const t = leer(f); if (!/\.on \.lb\{[^}]*font-weight:inherit/.test(t)) throw new Error('nav .on .lb'); }
enTelefono('portal-nav.module.css', '.on .lb{', '.on .lb{ font-weight:var(--w-medio); }')
// «Faltan N», «Tu equipo» y estado: el chip de estado del héroe lleva su propia clase
{ const f = 'components/servicio-movil/PantallaServicio.tsx', t = leer(f), a = "{estado && <span className={`${ui.chip}`}>"; if (!t.includes(a)) throw new Error('hero estado'); escribir(f, t.replace(a, "{estado && <span className={`${ui.chip} ${ui.chipEstado}`}>")) }
// el botón principal de «pantallas»: peso propio (heredaba el del .boton)
{ const f = 'components/servicio-movil/pantallas.module.css', t = leer(f), a = '.botonPrincipal{'; if (!t.includes(a)) throw new Error('botonPrincipal'); escribir(f, t.replace(a, '.botonPrincipal{ font-weight:var(--w-negrita--principal);')); variantes.set('--w-negrita--principal', { base: '--w-negrita', rol: 'principal', tipo: 'w' }) }
// ── 5) ancora-tipo.css ──
const orden = [...defecto.entries()].sort((a, b) => (a[0].startsWith('--w') ? 0 : 1) - (b[0].startsWith('--w') ? 0 : 1) || a[0].localeCompare(b[0], 'en', { numeric: true }))
const vars = [...variantes.entries()].sort((a, b) => a[0].localeCompare(b[0]))
const defVar = vars.map(([n, v]) => `  ${n}: ${defecto.get(v.base)};`)
const fsTel = orden.filter(([k]) => k.startsWith('--fs-')).map(([k, v]) => [k, rolDe(k, v)]).filter(([, r]) => r).map(([k, r]) => `  ${k}: var(--t-${r});`)
const fsVarTel = vars.filter(([, v]) => v.tipo === 'fs').map(([n, v]) => `  ${n}: var(--t-${v.rol});`)
const wVarTel = vars.filter(([, v]) => v.tipo === 'w').map(([n, v]) => `  ${n}: ${v.rol === 'nav' ? 400 : 600};`)
const css = `/* Tokens de tipografía. En ESCRITORIO cada token vale lo que valía el valor suelto al que reemplazó (paso 0). En TELÉFONO (max-width:768px, el bloque de abajo) los valores salen de los ROLES (paso 1): se cambian aquí, en un solo lugar.
   Pesos: normal 400 · medio 500 · fuerte 600 · negrita 700 · negra 800. En teléfono 600, 700 y 800 valen 500; el 600 se reserva para las cifras (--w-…--cifra) y el botón principal (--w-…--principal); la barra inferior usa 400 en la etiqueta inactiva (--w-…--nav).
   Tamaños (antes de la escala 0,85): un token por valor que había (--fs-p75rem = .75rem …) y variantes «--fs-…--rol» para las pocas reglas cuyo rol difiere del de su valor. Roles: minimo 11 px (piso) · etiqueta 12 px (piso de etiquetas y chips) · secundario 15 · cuerpo 16 · nombre 17 · seccion 18 · grande 20 · fecha 24 · cifra 26 · titulo 34.
   Superficies (solo teléfono): --anc-e1 = aro de 1 px, --anc-e2 más suave. No se tocan aquí: globals.css, songs.css, app.module.css, ui.module.css, estilos en línea de TSX. */
:root {
${Object.entries(PESO).map(([n, k]) => `  --w-${k}: ${n};`).join('\n')}
${orden.filter(([k]) => k.startsWith('--fs-')).map(([k, v]) => `  ${k}: ${v};`).join('\n')}
${defVar.join('\n')}
}
/* === TELÉFONO (paso 1) === */
@media (max-width:768px) {
  :root {
${Object.entries(ROL).map(([k, v]) => `    --t-${k}: ${v};`).join('\n')}
    --w-fuerte: 500; --w-negrita: 500; --w-negra: 500;
${wVarTel.map(l => '  ' + l).join('\n')}
${fsTel.map(l => '  ' + l).join('\n')}
${fsVarTel.map(l => '  ' + l).join('\n')}
  }
  /* superficies: el aro de 1 px (con --anc-ring, que ya cambia con el tema) y una sombra más suave; más específico que los bloques de tema de ancora-tokens-v5.css */
  :root:root:root {
    --anc-e1: 0 0 0 1px var(--anc-ring);
    --anc-e2: 0 0 0 1px var(--anc-ring), 0 6px 18px -10px rgba(0,0,0,.28);
  }
}
`
escribir('app/ancora-tipo.css', css)
console.log(rep.join('\n')); console.log('variantes:', vars.length, 'tokens por defecto:', defecto.size)
