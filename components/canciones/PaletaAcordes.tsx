'use client'
// La paleta del editor de acordes («Acordes en G»), hoja inferior. Los siete acordes de la escala del tono, modificadores (m, 7, maj7, sus4, add9), bajo y «Otro…» (los 12 grados, con el tritono como 5 bemol).
// Tocar un acorde lo pone en el lugar elegido; los modificadores cambian el acorde que ya está puesto.
import { useState } from 'react'
import { paleta, type Acorde, type Alteracion, type Grado } from '@/lib/acordes'
import { conBajo, conModificador, gradosCromaticos, MODIFICADORES } from '@/lib/editorAcordes'
import { TEXTOS_EDITOR as T } from '@/lib/textos/editorAcordes'
import ui from './editor-cancion-movil.module.css'

type Props = {
  tono: string
  actual: Acorde | null                       // el acorde que ya está en el lugar elegido (para cambiarlo o quitarlo)
  onElegir: (a: Acorde) => void
  onQuitar?: () => void
  onMover?: (delta: -1 | 1) => void           // afinar el lugar con ‹ ›
  onSeparador?: () => void                    // solo en una línea de acordes: agrega «|»
  onCerrar: () => void
  textoQuitar?: string
}
type Vista = 'escala' | 'otro' | 'bajo'

export default function PaletaAcordes({ tono, actual, onElegir, onQuitar, onMover, onSeparador, onCerrar, textoQuitar }: Props) {
  const [vista, setVista] = useState<Vista>('escala')
  const mismo = (a: { g: Grado; alt?: Alteracion }, b: { g: Grado; alt?: Alteracion } | undefined) => !!b && a.g === b.g && (a.alt ?? '') === (b.alt ?? '')
  const colocar = (a: Acorde) => { onElegir(actual?.bajo ? { ...a, bajo: actual.bajo } : a); setVista('escala') }      // cambiar de acorde conserva el bajo

  return (
    <div className={ui.paleta} role="dialog" aria-label={T.acordesEnTono(tono)}>
      <div className={ui.asa} aria-hidden="true" />
      <div className={ui.pCab}>
        {onMover && <button type="button" aria-label="‹" onClick={() => onMover(-1)}>‹</button>}
        {onMover && <button type="button" aria-label="›" onClick={() => onMover(1)}>›</button>}
        <h3>{T.acordesEnTono(tono)}</h3>
        {onQuitar && <button type="button" className={ui.quitar} disabled={!actual && !textoQuitar} onClick={onQuitar}>{textoQuitar ?? T.quitarAcorde}</button>}
        <button type="button" onClick={onCerrar}>OK</button>
      </div>
      {vista === 'escala' && (
        <>
          <div className={ui.rejilla}>
            {paleta(tono).map(p => (
              <button key={p.acorde.g} type="button" aria-pressed={!!actual && mismo(actual, p.acorde) && actual.cal === p.acorde.cal} onClick={() => colocar(p.acorde)}>{p.letra}<small>{p.acorde.g}</small></button>
            ))}
            <button type="button" onClick={() => setVista('otro')}>{T.otro}</button>
          </div>
          <div className={ui.mods}>
            {MODIFICADORES.map(m => <button key={m} type="button" disabled={!actual} aria-pressed={!!actual && (m === 'm' ? /^m(?!aj)/.test(actual.cal) : actual.cal.replace(/^m(?!aj)/, '') === m)} onClick={() => actual && onElegir(conModificador(actual, m))}>{m}</button>)}
            <button type="button" disabled={!actual} aria-pressed={!!actual?.bajo} onClick={() => setVista('bajo')}>{T.bajo}</button>
            {onSeparador && <button type="button" onClick={onSeparador}>{T.separador}</button>}
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
