'use client'
/* Visor de PDF dentro de la app (punto 55, commit 3). Referencia: docs/mockup-musico-v2.html (.pdfv).
   - pdf.js (pdfjs-dist 6.3.289, build LEGACY para iOS 15/16) se carga con import() SOLO al abrir este visor; el worker sale de nuestro
     propio dominio (/pdfjs/pdf.worker.<versión>.min.mjs, copiado por scripts/copy-pdfjs-worker.js). Sin wasm, cmaps ni fuentes estándar: si un PDF no se
     puede dibujar se dice con claridad y ↗ sigue disponible. Esta versión no tiene `isEvalSupported` (ya no usa eval) y el sandbox
     de scripting de PDF no se carga: no hay scripting.
   - El PDF se descarga ENTERO al abrir (URL firmada de 5 min, firmada al pulsar «Ver»); si la URL venció se vuelve a firmar UNA vez.
     Más de 30 MB: no se descarga, solo ↗ (lo decide quien lo abre y también se corta aquí si pesara más de lo declarado).
   - Solo se dibujan las páginas visibles (+ medio alto de margen) y el lienzo de cada página tiene un tope de ~12 millones de píxeles.
   - Zoom: − / + / Ajustar siempre; doble toque o doble clic; pellizco (solo hace zoom del PDF: touch-action:pan-x pan-y y los eventos
     gesture* de Safari cancelados); Ctrl+rueda y teclas + − 0 en escritorio. ◐ invierte los colores; ↗ abre el visor del teléfono.
   - Diálogo accesible: role="dialog" con nombre, foco atrapado, Escape y ✕, el foco vuelve a donde estaba. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import {
  ErrorVisor, PASO_ZOOM, descargarPdf, desplazamientoTrasZoom, escalaDeLienzo, limitarZoom, paginaActual, paginasVisibles,
  zoomDobleToque, zoomPorFactor, zoomTrasPellizco,
} from '@/lib/pdfVisor'
import ui from './visor-pdf.module.css'

type Pdfjs = typeof import('pdfjs-dist/legacy/build/pdf.mjs')
let pdfjsPromesa: Promise<Pdfjs> | null = null
/** Carga pdf.js la primera vez que se abre un PDF; si falla (sin red) la próxima apertura lo vuelve a intentar. */
function cargarPdfjs(): Promise<Pdfjs> {
  if (!pdfjsPromesa) {
    pdfjsPromesa = import('pdfjs-dist/legacy/build/pdf.mjs').then(m => {
      // El worker sale de NUESTRO dominio: public/pdfjs/ (lo copia scripts/copy-pdfjs-worker.js en prebuild/predev). La versión va en el
      // nombre y se toma de la librería cargada, así los dos siempre coinciden.
      m.GlobalWorkerOptions.workerSrc = `/pdfjs/pdf.worker.${m.version}.min.mjs`
      return m
    }).catch(e => { pdfjsPromesa = null; throw e })
  }
  return pdfjsPromesa
}

const MARGEN_LATERAL = 12

interface MensajeError { texto: string; reintentar: boolean }
function mensajeDe(e: unknown): MensajeError {
  if (e instanceof ErrorVisor) {
    switch (e.codigo) {
      case 'grande': return { texto: 'Este PDF pesa más de 30 MB y no se abre dentro de la app. Ábrelo con ↗ en el visor del teléfono.', reintentar: false }
      case 'vencida': return { texto: 'El enlace del archivo venció y no se pudo renovar. Cierra el visor y vuelve a pulsar «Ver».', reintentar: true }
      case 'no_existe': return { texto: 'No se encontró el archivo. Puede que lo hayan quitado.', reintentar: false }
      case 'red': return { texto: 'No se pudo descargar el PDF. Revisa tu conexión e inténtalo de nuevo.', reintentar: true }
      default: return { texto: 'No se pudo descargar el PDF. Inténtalo de nuevo o ábrelo con ↗ en el visor del teléfono.', reintentar: true }
    }
  }
  const nombre = (e as { name?: string })?.name
  if (nombre === 'PasswordException') return { texto: 'Este PDF está protegido con contraseña. Ábrelo con ↗ en el visor del teléfono.', reintentar: false }
  if (nombre === 'InvalidPDFException' || nombre === 'FormatError' || nombre === 'MissingPDFException')
    return { texto: 'No se pudo dibujar este PDF: el archivo está dañado o no es un PDF válido. Prueba con ↗ en el visor del teléfono.', reintentar: false }
  return { texto: 'No se pudo abrir este PDF dentro de la app. Prueba con ↗ en el visor del teléfono.', reintentar: true }
}

