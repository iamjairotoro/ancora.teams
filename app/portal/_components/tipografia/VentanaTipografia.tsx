'use client'
// La ventana «Tipografía» de la letra en TELÉFONO (mockup Tipografia-A): una tarjetita junto al botón «Aa Tipografía» (ancla y portal de MenuFlotante) en vez de un panel que empuja la letra hacia abajo; la letra queda a la vista para
// ver el cambio en vivo. Cuatro fichas de fuente en 2×2 (La app, Arial, Georgia, Mono; «Sistema» ya no se ofrece y quien la tiene guardada ve «La app» marcada, sin reescribir su valor), el tamaño en cuatro pasos de A pequeña a A grande
// (tocar un paso lo aplica de inmediato; también se puede arrastrar) y el pie. role="dialog": el foco entra al abrir, Escape y tocar fuera cierran y el foco vuelve al botón. El escritorio sigue con PanelTipografia.
import { useRef } from 'react'
import MenuFlotante from '@/components/MenuFlotante'
import { FONT_OPTIONS_TELEFONO, SIZE_STEPS, fuenteMarcada, type LyricPrefs } from '@/lib/lyricPrefs'
import { TEXTOS_TIPOGRAFIA as T, etiquetaPasoTamano } from '@/lib/textos/tipografia'
import ui from './tipografia-telefono.module.css'

export default function VentanaTipografia({ id, prefs, elegir, errPrefs, onCerrar }: {
  id?: string
  prefs: LyricPrefs
  elegir: (patch: Partial<Pick<LyricPrefs, 'fontFamily' | 'textScale'>>) => void
  errPrefs: boolean
  onCerrar: () => void
}) {
  const pasos = useRef<HTMLDivElement>(null)
  const marcada = fuenteMarcada(prefs.fontFamily), paso = Math.max(0, SIZE_STEPS.indexOf(prefs.textScale))
  const alArrastrar = (e: React.PointerEvent) => {
    const r = pasos.current?.getBoundingClientRect(); if (!r || r.width <= 0) return
    const i = Math.min(SIZE_STEPS.length - 1, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * (SIZE_STEPS.length - 1))))
    if (SIZE_STEPS[i] !== prefs.textScale) elegir({ textScale: SIZE_STEPS[i] })
  }
  return (
    <MenuFlotante dialogo idCaja={id} titulo={T.ventana} onCerrar={onCerrar} claseCaja={ui.ventana} margenDerecho={0} separacion={8} capa={29}>
      <div className={ui.fuentes} role="group" aria-label={T.fuente}>
        {FONT_OPTIONS_TELEFONO.map(o => (
          <button key={o.f} type="button" className={ui.ficha} aria-pressed={marcada === o.f} onClick={() => elegir({ fontFamily: o.f })}>
            <span className={ui.aa} style={{ fontFamily: o.f }} aria-hidden="true">{T.aa}</span><span className={ui.nombre}>{o.label}</span>
          </button>
        ))}
      </div>
      <div className={ui.tamano} role="group" aria-label={T.tamano}>
        <button type="button" className={ui.extremo} style={{ fontSize: '.8125rem' }} aria-label={etiquetaPasoTamano(0)} onClick={() => elegir({ textScale: SIZE_STEPS[0] })}>A</button>
        <div ref={pasos} className={ui.pasos} onPointerDown={e => { e.currentTarget.setPointerCapture?.(e.pointerId); alArrastrar(e) }} onPointerMove={e => { if (e.buttons === 1) alArrastrar(e) }}>
          {SIZE_STEPS.map((z, i) => (
            <button key={z} type="button" className={ui.paso} aria-pressed={i === paso} aria-label={etiquetaPasoTamano(i)} onClick={() => elegir({ textScale: z })}><span className={ui.punto} aria-hidden="true" /></button>
          ))}
        </div>
        <button type="button" className={ui.extremo} style={{ fontSize: '1.25rem' }} aria-label={etiquetaPasoTamano(SIZE_STEPS.length - 1)} onClick={() => elegir({ textScale: SIZE_STEPS[SIZE_STEPS.length - 1] })}>A</button>
      </div>
      <p className={ui.pie}>{T.pie}</p>
      {errPrefs && <p className={ui.error} role="alert">{T.errorGuardar}</p>}
    </MenuFlotante>
  )
}
