'use client'
// La tira de días de los dos Home en teléfono (prototipo docs/mockups/index.html), en lugar del calendario semana/mes. Una tira horizontal con el desplazamiento táctil NATIVO (overflow-x: sigue al dedo, con inercia, sin páginas;
// en teléfono NO se simula nada con JavaScript). Con mouse o lápiz en escritorio se arrastra con inercia (pointerType ≠ touch). Cada día es una píldora con su letra y su número; hoy lleva un aro, los días pasados se ven apagados,
// el elegido va en tinta, un poco más grande, con una animación corta de transform. Un punto bajo el número marca servicio (azul) o fecha bloqueada (ámbar). Tocar un día lo centra con scroll suave y abajo cambia la tarjeta del día
// (sin alto mínimo: mide su contenido y anima el alto). El chip del mes abre el mes completo para saltar a otra fecha. Este componente solo dibuja y navega: qué dice la tarjeta y qué punto lleva cada día lo decide quien lo usa.
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { msDeToken } from '@/lib/usePresencia'
import { diasDeLaTira, enLaTira, nombreDelMes, tituloDelDia, tituloDelMes, type PuntoDia } from '@/lib/home/tira'
import { mesDe, moverMes } from '@/lib/home/calendario'
import { TEXTOS_TIRA as T } from '@/lib/textos/tiraDias'
import HojaInferior from './HojaInferior'
import ui from './tira-dias.module.css'

// En el servidor no hay nada que medir: useLayoutEffect solo en el navegador.
const useEfectoLayout = typeof window !== 'undefined' ? useLayoutEffect : useEffect
const LETRAS_MES = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const menosMovimiento = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const etiquetaDe = (fecha: string, esHoy: boolean, punto: PuntoDia): string => `${tituloDelDia(fecha)}${esHoy ? ', hoy' : ''}${punto ? `, ${T.etiquetaPunto[punto]}` : ''}`