export default function VisorPdf({ nombre, firmar, onAbrirTelefono, onCerrar }: {
  nombre: string
  /** Pide una URL firmada NUEVA del archivo (el visor la llama al abrir y, como mucho, una vez más si la primera venció). */
  firmar: () => Promise<string>
  /** ↗: abrir en el visor del teléfono. Siempre disponible, también con errores. */
  onAbrirTelefono: () => void
  onCerrar: () => void
}) {
  const [fase, setFase] = useState<'descargando' | 'abriendo' | 'listo' | 'error'>('descargando')
  const [error, setError] = useState<MensajeError | null>(null)
  const [progreso, setProgreso] = useState<number | null>(null)
  const [tamanos, setTamanos] = useState<{ w: number; h: number }[]>([])
  const [zoom, setZoom] = useState(1)
  const [ancho, setAncho] = useState(0)                 // ancho disponible para una página a 100 % (px CSS)
  const [invertido, setInvertido] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [intento, setIntento] = useState(0)
  const [paginasError, setPaginasError] = useState<number[]>([])

  const dialogRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<HTMLDivElement>(null)
  const cerrarRef = useRef<HTMLButtonElement>(null)
  const docRef = useRef<PDFDocumentProxy | null>(null)
  const zoomRef = useRef(1)
  const anchoRef = useRef(0)
  const generacion = useRef(0)
  const montado = useRef(true)
  const cola = useRef<Promise<void>>(Promise.resolve())
  const hechas = useRef(new Map<number, { anchoCss: number; canvas: HTMLCanvasElement }>())
  const tareas = useRef(new Map<number, RenderTask>())
  const pendiente = useRef<{ left: number; top: number } | null>(null)
  const firmarRef = useRef(firmar); firmarRef.current = firmar
  const cerrarFn = useRef(onCerrar); cerrarFn.current = onCerrar
  const tamanosRef = useRef(tamanos); tamanosRef.current = tamanos
  zoomRef.current = zoom
  anchoRef.current = ancho

  // ── ciclo de vida del diálogo: foco, scroll del fondo, ancho disponible ──
  useEffect(() => {
    montado.current = true
    const abridor = document.activeElement as HTMLElement | null
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cerrarRef.current?.focus()
    return () => {
      montado.current = false
      document.body.style.overflow = prev
      abridor?.focus?.()
    }
  }, [])

  useEffect(() => {
    const sc = scrollRef.current
    if (!sc) return
    const medir = () => setAncho(Math.max(120, sc.clientWidth - 2 * MARGEN_LATERAL))
    medir()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    ro?.observe(sc)
    window.addEventListener('resize', medir)
    return () => { ro?.disconnect(); window.removeEventListener('resize', medir) }
  }, [])

  // ── dibujo: solo las páginas visibles ──
  const liberar = useCallback((i: number) => {
    tareas.current.get(i)?.cancel(); tareas.current.delete(i)
    const h = hechas.current.get(i)
    if (h) { h.canvas.width = 0; h.canvas.height = 0; h.canvas.remove(); hechas.current.delete(i) }
  }, [])

  const geometria = useCallback(() => {
    const sc = scrollRef.current
    const els = sc ? Array.from(sc.querySelectorAll<HTMLElement>('[data-pg]')) : []
    const base = sc ? sc.getBoundingClientRect().top - sc.scrollTop : 0
    return { sc, els, tops: els.map(e => e.getBoundingClientRect().top - base), alturas: els.map(e => e.offsetHeight) }
  }, [])

  const dibujar = useCallback(async (i: number, gen: number) => {
    const doc = docRef.current
    if (!doc || gen !== generacion.current || !montado.current) return
    const celda = scrollRef.current?.querySelector<HTMLElement>(`[data-pg="${i}"] [data-lienzo]`)
    if (!celda) return
    const page = await doc.getPage(i + 1)
    try {
      if (gen !== generacion.current || !montado.current) return
      const vp1 = page.getViewport({ scale: 1 })
      const anchoCss = anchoRef.current * zoomRef.current
      const escCss = anchoCss / vp1.width
      const k = escalaDeLienzo(anchoCss, vp1.height * escCss, window.devicePixelRatio || 1)
      const vp = page.getViewport({ scale: escCss * k })
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.floor(vp.width)); canvas.height = Math.max(1, Math.floor(vp.height))
      const tarea = page.render({ canvas, viewport: vp })
      tareas.current.set(i, tarea)
      await tarea.promise
      tareas.current.delete(i)
      if (gen !== generacion.current || !montado.current) { canvas.width = 0; canvas.height = 0; return }
      hechas.current.get(i)?.canvas.remove()
      celda.replaceChildren(canvas)                      // el lienzo viejo se cambia recién cuando el nuevo está listo (sin parpadeo)
      hechas.current.set(i, { anchoCss, canvas })
      setPaginasError(p => (p.includes(i) ? p.filter(x => x !== i) : p))
    } catch (e) {
      tareas.current.delete(i)
      if ((e as { name?: string })?.name === 'RenderingCancelledException') return
      if (montado.current) setPaginasError(p => (p.includes(i) ? p : [...p, i]))
    } finally {
      page.cleanup()
    }
  }, [])

  const actualizar = useCallback(() => {
    const doc = docRef.current
    const { sc, tops, alturas } = geometria()
    if (!doc || !sc || !tops.length) return
    const anchoCss = anchoRef.current * zoomRef.current
    const visibles = paginasVisibles(tops, alturas, sc.scrollTop, sc.clientHeight, sc.clientHeight * 0.5)
    const set = new Set(visibles)
    for (const i of Array.from(hechas.current.keys())) if (!set.has(i)) liberar(i)        // fuera de la ventana: se suelta la memoria
    const gen = generacion.current
    for (const i of visibles) {
      const h = hechas.current.get(i)
      if (!h || Math.abs(h.anchoCss - anchoCss) > 0.5) cola.current = cola.current.then(() => dibujar(i, gen))
    }
    setPagina(paginaActual(tops, alturas, sc.scrollTop, sc.clientHeight) + 1)
  }, [dibujar, geometria, liberar])

  // Tras un cambio de zoom o de ancho: se reubica el desplazamiento (el punto enfocado queda donde estaba) y se vuelve a dibujar.
  useLayoutEffect(() => {
    const sc = scrollRef.current
    if (pendiente.current && sc) { sc.scrollLeft = pendiente.current.left; sc.scrollTop = pendiente.current.top; pendiente.current = null }
    generacion.current++
    Array.from(tareas.current.values()).forEach(t => t.cancel())
    tareas.current.clear()
    actualizar()
  }, [zoom, ancho, tamanos, actualizar])

  // ── zoom ──
  const aplicarZoom = useCallback((nuevo: number, fx?: number, fy?: number, aSuIzquierda = false) => {
    const sc = scrollRef.current
    const z0 = zoomRef.current, z1 = limitarZoom(nuevo)
    if (!sc || z1 === z0) return
    const x = fx ?? sc.clientWidth / 2, y = fy ?? sc.clientHeight / 2
    pendiente.current = {
      left: aSuIzquierda ? 0 : desplazamientoTrasZoom(sc.scrollLeft, x, z0, z1),
      top: desplazamientoTrasZoom(sc.scrollTop, y, z0, z1),
    }
    zoomRef.current = z1
    setZoom(z1)
  }, [])
  const aplicarRef = useRef(aplicarZoom); aplicarRef.current = aplicarZoom

  // Gestos: el pellizco hace zoom SOLO del PDF (touch-action en el CSS + eventos gesture* de Safari cancelados aquí).
  useEffect(() => {
    const sc = scrollRef.current, dlg = dialogRef.current, pag = pagesRef.current
    if (!sc || !dlg || !pag) return
    const rel = (x: number, y: number): [number, number] => { const r = sc.getBoundingClientRect(); return [x - r.left, y - r.top] }
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const medio = (t: TouchList) => rel((t[0].clientX + t[1].clientX) / 2, (t[0].clientY + t[1].clientY) / 2)
    let pin: { d0: number; z0: number; fx: number; fy: number; s: number } | null = null
    let ultimo = 0, ux = 0, uy = 0, toqueDoble = 0, huboPellizco = false

    const empieza = (e: TouchEvent) => {
      if (e.touches.length === 2) { const [fx, fy] = medio(e.touches); pin = { d0: dist(e.touches), z0: zoomRef.current, fx, fy, s: 1 }; huboPellizco = true }
    }
    const mueve = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pin) return
      if (e.cancelable) e.preventDefault()
      const [fx, fy] = medio(e.touches)
      pin.fx = fx; pin.fy = fy
      pin.s = zoomTrasPellizco(pin.z0, pin.d0, dist(e.touches)) / pin.z0
      pag.style.transformOrigin = `${fx + sc.scrollLeft}px ${fy + sc.scrollTop}px`   // durante el gesto solo se escala lo dibujado
      pag.style.transform = `scale(${pin.s})`
    }
    const termina = (e: TouchEvent) => {
      if (pin && e.touches.length < 2) {
        const p = pin; pin = null
        pag.style.transform = ''; pag.style.transformOrigin = ''
        aplicarRef.current(p.z0 * p.s, p.fx, p.fy)                                   // al soltar: se fija el zoom y se vuelve a dibujar nítido
        return
      }
      if (e.touches.length === 0 && e.changedTouches.length === 1) {
        if (huboPellizco) { huboPellizco = false; return }
        const c = e.changedTouches[0], ahora = Date.now()
        if (ahora - ultimo < 300 && Math.hypot(c.clientX - ux, c.clientY - uy) < 30) {
          toqueDoble = ahora; ultimo = 0
          const [fx, fy] = rel(c.clientX, c.clientY)
          aplicarRef.current(zoomDobleToque(zoomRef.current), fx, fy)
        } else { ultimo = ahora; ux = c.clientX; uy = c.clientY }
      }
    }
    const doble = (e: MouseEvent) => {
      if (Date.now() - toqueDoble < 600) return                                      // el doble toque ya se atendió
      const [fx, fy] = rel(e.clientX, e.clientY)
      aplicarRef.current(zoomDobleToque(zoomRef.current), fx, fy)
    }
    const rueda = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const [fx, fy] = rel(e.clientX, e.clientY)
      aplicarRef.current(zoomPorFactor(zoomRef.current, Math.exp(-e.deltaY * 0.01)), fx, fy)
    }
    const nada = (e: Event) => { e.preventDefault() }                                // gesturestart/change de Safari: el zoom de página NO
    let raf = 0
    const alDesplazar = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; actualizar() }) }

    sc.addEventListener('touchstart', empieza, { passive: true })
    sc.addEventListener('touchmove', mueve, { passive: false })
    sc.addEventListener('touchend', termina)
    sc.addEventListener('touchcancel', termina)
    sc.addEventListener('dblclick', doble)
    sc.addEventListener('wheel', rueda, { passive: false })
    sc.addEventListener('scroll', alDesplazar, { passive: true })
    dlg.addEventListener('gesturestart', nada as EventListener, { passive: false } as AddEventListenerOptions)
    dlg.addEventListener('gesturechange', nada as EventListener, { passive: false } as AddEventListenerOptions)
    return () => {
      sc.removeEventListener('touchstart', empieza); sc.removeEventListener('touchmove', mueve); sc.removeEventListener('touchend', termina)
      sc.removeEventListener('touchcancel', termina); sc.removeEventListener('dblclick', doble); sc.removeEventListener('wheel', rueda)
      sc.removeEventListener('scroll', alDesplazar)
      dlg.removeEventListener('gesturestart', nada as EventListener); dlg.removeEventListener('gesturechange', nada as EventListener)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [actualizar])

  // ── descarga y apertura del PDF ──
  useEffect(() => {
    let cancelado = false
    let tarea: { destroy(): Promise<void> } | null = null
    ;(async () => {
      setFase('descargando'); setError(null); setProgreso(null); setTamanos([]); setPaginasError([])
      let bytes: Uint8Array
      try {
        bytes = await descargarPdf({
          firmar: () => firmarRef.current(),
          fetchFn: u => fetch(u, { cache: 'no-store' }) as never,
          onProgreso: (b, t) => { if (!cancelado && t) setProgreso(b / t) },
        })
      } catch (e) { if (!cancelado) { setError(mensajeDe(e)); setFase('error') } return }
      if (cancelado) return
      setFase('abriendo')
      try {
        const pdfjs = await cargarPdfjs()
        if (cancelado) return
        // Sin wasm, cmaps ni fuentes estándar a propósito; sin scripting. `data`: ya está entero en memoria (no hay peticiones tardías).
        const carga = pdfjs.getDocument({ data: bytes, verbosity: 0, useWorkerFetch: false, enableXfa: false })
        tarea = carga
        const doc = await carga.promise
        if (cancelado) return
        docRef.current = doc
        // Tamaño de la primera página enseguida y el resto en segundo plano (para reservar el alto de cada página sin dibujarla).
        const medidas: { w: number; h: number }[] = []
        for (let i = 1; i <= doc.numPages; i++) {
          const p = await doc.getPage(i)
          const v = p.getViewport({ scale: 1 })
          medidas.push({ w: v.width, h: v.height }); p.cleanup()
          if (cancelado) return
          if (i === 1) { setTamanos([{ w: v.width, h: v.height }]); setFase('listo') }
        }
        setTamanos(medidas)
      } catch (e) { if (!cancelado) { setError(mensajeDe(e)); setFase('error') } }
    })()
    return () => {
      cancelado = true
      generacion.current++
      Array.from(tareas.current.values()).forEach(t => t.cancel())
      tareas.current.clear()
      for (const i of Array.from(hechas.current.keys())) liberar(i)
      docRef.current = null
      tarea?.destroy().catch(() => {})   // la tarea de carga destruye también el documento y su worker
    }
  }, [intento, liberar])

  // ── teclado: Escape, + − 0 y foco atrapado ──
  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrarFn.current(); return }
    if (e.key === 'Tab') {
      const foco = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') || [])
      if (!foco.length) return
      const primero = foco[0], ultimoEl = foco[foco.length - 1], actual = document.activeElement
      if (e.shiftKey && (actual === primero || actual === dialogRef.current)) { e.preventDefault(); ultimoEl.focus() }
      else if (!e.shiftKey && actual === ultimoEl) { e.preventDefault(); primero.focus() }
      return
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === '+' || e.key === '=') { e.preventDefault(); aplicarZoom(zoomPorFactor(zoomRef.current, PASO_ZOOM)) }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); aplicarZoom(zoomPorFactor(zoomRef.current, 1 / PASO_ZOOM)) }
    else if (e.key === '0') { e.preventDefault(); aplicarZoom(1, undefined, undefined, true) }
  }

  const anchoPagina = ancho * zoom
  const hayPaginas = tamanos.length > 0
  const total = tamanos.length
  // ancho del área desplazable: nunca menor que la ventana, para que las páginas queden centradas con zoom < 100 %
  const anchoArea = Math.max(ancho + 2 * MARGEN_LATERAL, anchoPagina + 2 * MARGEN_LATERAL)

  return (
    <div className={ui.fondo}>
      <div className={ui.ventana} ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Visor de PDF: ${nombre}`} tabIndex={-1} onKeyDown={alTeclear}>
        <div className={ui.cab}>
          <button type="button" className={ui.cerrar} ref={cerrarRef} onClick={onCerrar} aria-label="Cerrar visor">✕</button>
          <div className={ui.tit}>
            <b>{nombre}</b>
            <span aria-live="polite">{hayPaginas ? `Página ${Math.min(pagina, total)} / ${total}` : fase === 'error' ? 'No se pudo abrir' : 'Abriendo…'}</span>
          </div>
        </div>

        <div className={`${ui.scroll}${invertido ? ` ${ui.inv}` : ''}`} ref={scrollRef} tabIndex={0} aria-label="Páginas del PDF">
          <div className={ui.pages} ref={pagesRef} style={{ width: anchoArea }}>
            {hayPaginas && tamanos.map((t, i) => (
              <div key={i} data-pg={i} className={ui.pagina} role="img" aria-label={`Página ${i + 1} de ${total}`}
                style={{ width: anchoPagina, height: anchoPagina * (t.h / t.w) }}>
                <div className={ui.lienzo} data-lienzo="" />
                {paginasError.includes(i) && <p className={ui.errPag}>No se pudo dibujar esta página.</p>}
              </div>
            ))}
          </div>
          {fase !== 'listo' && (
            <div className={ui.centro}>
              {fase === 'error' && error ? (
                <>
                  <p className={`${ui.msg} ${ui.msgErr}`} role="alert">{error.texto}</p>
                  {error.reintentar && <button type="button" className={ui.b} onClick={() => setIntento(n => n + 1)}>Reintentar</button>}
                </>
              ) : (
                <>
                  <p className={ui.msg} role="status">{fase === 'descargando' ? 'Descargando el PDF…' : 'Abriendo el PDF…'}</p>
                  {fase === 'descargando' && progreso !== null && <span className={ui.barra} aria-hidden="true"><i style={{ width: `${Math.round(progreso * 100)}%` }} /></span>}
                </>
              )}
            </div>
          )}
        </div>

        <div className={ui.tools} role="toolbar" aria-label="Zoom y opciones">
          <button type="button" className={ui.b} onClick={() => aplicarZoom(zoomPorFactor(zoomRef.current, 1 / PASO_ZOOM))} aria-label="Alejar">−</button>
          <button type="button" className={`${ui.b} ${ui.zv}`} onClick={() => aplicarZoom(1, undefined, undefined, true)} aria-label={`Zoom ${Math.round(zoom * 100)} %, pulsa para ajustar al ancho`}>{Math.round(zoom * 100)}%</button>
          <button type="button" className={ui.b} onClick={() => aplicarZoom(zoomPorFactor(zoomRef.current, PASO_ZOOM))} aria-label="Acercar">+</button>
          <span className={ui.sep} aria-hidden="true" />
          <button type="button" className={`${ui.b} ${ui.txt}`} onClick={() => aplicarZoom(1, undefined, undefined, true)}>Ajustar</button>
          <button type="button" className={ui.b} aria-pressed={invertido} onClick={() => setInvertido(v => !v)} aria-label="Invertir colores">◐</button>
          <button type="button" className={ui.b} onClick={onAbrirTelefono} aria-label="Abrir en el visor del teléfono">↗</button>
        </div>
      </div>
    </div>
  )
}
