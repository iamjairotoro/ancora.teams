// Detalle de un equipo en teléfono (mockups Equipo-Detalle-A/B): «+ Agregar integrante» al pie de la tarjeta, «⋯» con Renombrar / Archivar posición, riel sin archivar, lista de Equipos sin solaparse. Todo condicionado a telefonoYa: el escritorio no cambia. Correr: `node tests/portal/equipo-detalle-movil.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const x = fs.readFileSync(path.join(RAIZ, 'components/TeamsAdminPanel.tsx'), 'utf8'), css = fs.readFileSync(path.join(RAIZ, 'components/ui.module.css'), 'utf8')
correr(async () => {
  await prueba('arriba, en teléfono ya no están «Ajustes» ni «Agregar integrante»; en escritorio siguen igual (misma condición, sin cambiar el marcado)', async () => {
    assert.ok(/\{!telefonoYa && <button className=\{`\$\{styles\.btn\} \$\{styles\.btnGhost\}`\} onClick=\{\(\) => setPageTab\('settings'\)\}>Ajustes<\/button>\}/.test(x))
    assert.ok(/\{!telefonoYa && selectedFilter !== 'leaders' && \(\s*<button className=\{`\$\{styles\.btn\} \$\{styles\.btnPrimary\}`\} onClick=\{toggleAddPerson\}>Agregar integrante<\/button>/.test(x)) })
  await prueba('«+ Agregar integrante» al pie de la tarjeta (teléfono), mismo flujo (toggleAddPerson), misma condición que el de arriba (no con «Líderes») y ANTES del buscador que se despliega', async () => {
    const i = x.indexOf("{telefonoYa && selectedFilter !== 'leaders' && ("), j = x.indexOf("{selectedFilter !== 'leaders' && showAddPerson && (")
    assert.ok(i > 0 && j > i, 'el botón va antes del buscador'); const b = x.slice(i, j)
    assert.ok(/className=\{styles\.treeFoot\}/.test(b) && /onClick=\{toggleAddPerson\}/.test(b) && /<Plus size=\{13\}/.test(b) && /Agregar integrante/.test(b) && /aria-expanded=\{showAddPerson\}/.test(b), 'mismo estilo que «+ Posición» (treeFoot + btnGhost + Plus)') })
  await prueba('«⋯» de la tarjeta de la posición: «Renombrar» y «Archivar posición» (rojo), con las mismas funciones de antes; el lápiz queda solo en escritorio; el archivar del riel se oculta en teléfono (las asas se quedan)', async () => {
    assert.ok(/\{telefonoYa \? \(\s*<div style=\{\{position:'relative'\}\}>\s*<button className="anc-rowMore"/.test(x)); assert.ok(/aria-label=\{`Más acciones de \$\{selectedPosition\.name\}`\}/.test(x))
    assert.ok(/setEditingPosId\(selectedPosition\.id\); setEditingPosName\(selectedPosition\.name\); setShowPosMenu\(false\)[\s\S]*?<Pencil size=\{13\}\/> Renombrar/.test(x)); assert.ok(/className="anc-rowMenuDanger" onClick=\{\(\) => \{ archivePosition\(selectedPosition\); setShowPosMenu\(false\) \}\}>\s*<Archive size=\{13\}\/> Archivar posición/.test(x))
    assert.ok(!/Quitar sección/.test(x)); assert.ok(/title="Renombrar posición"\s*style=\{\{background:'none',border:'none',cursor:'pointer',color:'var\(--ink-3\)'\}\}><Pencil size=\{14\}\/>/.test(x), 'escritorio: el lápiz de siempre')
    assert.ok(/\{!telefonoYa && <button onClick=\{\(\) => archivePosition\(child\)\} title="Archivar"/.test(x)); assert.ok(/<span className=\{styles\.treeGrip\} title="Arrastrar para reordenar">/.test(x), 'las asas se quedan')
    assert.ok(/¿Archivar "\$\{pos\.name\}"\? Afecta a \$\{contar\(memberCount, 'integrante', 'integrantes'\)\} con esta posición — deja de verse aquí y en el selector de Servicio, pero no se borra ningún historial\./.test(x), 'la confirmación no cambia'); assert.ok(!/restaur/i.test(x), 'la app no ofrece restaurar: el texto no lo promete') })
  await prueba('lista de Equipos en teléfono: sin encabezado de columnas; nombre recortado con «…» y debajo «N posiciones · N líderes · N integrantes»; las acciones con zona táctil de ~40 px; escritorio con las 4 columnas de siempre', async () => {
    assert.ok(/\{!telefonoYa && \(\s*<div className=\{styles\.tblHead\} style=\{\{gridTemplateColumns:'2fr 1fr 1fr 1fr auto',display:'grid'\}\}>/.test(x)); assert.ok(/gridTemplateColumns:telefonoYa \? 'minmax\(0,1fr\) auto' : '2fr 1fr 1fr 1fr auto'/.test(x))
    assert.ok(/textOverflow:'ellipsis',whiteSpace:'nowrap'\}\}>\s*\{team\.name\}/.test(x), 'el nombre se recorta con «…»'); assert.ok(/color:tonoTel,maxWidth:'100%',overflowWrap:'anywhere'\}\}>\s*\{contar\(subCount/.test(x), 'los conteos pasan a otra línea en vez de cortarse'); assert.ok(/contar\(subCount, 'posición', 'posiciones'\)\} · \{contar\(leaderCount, 'líder', 'líderes'\)\} · \{contar\(memberCount, 'integrante', 'integrantes'\)/.test(x))
    assert.ok(/const padAccion = telefonoYa \? 13 : 4/.test(x) && (x.match(/padding:padAccion\}\}/g) || []).length === 4); assert.ok(/gridColumn:telefonoYa \? '1 \/ -1' : '1 \/ span 4'/.test(x)) })
  await prueba('estilos de teléfono: tarjetas de radio 22, botón del pie de 46 con radio 13 y «⋯» de 44, dentro del bloque de teléfono de ui.module.css', async () => {
    const m = css.indexOf('/* Teléfono: la letra del panel de Equipos'), b = css.slice(css.indexOf('@media (max-width:768px){', m), css.indexOf('/* Teléfono (B7)'))
    assert.ok(/\.card\{ border-radius:calc\(22px \* var\(--esc, 1\)\); \}/.test(b) && /\.treeFoot \.btn\{ min-height:max\(44px, calc\(46px \* var\(--esc, 1\)\)\); border-radius:calc\(13px \* var\(--esc, 1\)\)/.test(b) && /\.rowMore\{ flex:0 0 max\(44px, 2\.75rem\)/.test(b)) })
  terminar()
})
