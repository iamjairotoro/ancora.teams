// El componente del calendario de los Home (bloque A3 · paso 2): medidas, que no tenga tarjeta de detalle, que solo los días con servicio sean tocables y que use la lógica pura. Correr: `node tests/portal/calendario-home.test.js`.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), sin = f => leer(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const css = sin('components/home/calendario-home.module.css'), esc = px => `calc(${px}px * var(--esc, 1))`, tsx = sin('components/home/CalendarioHome.tsx')
const regla = sel => { const i = css.indexOf(sel + '{'); if (i < 0) throw new Error('falta ' + sel); return css.slice(i + sel.length + 1, css.indexOf('}', i)) }
correr(async () => {
  await prueba('medidas (× --esc): sección de radio 22; «Hoy» y flechas de 44+; el selector Semana/Mes con botones de 36+; celdas de día de 44+; hoy con anillo, elegido relleno; solo tokens', async () => {
    assert.ok(regla('.raiz').includes(`border-radius:${esc(22)}`)); assert.ok(regla('.hoy').includes(`min-height:max(44px, ${esc(46)})`)); assert.ok(regla('.nav').includes(`min-height:max(44px, ${esc(46)})`)); assert.ok(regla('.celda').includes(`min-height:max(44px, ${esc(52)})`))
    assert.ok(regla('.vista button').includes(`min-height:max(36px, ${esc(38)})`)); assert.ok(/box-shadow:inset 0 0 0 calc\(2px \* var\(--esc, 1\)\) var\(--anc-modo-ink\)/.test(regla('.esHoy .dia'))); assert.ok(/background:var\(--anc-accent\)/.test(regla('.elegido .dia')))
    assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(css), 'solo tokens'); assert.ok(regla('.dia').includes(`width:${esc(36)}`)) })
  await prueba('las marcas se leen por la FORMA: punto relleno = servicio, anillo = ensayo, raya = bloqueado (el color solo identifica al equipo)', async () => {
    assert.ok(/background:var\(--anc-team-a\)/.test(regla('.punto'))); assert.ok(/background:none; box-shadow:inset 0 0 0/.test(regla('.ensayo'))); assert.ok(regla('.raya').includes('height:calc(2px')); assert.ok(/m\.tipo === 'ensayo'/.test(tsx) && /m\.tipo === 'bloqueado'/.test(tsx)) })
  await prueba('sin tarjeta de detalle: solo los días con servicio o ensayo son botones (abren ese servicio); un día vacío o solo bloqueado es un grupo que no hace nada', async () => {
    assert.ok(/destino\s*\? <button[^]*onAbrir\?\.\(destino\.servicioId, destino\.equipoId\)[^]*: <div key=\{d\.fecha\} role="group"/.test(tsx)); assert.ok(!/detalle|noDisponibles|bloqueos\}/i.test(tsx), 'sin tarjeta de detalle'); assert.ok(/destino = onAbrir \? servicioDelDia\(marcas\.get\(d\.fecha\)\) : null/.test(tsx), 'sin destino (un líder) ningún día abre nada') })
  await prueba('«Hoy», Semana/Mes (aria-pressed), flechas del mes con nombre accesible, semana por deslizamiento y por botones ocultos; los textos salen de lib/textos/homeNuevo.ts; la leyenda es opcional', async () => {
    for (const x of ['T.hoy', 'T.semana', 'T.mes', 'T.mesAnterior', 'T.mesSiguiente', 'T.semanaAnterior', 'T.semanaSiguiente', 'T.leyendaServicio', 'T.leyendaEnsayo', 'T.leyendaBloqueado', "aria-pressed={vista === 'semana'}", "aria-pressed={vista === 'mes'}", 'onTouchEnd']) assert.ok(tsx.includes(x), 'falta ' + x)
    assert.ok(/from '@\/lib\/home\/calendario'/.test(tsx) && /from '@\/lib\/textos\/homeNuevo'/.test(tsx)); assert.ok(!/%/.test(tsx), 'sin porcentajes') })
  terminar()
})
