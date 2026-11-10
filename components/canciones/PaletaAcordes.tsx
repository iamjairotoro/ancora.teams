'use client'
// El panel de acordes del editor (franja baja y fija, no una hoja que tape la letra). Los siete acordes de la escala del tono, modificadores (m, 7, maj7, sus4, add9), bajo y «Otro…» (los 12 grados, con el tritono como 5 bemol).
// Tocar un acorde lo pone en el lugar elegido; los modificadores cambian el acorde que ya está puesto.
import { useState } from 'react'
import { mostrarAcorde, paleta, type Acorde, type Alteracion, type Grado } from '@/lib/acordes'
import { conBajo, conModificador, ESPACIO_MAXIMO, gradosCromaticos, MODIFICADORES } from '@/lib/editorAcordes'
import { TEXTOS_EDITOR as T } from '@/lib/textos/editorAcordes'
import ui from './editor-cancion-movil.module.css'

/** Lo que el modo Acordes le pasa al panel según lo elegido (una palabra de la letra o una pieza de una línea de acordes). */
export type DatosPanel = {
  actual: Acorde | null                       // el acorde que ya está en el lugar elegido (para cambiarlo o quitarlo)
  onElegir: (a: Acorde) => void
  onQuitar?: () => void
  onMover?: (delta: -1 | 1) => void           // mover el acorde (o, si aún no hay, el lugar) una letra con ‹ › — o la pieza de una línea de acordes
  onSiguiente?: () => void                    // «Siguiente palabra ›» / «Siguiente ›»: avanza el ancla
  palabra?: string | null                     // la palabra sobre la que está el ancla («sobre «primera»»)
  onSeparador?: () => void                    // en una línea de acordes: agrega «|»
  onEspacio?: () => void                      // en una línea de acordes: agrega un espacio
  ancho?: { valor: number; onMenos: () => void; onMas: () => void }      // el espacio elegido: «Ancho − +»
  titulo?: { principal: string; detalle: string; grande: boolean }       // en una línea de acordes: qué pieza está elegida
  soloLinea?: boolean                         // es una línea de acordes: los modificadores solo con un acorde elegido
  textoQuitar?: string
  textoSiguiente?: string
}
type Props = DatosPanel & { tono: string; onCerrar: () => void }
type Vista = 'escala' | 'otro' | 'bajo'

export default function PaletaAcordes({ tono, actual, onElegir, onQuitar, onMover, onSiguiente, palabra, onSeparador, onEspacio, ancho, titulo, soloLinea, onCerrar, textoQuitar, textoSiguiente }: Props) {
  const [vista, setVista] = useState<Vista>('escala')
  const mismo = (a: { g: Grado; alt?: Alteracion }, b: { g: Grado; alt?: Alteracion } | undefined) => !!b && a.g === b.g && (a.alt ?? '') === (b.alt ?? '')
  const colocar = (a: Acorde) => { onElegir(actual?.bajo ? { ...a, bajo: actual.bajo } : a); setVista('escala') }      // cambiar de acorde conserva el bajo

  return (
    <div className={ui.paleta} role="dialog" aria-label={T.acordesEnTono(tono)}>
      <div className={ui.pCab}>
        <h3>{titulo
          ? <><b className={titulo.grande ? undefined : ui.sinAcorde}>{titulo.principal}</b> <span>{titulo.detalle}</span></>
          : actual ? <><b>{mostrarAcorde(actual, tono, 'american')}</b> <span>{T.sobrePalabra(palabra ?? null)}</span></> : <><b className={ui.sinAcorde}>{T.elegirAcorde}</b> <span>{T.sobrePalabra(palabra ?? null)}</span></>}</h3>
        {ancho && <span className={ui.moverEt}>{T.ancho}</span>}
        {ancho && <button type="button" className={ui.flecha} aria-label={T.masEstrecho} disabled={ancho.valor <= 1} onClick={ancho.onMenos}>−</button>}
        {ancho && <button type="button" className={ui.flecha} aria-label={T.masAncho} disabled={ancho.valor >= ESPACIO_MAXIMO} onClick={ancho.onMas}>+</button>}
        {!ancho && onMover && <span className={ui.moverEt}>{T.mover}</span>}
        {!ancho && onMover && <button type="button" className={ui.flecha} aria-label="‹" onClick={() => onMover(-1)}>‹</button>}
        {!ancho && onMover && <button type="button" className={ui.flecha} aria-label="›" onClick={() => onMover(1)}>›</button>}
        <button type="button" aria-label={T.cerrarPanel} onClick={onCerrar}>✕</button>
      </div>
      {vista === 'escala' && (
        <>
          <div className={ui.rejilla}>
            {paleta(tono).map(p => (
              <button key={p.acorde.g} type="button" aria-pressed={!!actual && mismo(actual, p.acorde) && actual.cal === p.acorde.cal} onClick={() => colocar(p.acorde)}>{p.letra}<small>{p.acorde.g}</small></button>
            ))}
            <button type="button" onClick={() => setVista('otro')}>{T.otro}</button>
          </div>
          {(!soloLinea || actual) && <div className={ui.mods}>
            {MODIFICADORES.map(m => <button key={m} type="button" disabled={!actual} aria-pressed={!!actual && (m === 'm' ? /^m(?!aj)/.test(actual.cal) : actual.cal.replace(/^m(?!aj)/, '') === m)} onClick={() => actual && onElegir(conModificador(actual, m))}>{m}</button>)}
            <button type="button" disabled={!actual} aria-pressed={!!actual?.bajo} onClick={() => setVista('bajo')}>{T.bajo}</button>
          </div>}
          {(onEspacio || onSeparador) && (
            <div className={ui.piezas}>
              {onEspacio && <button type="button" onClick={onEspacio}>{T.espacioMas}</button>}
              {onSeparador && <button type="button" onClick={onSeparador}>{T.separador}</button>}
            </div>
          )}
          <div className={ui.acciones}>
            {onQuitar && <button type="button" className={ui.quitar} disabled={!actual && !textoQuitar} onClick={onQuitar}>{textoQuitar ?? T.quitarAcorde}</button>}
            {onSiguiente && <button type="button" className={ui.siguiente} onClick={onSiguiente}>{textoSiguiente ?? T.siguientePalabra}</button>}
          </div>
        </>
      )}
      {vista === 'otro' && (
        <div className={ui.rejilla}>
          {gradosCromaticos(tono).map(p => (
            <button key={`${p.alt ?? ''}${p.g}`} type="button" onClick={() => colocar({ g: p.g, ...(p.alt ? { alt: p.alt } : {}), cal: '' })}>{p.letra}<small>{(p.alt ?? '') + p.g}</small></button>
          ))}
          <button type="button" onClick={() => setVista('escala')}>‹</button>
        </div>
      )}
      {vista === 'bajo' && actual && (
        <div className={ui.rejilla}>
          {gradosCromaticos(tono).map(p => (
            <button key={`${p.alt ?? ''}${p.g}`} type="button" aria-pressed={mismo(p, actual.bajo)} onClick={() => { onElegir(conBajo(actual, { g: p.g, ...(p.alt ? { alt: p.alt } : {}) })); setVista('escala') }}>{p.letra}<small>{(p.alt ?? '') + p.g}</small></button>
          ))}
          <button type="button" onClick={() => { onElegir(conBajo(actual, null)); setVista('escala') }}>{T.sinBajo}</button>
          <button type="button" onClick={() => setVista('escala')}>‹</button>
        </div>
      )}
    </div>
  )
}
