'use client'
// Panel de diagnóstico del viewport, SOLO para depurar en el teléfono (fuera de la rama main; lib/diagnosticoViewport.ts decide). Se enciende con ?debug=viewport, se minimiza con «–», se apaga con «×» (o ?debug=off) y «Copiar» deja
// las medidas como texto para pegarlas. Muestra en vivo, en la esquina de arriba a la derecha: innerHeight, visualViewport (height, offsetTop, pageTop, scale), el desfase (innerHeight − height − offsetTop: con el teclado cerrado debe ser 0),
// el bottom del menú inferior, el alto de .statusFade, --safe-top y env(safe-area-inset-top), si la app está instalada (display-mode: standalone), cuántas hojas hay abiertas y el top de la hoja, y cuánto hace del último evento del viewport.
// No escribe nada en la página ni cambia ninguna medida: solo lee.
import { useEffect, useRef, useState } from 'react'
import { CLAVE_DIAGNOSTICO, EVENTO_DIAGNOSTICO, decidirDiagnostico, desfase } from '@/lib/diagnosticoViewport'

type Fila = [string, string]

function leer(ultimoEvento: number, evento: string): Fila[] {
  const vv = window.visualViewport, ih = window.innerHeight
  const vvh = vv?.height ?? NaN, vvTop = vv?.offsetTop ?? NaN, pageTop = vv?.pageTop ?? NaN, escala = vv?.scale ?? NaN
  const navs = Array.from(document.querySelectorAll('nav')).filter(n => getComputedStyle(n).position === 'fixed')
  const nav = navs[0], rn = nav?.getBoundingClientRect()
  const fade = document.querySelector('[class*="statusFade"]'), rf = fade?.getBoundingClientRect()
  const sonda = document.createElement('div'); sonda.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none'; document.body.appendChild(sonda)
  const env = sonda.getBoundingClientRect().height; sonda.remove()
  const hojas = Array.from(document.querySelectorAll('[data-hoja],[data-pantalla],[data-ventana]')), vivas = hojas.filter(h => !h.hasAttribute('data-saliendo'))
  const h0 = vivas[0] ?? hojas[0], rh = h0?.getBoundingClientRect(), ch = h0 ? getComputedStyle(h0) : null
  const standalone = window.matchMedia('(display-mode: standalone)').matches, navStd = (navigator as unknown as { standalone?: boolean }).standalone
  const f = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 10) / 10) : '—')
  const dsf = vv ? desfase({ ih, vvh, vvTop, vvPageTop: pageTop, escala }) : NaN
  const act = document.activeElement as HTMLElement | null
  return [
    ['innerHeight', f(ih)], ['vv.height', f(vvh)], ['vv.offsetTop', f(vvTop)], ['vv.pageTop', f(pageTop)], ['vv.scale', f(escala)],
    ['desfase (ih−vv.h−top)', f(dsf) + (dsf > 120 ? '  ⚠ teclado o viejo' : '')],
    ['nav.bottom', rn ? f(rn.bottom) + '  (ih−bottom=' + f(ih - rn.bottom) + ')' : 'sin nav fijo'],
    ['.statusFade alto', rf ? f(rf.height) : 'no existe'], ['--safe-top', getComputedStyle(document.documentElement).getPropertyValue('--safe-top').trim() || '—'], ['env(safe-top)', f(env)],
    ['instalada (standalone)', (standalone ? 'sí' : 'no') + (navStd !== undefined ? ' · nav.standalone=' + navStd : '')],
    ['hojas abiertas', String(vivas.length) + (hojas.length !== vivas.length ? ' (+' + (hojas.length - vivas.length) + ' saliendo)' : '')],
    ['hoja top / alto', rh ? f(rh.top) + ' / ' + f(rh.height) + (ch ? ' · op ' + ch.opacity + ' · tr ' + ch.translate : '') : '—'],
    ['hoja bottom / maxH', h0 ? (h0 as HTMLElement).style.bottom + ' / ' + (h0 as HTMLElement).style.maxHeight : '—'],
    ['scrollY / alto página', f(window.scrollY) + ' / ' + f(document.documentElement.scrollHeight)],
    ['foco', act && act !== document.body ? act.tagName.toLowerCase() : 'ninguno'],
    ['último evento', evento + ' hace ' + (Math.round((performance.now() - ultimoEvento) / 100) / 10) + ' s'],
  ]
}

