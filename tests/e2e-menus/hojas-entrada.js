// Entrada de TODAS las hojas inferiores que comparten hoja.module.css (movimiento M2, arreglo; en M3 todas pasaron a la presencia y esta es la red de seguridad: ninguna hoja puede quedar sin entrada). Las que pasan por la presencia (data-hoja) se miden en hojas.js y hojas-m3.js; las demás (HojaBase y las que la usan, las de la
// lectura, el Orden del servicio, las del líder y las del servicio) deben tener, al abrirse, UNA animación activa de 240 ms con la curva de drawer (y un fundido en el velo), y con «reducir movimiento» solo un fundido de 120 ms. Abre cada hoja que
// se puede abrir en el simulador (escenarios existentes de tests/e2e-menus/escenarios) con cap.js y ANIM_HOJA=1, y lee lo que cada hoja animó un cuadro después de montarse.
// (Los escenarios del líder que tenían botones viejos —p-6, l-4, l-6, s-6— ya no abren una hoja: sus hojas de persona, posición y herramienta se miden en hojas-m3.js.)
// Uso: BASE=http://127.0.0.1:3168 node tests/e2e-menus/hojas-entrada.js
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process')
const E = __dirname, ESC = path.join(E, 'escenarios')
const cargar = f => JSON.parse(fs.readFileSync(path.join(ESC, f), 'utf8'))
const quiero = { 'campos-admin.json': ['a-nuevo-servicio'], 'lider-personas.json': ['p-4-agregar-vacio', 'p-8-servicios-agregar'], 'orden-herramienta.json': ['oh-3-menu', 'oh-7-confirmar-actualizar'], 'hojas-m2fix-portal.json': ['f-preferencias', 'f-tonalidad'] }
const lista = []; for (const [f, ids] of Object.entries(quiero)) for (const e of cargar(f)) if (ids.includes(e.id)) lista.push({ ...e, menu: '[role=dialog]' })
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hojas-entrada-')), json = path.join(dir, 'esc.json'); fs.writeFileSync(json, JSON.stringify(lista))
const falla = []; const ok = (c, m) => { console.log(c ? '  ok  ' : '  FALLA', m); if (!c) falla.push(m) }
const correr = reducir => { const out = path.join(dir, reducir ? 'reducido' : 'normal'); spawnSync('node', [path.join(E, 'cap.js'), out], { env: { ...process.env, ESC_JSON: json, ANIM_HOJA: '1', ANCHOS: '390', TEMAS: 'light', ...(reducir ? { REDUCIR: '1' } : {}) }, encoding: 'utf8', timeout: 900000 })
  return JSON.parse(fs.readFileSync(path.join(out, 'resultados.json'), 'utf8')) }
const resumen = r => `${r.id}: ${(r.anim || []).filter(a => a.clase === 'hoja').map(a => `«${String(a.titulo).trim().slice(0, 28)}»`).join(', ') || 'ninguna hoja'}`
for (const reducir of [false, true]) {
  console.log(reducir ? '\nCon «reducir movimiento»' : 'Entrada normal')
  const res = correr(reducir); let hojas = 0
  for (const r of res) {
    const todas = (r.anim || []).filter(a => a.clase === 'hoja'), hs = todas.filter(a => !a.presencia), vs = (r.anim || []).filter(a => a.clase === 'velo' && !a.presencia)
    if (!r.encontrado || !(r.anim || []).some(a => a.clase === 'hoja')) { console.log('  --  ' + resumen(r) + ' (no se abrió en el simulador; no cuenta)'); continue }
    if (!hs.length) { hojas++; console.log('  ok   ' + resumen(r) + ' (usa la presencia —data-hoja—: entrada y salida medidas en hojas.js y hojas-m3.js)'); continue }
    hojas++
    for (const h of hs) {
      const nombre = `${r.id} «${String(h.titulo).trim().slice(0, 30)}»`
      if (reducir) ok(h.anims.length === 1 && /anc-hoja-fundido/.test(h.anims[0].n) && h.anims[0].d === 120 && /linear/.test(h.anims[0].e), `${nombre}: solo un fundido de 120 ms (${JSON.stringify(h.anims)})`)
      else ok(h.anims.length === 1 && /anc-hoja-(sube|aparece)/.test(h.anims[0].n) && h.anims[0].d === 240 && /cubic-bezier\(0\.32, 0\.72, 0, 1\)/.test(h.anims[0].e), `${nombre}: sube con una animación de 240 ms y la curva de drawer (${JSON.stringify(h.anims)})`)
    }
    for (const v of vs) ok(v.anims.length === 1 && /anc-hoja-(velo|fundido)/.test(v.anims[0].n) && v.anims[0].d === (reducir ? 120 : 240), `${r.id}: el velo hace su fundido (${JSON.stringify(v.anims)})`)
  }
  ok(hojas >= 6, `se midieron las hojas de ${hojas} escenas distintas (mínimo 6)`)
}
console.log(falla.length ? `\n${falla.length} con problema` : '\nTodo correcto'); process.exit(falla.length ? 1 : 0)