export default function TiraDias({ hoy, titulo, ayuda, punto, panel, clavePanel, diaInicial }: {
  /** El día de hoy en Chile (AAAA-MM-DD). */
  hoy: string
  titulo: string
  ayuda: string
  /** El punto de cada día (azul servicio, ámbar bloqueada). */
  punto: (fecha: string) => PuntoDia
  /** La tarjeta del día elegido. */
  panel: (fecha: string) => ReactNode
  /** Cambia cuando la tarjeta cambia de alto sin cambiar de día (p. ej. al bloquear): así el alto se anima. */
  clavePanel?: (fecha: string) => string
  /** Solo para pruebas (dibujo en el servidor): el día que arranca elegido. En la app nunca se pasa: la tarjeta nace escondida. */
  diaInicial?: string
}) {
  // Al abrir Inicio la tarjeta del día está escondida (null): aparece al tocar un día, se esconde al tocar el mismo día otra vez o cualquier otra zona de la pantalla.
  const [elegido, setElegido] = useState<string | null>(diaInicial ?? null)
  const [mesAbierto, setMesAbierto] = useState(false)
  const [mesVisto, setMesVisto] = useState({ anio: +hoy.slice(0, 4), mes: +hoy.slice(5, 7) })
  const ultimo = useRef<string | null>(null)      // el último día mostrado: la tarjeta conserva su contenido mientras se esconde, para que el alto se anime sin que el texto desaparezca de golpe
  const [nota, setNota] = useState('')
  const tira = useRef<HTMLDivElement>(null), tarjeta = useRef<HTMLDivElement>(null), interior = useRef<HTMLDivElement>(null), alturaPrevia = useRef<number | null>(0), raiz = useRef<HTMLElement>(null)
  const dias = diasDeLaTira(hoy)

  const centrar = useCallback((suave: boolean) => {
    const t = tira.current, e = t?.querySelector<HTMLElement>('[data-elegido="true"]') ?? t?.querySelector<HTMLElement>('[data-hoy="true"]')      // sin día elegido se centra hoy
    if (!t || !e) return
    t.scrollTo({ left: e.offsetLeft - (t.clientWidth - e.offsetWidth) / 2, behavior: suave && !menosMovimiento() ? 'smooth' : 'auto' })
  }, [])
  useEffect(() => { const id = requestAnimationFrame(() => centrar(false)); return () => cancelAnimationFrame(id) }, [centrar])

  const elegir = (fecha: string, suave = true) => {
    setElegido(fecha); setMesVisto({ anio: +fecha.slice(0, 4), mes: +fecha.slice(5, 7) })
    requestAnimationFrame(() => centrar(suave))
  }
  // Tocar el día que ya está elegido esconde la tarjeta; tocar otro cambia su contenido sin esconderla.
  const tocarDia = (fecha: string) => { if (fecha === elegido) setElegido(null); else elegir(fecha) }

  // Tocar cualquier otra zona esconde la tarjeta (no la tira ni la tarjeta, ni una hoja abierta —el mes o «bloquear»—, que tiene su propio cierre).
  useEffect(() => {
    if (!elegido) return
    const fuera = (e: MouseEvent) => {
      const x = e.target as Element | null
      if (!x || !x.isConnected || raiz.current?.contains(x) || x.closest('[role="dialog"]') || document.querySelector('[role="dialog"]')) return
      setElegido(null)
    }
    document.addEventListener('click', fuera)
    return () => document.removeEventListener('click', fuera)
  }, [elegido])

  // El alto de la tarjeta se anima del alto anterior al nuevo (--anc-dur-screen, el mismo token que su transición en tira-dias.module.css); sin movimiento si la persona lo pidió.
  // La tarjeta entra animada al CAMBIAR de día, no al montarse la tira (si no, al cambiar de pestaña a Inicio se veía un cuadro vacío que se llenaba): el atributo lo decide cuántas veces cambió el día y no cambia mientras dura el elemento.
  const cambiosDeDia = useRef(0), diaPrevio = useRef(elegido)
  if (diaPrevio.current !== elegido) { diaPrevio.current = elegido; cambiosDeDia.current++ }
  if (elegido) ultimo.current = elegido
  const mostrado = elegido ?? ultimo.current, abierta = elegido !== null
  const clave = `${elegido ?? ''}|${elegido ? clavePanel?.(elegido) ?? '' : ''}`
  useEfectoLayout(() => {
    const o = tarjeta.current, i = interior.current
    if (!o) return
    const h1 = abierta && i ? i.offsetHeight : 0, h0 = alturaPrevia.current
    alturaPrevia.current = h1
    if (h0 === null || h0 === h1 || menosMovimiento()) { o.style.height = ''; return }
    o.style.height = `${h0}px`; void o.offsetHeight; o.style.height = `${h1}px`
    const id = setTimeout(() => { o.style.height = '' }, msDeToken('--anc-dur-screen', 280) + 100)      // la duración del token más un margen para soltar el alto fijo
    return () => clearTimeout(id)
  }, [clave])

  // Mientras la tarjeta cambia de contenido por su cuenta (datos que llegan), el alto «de antes» sigue al alto real.
  useEffect(() => {
    const i = interior.current
    if (!elegido || !i || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => { alturaPrevia.current = i.offsetHeight }); ro.observe(i)
    return () => ro.disconnect()
  }, [elegido])

  // Arrastre con mouse o lápiz (en teléfono ya lo hace el desplazamiento táctil nativo): la tira sigue al puntero y continúa con inercia.
  useEffect(() => {
    const t = tira.current
    if (!t) return
    let abajo = false, movido = false, x0 = 0, s0 = 0, xl = 0, tl = 0, vel = 0, raf = 0, pid: number | null = null
    const bajar = (e: PointerEvent) => { if (e.pointerType === 'touch' || e.button !== 0) return; cancelAnimationFrame(raf); abajo = true; movido = false; x0 = xl = e.clientX; s0 = t.scrollLeft; tl = performance.now(); vel = 0; pid = e.pointerId }
    const mover = (e: PointerEvent) => {
      if (!abajo) return
      const dx = e.clientX - x0
      if (!movido && Math.abs(dx) > 5) { movido = true; t.classList.add(ui.arrastrando); try { if (pid !== null) t.setPointerCapture(pid) } catch { /* el puntero ya no existe */ } }
      if (!movido) return
      t.scrollLeft = s0 - dx
      const ahora = performance.now(), dt = Math.max(1, ahora - tl); vel = 0.8 * vel + 0.2 * ((xl - e.clientX) / dt); xl = e.clientX; tl = ahora
    }
    const soltar = () => {
      if (!abajo) return
      abajo = false; t.classList.remove(ui.arrastrando)
      if (!movido) return
      const paso = () => { t.scrollLeft += vel * 16; vel *= 0.94; if (Math.abs(vel) > 0.04) raf = requestAnimationFrame(paso) }
      paso()
    }
    const clic = (e: Event) => { if (movido) { e.stopPropagation(); e.preventDefault(); movido = false } }
    const noArrastrar = (e: Event) => e.preventDefault()
    t.addEventListener('pointerdown', bajar); t.addEventListener('pointermove', mover); t.addEventListener('pointerup', soltar); t.addEventListener('pointercancel', soltar); t.addEventListener('lostpointercapture', soltar)
    t.addEventListener('click', clic, true); t.addEventListener('dragstart', noArrastrar)
    return () => { cancelAnimationFrame(raf); t.removeEventListener('pointerdown', bajar); t.removeEventListener('pointermove', mover); t.removeEventListener('pointerup', soltar); t.removeEventListener('pointercancel', soltar); t.removeEventListener('lostpointercapture', soltar); t.removeEventListener('click', clic, true); t.removeEventListener('dragstart', noArrastrar) }
  }, [])

  const vista = elegido ?? hoy
  const abrirMes = () => { setMesVisto({ anio: +vista.slice(0, 4), mes: +vista.slice(5, 7) }); setNota(''); setMesAbierto(true) }
  const elegirDelMes = (fecha: string) => {
    if (!enLaTira(fecha, hoy)) { setNota(T.fueraDeRango); return }
    setMesAbierto(false); elegir(fecha)
  }

  return (
    <section ref={raiz} className={ui.raiz} aria-label={titulo}>
      <div className={ui.cab}>
        <div className={ui.cabTxt}><h2 className={ui.titulo}>{titulo}</h2><p className={ui.ayuda}>{ayuda}</p></div>
        <button type="button" className={ui.mes} onClick={abrirMes} aria-haspopup="dialog" aria-label={`${T.elegirMes}: ${nombreDelMes(vista)}`}>
          <span>{nombreDelMes(vista)}</span>
          <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      <div ref={tira} className={ui.tira} role="group" aria-label={T.dias}>
        {dias.map(d => {
          const p = punto(d.fecha), sel = d.fecha === elegido
          return (
            <Fragment key={d.fecha}>
              {d.mesNuevo && <span className={ui.mesCab} aria-hidden="true">{d.mesNuevo}</span>}
              <div className={`${ui.dia}${d.pasado ? ` ${ui.pasado}` : ''}${d.esHoy ? ` ${ui.hoy}` : ''}${sel ? ` ${ui.elegido}` : ''}`} data-elegido={sel} data-hoy={d.esHoy}>
                <span className={ui.letra} aria-hidden="true">{d.dia}</span>
                <button type="button" className={ui.pildora} aria-pressed={sel} aria-current={d.esHoy ? 'date' : undefined} aria-label={etiquetaDe(d.fecha, d.esHoy, p)} onClick={() => tocarDia(d.fecha)}>
                  <span className={ui.numero}>{d.numero}</span>
                  <span className={`${ui.punto}${p ? ` ${ui[p]}` : ''}`} aria-hidden="true" />
                </button>
              </div>
            </Fragment>
          )
        })}
      </div>

      <div ref={tarjeta} className={ui.tarjeta} aria-live="polite" data-cerrada={abierta ? undefined : ''} {...(abierta ? {} : ({ inert: '' } as Record<string, string>))}>
        {mostrado && <div ref={interior} key={mostrado} className={ui.tarjetaIn} data-animar={cambiosDeDia.current > 0 ? '' : undefined}>{panel(mostrado)}</div>}
      </div>

      <HojaInferior abierta={mesAbierto} etiqueta={T.hojaMesTitulo} onCerrar={() => setMesAbierto(false)}>
        <div className={ui.mesNavFila}>
          <button type="button" className={ui.mesNav} onClick={() => setMesVisto(m => moverMes(m, -1))} aria-label={T.mesAnterior}>‹</button>
          <h3 className={ui.mesTitulo} aria-live="polite">{tituloDelMes(mesVisto.anio, mesVisto.mes)}</h3>
          <button type="button" className={ui.mesNav} onClick={() => setMesVisto(m => moverMes(m, 1))} aria-label={T.mesSiguiente}>›</button>
        </div>
        <div className={ui.rejilla} role="group" aria-label={tituloDelMes(mesVisto.anio, mesVisto.mes)}>
          {LETRAS_MES.map((l, i) => <span key={i} className={ui.letraMes} aria-hidden="true">{l}</span>)}
          {mesDe(mesVisto.anio, mesVisto.mes, hoy).flat().map(d => {
            const p = punto(d.fecha)
            return (
              <button key={d.fecha} type="button" className={`${ui.celdaMes}${d.delMes ? '' : ` ${ui.fuera}`}`} aria-pressed={d.fecha === elegido} aria-current={d.esHoy ? 'date' : undefined} aria-label={etiquetaDe(d.fecha, d.esHoy, p)} onClick={() => elegirDelMes(d.fecha)}>
                {d.numero}
                {p && <span className={`${ui.punto} ${ui[p]}`} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
        <p className={ui.nota} role="status">{nota}</p>
      </HojaInferior>
    </section>
  )
}