export default function DiagnosticoViewport() {
  const [activo, setActivo] = useState(false), [mini, setMini] = useState(false), [filas, setFilas] = useState<Fila[]>([]), [copiado, setCopiado] = useState(false)
  const ultimo = useRef({ t: 0, e: 'carga' }), caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const decidir = (conParametro: boolean) => {
      let guardado: string | null = null
      try { guardado = localStorage.getItem(CLAVE_DIAGNOSTICO) } catch { /* sin almacenamiento */ }
      const d = decidirDiagnostico({ rama: process.env.NEXT_PUBLIC_ANC_RAMA, search: conParametro ? window.location.search : '', guardado })
      try { if (d.guardar === '1') localStorage.setItem(CLAVE_DIAGNOSTICO, '1'); else if (d.guardar === null) localStorage.removeItem(CLAVE_DIAGNOSTICO) } catch { /* sin almacenamiento */ }
      setActivo(d.activo)
    }
    decidir(true)
    const alToque = () => { setMini(false); decidir(false) }      // los 5 toques sobre el título de Perfil (lib/diagnosticoViewport.ts → toqueEnTitulo)
    window.addEventListener(EVENTO_DIAGNOSTICO, alToque)
    return () => window.removeEventListener(EVENTO_DIAGNOSTICO, alToque)
  }, [])

  useEffect(() => {
    if (!activo) return
    ultimo.current = { t: performance.now(), e: 'carga' }
    const marca = (e: string) => () => { ultimo.current = { t: performance.now(), e } }
    const vv = window.visualViewport, fn: [EventTarget | null, string, () => void][] = [
      [vv, 'resize', marca('vv.resize')], [vv, 'scroll', marca('vv.scroll')], [window, 'resize', marca('resize')], [window, 'orientationchange', marca('orientation')],
      [document, 'focusin', marca('focusin')], [document, 'focusout', marca('focusout')],
    ]
    for (const [t, n, f] of fn) t?.addEventListener(n, f)
    const pintar = () => setFilas(leer(ultimo.current.t, ultimo.current.e))
    pintar(); const id = setInterval(pintar, 250)      // también sin eventos: lo que importa es ver un valor que se quedó viejo
    return () => { for (const [t, n, f] of fn) t?.removeEventListener(n, f); clearInterval(id) }
  }, [activo])

  if (!activo) return null
  const apagar = () => { try { localStorage.removeItem(CLAVE_DIAGNOSTICO) } catch { /* sin almacenamiento */ } setActivo(false) }
  const copiar = () => {
    const r = caja.current?.getBoundingClientRect(), txt = filas.map(([k, v]) => `${k}: ${v}`).join('\n') + (r ? `\npanel.top: ${Math.round(r.top)}` : '')
    navigator.clipboard?.writeText(txt).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1200) }).catch(() => {})
  }
  const bt: React.CSSProperties = { font: 'inherit', color: '#fff', background: 'rgba(255,255,255,.18)', border: 0, borderRadius: 4, padding: '2px 7px', minHeight: 22 }
  return (
    <div ref={caja} data-diagnostico-viewport role="status" aria-label="Diagnóstico del viewport"
      style={{ position: 'fixed', top: 4, right: 4, zIndex: 'var(--z-arranque)', maxWidth: 'min(300px, calc(100vw - 8px))', background: 'rgba(0,0,0,.84)', color: '#fff', borderRadius: 8, padding: 6, font: '10px/1.3 ui-monospace, Menlo, monospace', WebkitTextSizeAdjust: '100%' }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
        <b>viewport · {process.env.NEXT_PUBLIC_ANC_RAMA}</b>
        <span style={{ display: 'flex', gap: 4 }}>
          <button type="button" style={bt} onClick={copiar}>{copiado ? 'ok' : 'Copiar'}</button>
          <button type="button" style={bt} onClick={() => setMini(m => !m)} aria-label={mini ? 'Mostrar el panel' : 'Minimizar el panel'}>{mini ? '+' : '–'}</button>
          <button type="button" style={bt} onClick={apagar} aria-label="Ocultar el panel de diagnóstico">×</button>
        </span>
      </div>
      {!mini && <div style={{ marginTop: 4, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8, rowGap: 1 }}>
        {filas.map(([k, v]) => [<span key={k} style={{ opacity: .65 }}>{k}</span>, <span key={k + 'v'} style={{ wordBreak: 'break-word' }}>{v}</span>])}
      </div>}
    </div>
  )
}
