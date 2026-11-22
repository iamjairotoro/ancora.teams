// Panel de diagnóstico del viewport (solo depuración en el teléfono): cuándo existe, que nunca esté en `main` y que solo LEA (no cambie ninguna medida de la página). La prueba en navegador real está en tests/e2e-menus/diagnostico-viewport.js.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const D = require(resolver(path.join(RAIZ, 'lib/diagnosticoViewport')))

correr(async () => {
  await prueba('en la rama main el panel NUNCA existe, ni pidiéndolo con el enlace ni con lo guardado', () => {
    assert.deepEqual(D.decidirDiagnostico({ rama: 'main', search: '?debug=viewport', guardado: '1' }), { activo: false, guardar: null })
    assert.equal(D.decidirDiagnostico({ rama: 'main', search: '', guardado: '1' }).activo, false) })
  await prueba('fuera de main: ?debug=viewport lo enciende y lo deja guardado en la pestaña; ?debug=off lo apaga; sin parámetro sigue lo guardado; sin nada, apagado', () => {
    for (const rama of ['dev', 'local', 'feature/x']) {
      assert.deepEqual(D.decidirDiagnostico({ rama, search: '?debug=viewport', guardado: null }), { activo: true, guardar: '1' })
      assert.deepEqual(D.decidirDiagnostico({ rama, search: '?tab=setlist&debug=viewport', guardado: null }), { activo: true, guardar: '1' })
      assert.deepEqual(D.decidirDiagnostico({ rama, search: '?debug=off', guardado: '1' }), { activo: false, guardar: null })
      assert.deepEqual(D.decidirDiagnostico({ rama, search: '', guardado: '1' }), { activo: true, guardar: undefined })
      assert.deepEqual(D.decidirDiagnostico({ rama, search: '', guardado: null }), { activo: false, guardar: undefined })
      assert.equal(D.decidirDiagnostico({ rama, search: '?debug=otra', guardado: null }).activo, false) } })
  await prueba('el desfase: 0 con el teclado cerrado; con el teclado abierto es lo que tapa; un offsetTop viejo se descuenta', () => {
    assert.equal(D.desfase({ ih: 844, vvh: 844, vvTop: 0, vvPageTop: 0, escala: 1 }), 0); assert.equal(D.desfase({ ih: 844, vvh: 484, vvTop: 0, vvPageTop: 0, escala: 1 }), 360)
    assert.equal(D.desfase({ ih: 844, vvh: 484, vvTop: 360, vvPageTop: 360, escala: 1 }), 0) })
  await prueba('5 toques seguidos sobre el título de Perfil: el quinto enciende; uno tardío (más de 1,5 s) reinicia la cuenta; tras encender la cuenta vuelve a 0', () => {
    let c = { n: 0, t: 0 }, t = 1000; const toca = dt => { t += dt; const r = D.contarToque(c, t); c = r.cuenta; return r.enciende }
    assert.deepEqual([toca(0), toca(300), toca(300), toca(300)], [false, false, false, false]); assert.equal(toca(300), true, 'el quinto'); assert.equal(c.n, 0)
    assert.deepEqual([toca(0), toca(300), toca(300), toca(1600), toca(300), toca(300), toca(300)], [false, false, false, false, false, false, false], 'el cuarto llegó tarde: empieza de nuevo')
    assert.equal(toca(300), true, 'cinco seguidos después del reinicio') })
  await prueba('toqueEnTitulo (ejecutado): en dev guarda el encendido en localStorage y avisa al panel; en main no cuenta ni guarda ni avisa', () => {
    const guardado = {}, avisos = []
    global.window = { localStorage: { setItem: (k, v) => { guardado[k] = v } }, dispatchEvent: e => { avisos.push(e.type) } }
    let r = []; for (let i = 0; i < 5; i++) r.push(D.toqueEnTitulo('dev', 5000 + i * 200))
    assert.deepEqual(r, [false, false, false, false, true]); assert.deepEqual(guardado, { [D.CLAVE_DIAGNOSTICO]: '1' }); assert.deepEqual(avisos, [D.EVENTO_DIAGNOSTICO])
    for (const k of Object.keys(guardado)) delete guardado[k]; avisos.length = 0
    for (let i = 0; i < 12; i++) assert.equal(D.toqueEnTitulo('main', 9000 + i * 100), false)
    assert.deepEqual(guardado, {}); assert.deepEqual(avisos, []); delete global.window })
  await prueba('el componente solo lee: no escribe estilos en la página (salvo la sonda invisible de env()) y se monta una vez en el layout raíz', () => {
    const c = sinCom(leer('components/DiagnosticoViewport.tsx')), l = leer('app/layout.tsx'), n = leer('next.config.js')
    assert.ok(!/sessionStorage/.test(c) && /localStorage\.getItem\(CLAVE_DIAGNOSTICO\)/.test(c) && /localStorage\.removeItem\(CLAVE_DIAGNOSTICO\)/.test(c), 'guarda en localStorage (el de la app instalada), no en sessionStorage')
    assert.match(c, /addEventListener\(EVENTO_DIAGNOSTICO/); const pf = leer('app/portal/_components/perfil/Perfil.tsx'); assert.equal((pf.match(/<h1 className=\{ui\.titulo\} onClick=\{\(\) => \{ toqueEnTitulo\(\) \}\}>Perfil<\/h1>/g) || []).length, 2, 'el título de Perfil (teléfono y escritorio) cuenta los toques')
    assert.ok(!/\.style\.(top|bottom|height|maxHeight|transform|setProperty)\s*=|style\.setProperty\(|removeProperty|scrollTo\(|scrollIntoView|\.focus\(|\.blur\(/.test(c), 'no cambia medidas, foco ni desplazamiento')
    assert.match(c, /position:fixed;top:0;height:env\(safe-area-inset-top,0px\);visibility:hidden;pointer-events:none/); assert.equal((l.match(/<DiagnosticoViewport \/>/g) || []).length, 1)
    assert.match(n, /NEXT_PUBLIC_ANC_RAMA: process\.env\.VERCEL_GIT_COMMIT_REF \|\| 'local'/)
    for (const k of ['innerHeight', 'vv.height', 'vv.offsetTop', 'vv.pageTop', 'nav.bottom', '.statusFade alto', '--safe-top', 'standalone', 'hojas abiertas', 'hoja top']) assert.ok(c.includes(k), k) })
  terminar()
})
