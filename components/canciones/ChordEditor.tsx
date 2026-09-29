/* ════════════════════════════════════════════════════════════════════════
   ChordEditor.tsx — paso 3 del flujo de creación: "corrige lo que haga
   falta". Referencia visual: docs/mockup-crear-cancion.html.

   REGLA QUE NO SE NEGOCIA: nunca se edita sintaxis. El usuario hace clic
   entre dos letras y escribe el acorde a secas ("A/C#") — nunca ve ni
   escribe "[A/C#]" entre corchetes. Es la diferencia entre una
   herramienta que usa cualquiera del equipo y una que solo usa quien
   programó.

   Produce segmentos (Segment{chord?,text} de lib/parseChart.ts), no
   coordenadas de píxeles: la letra se renderiza en fuente proporcional,
   así que un índice de carácter no se traduce linealmente a posición en
   pantalla. El "hueco" entre cada par de letras es un elemento real en el
   flujo del documento — el navegador lo ubica, no lo calculamos.

   Validación de acordes: usa parseChord de lib/chords.ts (NO se
   reimplementa esa lógica). Si no matchea, el acorde se guarda igual —
   solo se marca visualmente como dudoso (.ce-chord--warn). Un acorde raro
   puede ser válido en una canción real; el editor no es más estricto que
   la música.

   Alcance de esta sesión: arrastrar (drag) es solo de escritorio (HTML5
   draggable nativo, que ya no dispara con touch). En móvil alcanza con
   clic para editar y × para borrar — soporte táctil de arrastre queda
   para otra sesión.
   ════════════════════════════════════════════════════════════════════════ */
'use client'

import { useEffect, useRef, useState } from 'react'
import { parseChord } from '@/lib/chords'
import type { Segment, ParsedLine } from '@/lib/parseChart'

export type ChordEditorSection = {
  id: string
  code: string
  name: string
  lines: ParsedLine[]
}

type Props = {
  sections: ChordEditorSection[]
  onLinesChange: (sectionId: string, lineIndex: number, segments: Segment[]) => void
  // Punto "acordes sueltos dentro de la letra" (típico de Word: "vencer B" +
  // "El Rey…", la B es el acorde de la línea siguiente). Selecciona el
  // fragmento y lo convierte — nunca se adivina solo, el usuario decide
  // qué texto es en realidad un acorde.
  onExtractToNextLine: (sectionId: string, lineIndex: number, flatStart: number, flatEnd: number) => void
}

type GapKey = { sectionId: string; lineIndex: number; flatIndex: number }
type DragChord = { sectionId: string; lineIndex: number; segIndex: number }
type TextSelection = { sectionId: string; lineIndex: number; flatStart: number; flatEnd: number; rect: DOMRect }

/* ── funciones puras: producen segmentos nuevos, nunca mutan ── */

export function insertChordAt(segments: Segment[], flatIndex: number, chord: string): Segment[] {
  let acc = 0
  for (let i = 0; i < segments.length; i++) {
    const len = segments[i].text.length
    if (flatIndex === acc) {
      const next = segments.slice()
      next[i] = { ...next[i], chord }
      return next
    }
    if (flatIndex > acc && flatIndex < acc + len) {
      const local = flatIndex - acc
      const left: Segment = { chord: segments[i].chord, text: segments[i].text.slice(0, local) }
      const right: Segment = { chord, text: segments[i].text.slice(local) }
      return [...segments.slice(0, i), left, right, ...segments.slice(i + 1)]
    }
    acc += len
  }
  // flatIndex cae después del último carácter: no hay sílaba a la derecha
  // para colgar el acorde. Se ignora en vez de inventar un segmento vacío.
  return segments
}

export function removeChordAt(segments: Segment[], segIndex: number): Segment[] {
  const next = segments.slice()
  next[segIndex] = { ...next[segIndex], chord: undefined }
  return next
}

function chordAtFlatIndex(segments: Segment[], flatIndex: number): string {
  let acc = 0
  for (const seg of segments) {
    if (acc === flatIndex) return seg.chord || ''
    acc += seg.text.length
  }
  return ''
}

// Saca el texto entre [start,end) de la línea y devuelve lo que sobra. El
// chord de un segmento se queda con el trozo que conserva su posición de
// inicio: si sobrevive el "before", ahí; si no, pasa al "after" (que pasó
// a ser el nuevo inicio). Si el segmento entero cae en la selección, su
// chord se pierde con él — no queda letra a la que pegarlo.
export function extractSegmentRange(segments: Segment[], start: number, end: number): { removedText: string; remaining: Segment[] } {
  let acc = 0
  const remaining: Segment[] = []
  let removedText = ''
  for (const seg of segments) {
    const segStart = acc
    acc += seg.text.length
    const beforeEnd = Math.max(0, Math.min(seg.text.length, start - segStart))
    const afterStart = Math.max(0, Math.min(seg.text.length, end - segStart))
    const before = seg.text.slice(0, beforeEnd)
    const removed = seg.text.slice(beforeEnd, afterStart)
    const after = seg.text.slice(afterStart)
    removedText += removed
    if (before) {
      remaining.push({ chord: seg.chord, text: before })
      if (after) remaining.push({ text: after })
    } else if (after) {
      remaining.push({ chord: seg.chord, text: after })
    }
  }
  return { removedText, remaining }
}

export default function ChordEditor({ sections, onLinesChange, onExtractToNextLine }: Props) {
  const [editingGap, setEditingGap] = useState<GapKey | null>(null)
  const [gapValue, setGapValue] = useState('')
  const [dragging, setDragging] = useState<DragChord | null>(null)
  const [textSelection, setTextSelection] = useState<TextSelection | null>(null)
  const committingRef = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)

  function sameGap(a: GapKey | null, sectionId: string, lineIndex: number, flatIndex: number) {
    return !!a && a.sectionId === sectionId && a.lineIndex === lineIndex && a.flatIndex === flatIndex
  }

  function hasNextLyricLine(sectionId: string, lineIndex: number) {
    const sec = sections.find(s => s.id === sectionId)
    const next = sec?.lines[lineIndex + 1]
    return !!next && next.kind === 'lyric'
  }

  // Selección de texto dentro de una línea (para "convertir en acorde de
  // la línea siguiente" — el caso típico de Word con el acorde pegado
  // adentro de la letra). Cada carácter lleva su índice plano en
  // data-flat; el offset del Range dentro de ese nodo de un solo
  // carácter (0 o 1) da el límite exacto de "antes" o "después" de él —
  // el mismo sistema de huecos que usa el resto del editor.
  useEffect(() => {
    function onSelectionChange() {
      const sel = document.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setTextSelection(null); return }
      const root = rootRef.current
      if (!root) { setTextSelection(null); return }
      const range = sel.getRangeAt(0)
      if (!root.contains(range.commonAncestorContainer)) { setTextSelection(null); return }

      const resolve = (node: Node, offset: number) => {
        const el = (node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element))?.closest('[data-flat]')
        if (!el) return null
        const line = el.closest('[data-section]')
        if (!line) return null
        return {
          sectionId: (line as HTMLElement).dataset.section!,
          lineIndex: Number((line as HTMLElement).dataset.line),
          flat: Number((el as HTMLElement).dataset.flat) + offset,
        }
      }
      const a = resolve(range.startContainer, range.startOffset)
      const b = resolve(range.endContainer, range.endOffset)
      if (!a || !b || a.sectionId !== b.sectionId || a.lineIndex !== b.lineIndex || a.flat === b.flat) {
        setTextSelection(null); return
      }
      setTextSelection({
        sectionId: a.sectionId, lineIndex: a.lineIndex,
        flatStart: Math.min(a.flat, b.flat), flatEnd: Math.max(a.flat, b.flat),
        rect: range.getBoundingClientRect(),
      })
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  function openEditorAt(sectionId: string, lineIndex: number, segments: Segment[], flatIndex: number) {
    setEditingGap({ sectionId, lineIndex, flatIndex })
    setGapValue(chordAtFlatIndex(segments, flatIndex))
  }

  function commitGap(sectionId: string, lineIndex: number, segments: Segment[], flatIndex: number, value: string) {
    const chord = value.trim()
    if (chord) onLinesChange(sectionId, lineIndex, insertChordAt(segments, flatIndex, chord))
    setEditingGap(null)
    setGapValue('')
  }

  function handleDrop(sectionId: string, lineIndex: number, segments: Segment[], flatIndex: number) {
    if (!dragging) return
    // cruzar de línea o de sección queda fuera de alcance por ahora — el
    // pedido es "mover a otra sílaba", que siempre vive en la misma línea.
    if (dragging.sectionId !== sectionId || dragging.lineIndex !== lineIndex) { setDragging(null); return }
    const chord = segments[dragging.segIndex]?.chord
    setDragging(null)
    if (!chord) return
    const withoutOld = removeChordAt(segments, dragging.segIndex)
    onLinesChange(sectionId, lineIndex, insertChordAt(withoutOld, flatIndex, chord))
  }

  function renderGap(sectionId: string, lineIndex: number, segments: Segment[], flatIndex: number) {
    if (sameGap(editingGap, sectionId, lineIndex, flatIndex)) {
      return (
        <input
          key={`g${flatIndex}`}
          autoFocus
          className="ce-gapInput"
          value={gapValue}
          onChange={e => setGapValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              committingRef.current = true
              commitGap(sectionId, lineIndex, segments, flatIndex, gapValue)
              ;(e.target as HTMLInputElement).blur()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              committingRef.current = true
              setEditingGap(null)
              setGapValue('')
            }
          }}
          onBlur={() => {
            // Enter/Escape ya resolvieron esto — evita un segundo commit
            // con gapValue ya vacío cuando el blur llega después.
            if (committingRef.current) { committingRef.current = false; return }
            commitGap(sectionId, lineIndex, segments, flatIndex, gapValue)
          }}
        />
      )
    }
    return (
      <button
        key={`g${flatIndex}`}
        type="button"
        className="ce-gap"
        aria-label="Agregar acorde acá"
        onClick={() => openEditorAt(sectionId, lineIndex, segments, flatIndex)}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleDrop(sectionId, lineIndex, segments, flatIndex) }}
      />
    )
  }

  function renderLyricLine(sectionId: string, lineIndex: number, segments: Segment[]) {
    let flat = 0
    return segments.map((seg, segIndex) => {
      const segStart = flat
      flat += seg.text.length
      const isValid = !seg.chord || !!parseChord(seg.chord)
      const chars: React.ReactNode[] = []
      if (segIndex === 0) chars.push(renderGap(sectionId, lineIndex, segments, segStart))
      for (let i = 0; i < seg.text.length; i++) {
        const flatIndex = segStart + i
        chars.push(<span key={`c${i}`} className="ce-char" data-flat={flatIndex}>{seg.text[i]}</span>)
        chars.push(renderGap(sectionId, lineIndex, segments, flatIndex + 1))
      }
      return (
        <span key={segIndex} className="anc-seg2">
          {seg.chord && (
            <span
              className={`anc-chord ce-chord${isValid ? '' : ' ce-chord--warn'}`}
              draggable
              onDragStart={() => setDragging({ sectionId, lineIndex, segIndex })}
              onClick={() => openEditorAt(sectionId, lineIndex, segments, segStart)}
              title={isValid ? undefined : 'No se reconoce como acorde — se guarda igual'}
            >
              {seg.chord}
              <button
                type="button" className="ce-chordDel" aria-label="Borrar acorde"
                onClick={e => { e.stopPropagation(); onLinesChange(sectionId, lineIndex, removeChordAt(segments, segIndex)) }}
              >×</button>
            </span>
          )}
          <span className="anc-lyric">{chars}</span>
        </span>
      )
    })
  }

  return (
    <div className="anc" ref={rootRef}>
      {sections.map(sec => (
        <section key={sec.id} className="anc-sec">
          <div className="anc-secHead">
            <span className="anc-secName">{sec.code} <span className="anc-n">{sec.name}</span></span>
          </div>
          {sec.lines.map((line, lineIndex) => {
            if (line.kind === 'bars') {
              // Cifrado de compases: no hay letra a la que pegarle un
              // acorde — se muestra tal cual, no editable acá.
              return <div key={lineIndex} className="anc-bars">{line.bars}</div>
            }
            return (
              <div key={lineIndex} className="anc-line" data-section={sec.id} data-line={lineIndex}>
                {renderLyricLine(sec.id, lineIndex, line.segments)}
              </div>
            )
          })}
        </section>
      ))}

      {textSelection && hasNextLyricLine(textSelection.sectionId, textSelection.lineIndex) && (
        <button
          type="button"
          className="ce-extractBtn"
          style={{ top: textSelection.rect.bottom + 6, left: textSelection.rect.left }}
          onMouseDown={e => e.preventDefault()} // no perder la selección al tocar el botón
          onClick={() => {
            onExtractToNextLine(textSelection.sectionId, textSelection.lineIndex, textSelection.flatStart, textSelection.flatEnd)
            document.getSelection()?.removeAllRanges()
            setTextSelection(null)
          }}
        >
          → acorde de la línea siguiente
        </button>
      )}
    </div>
  )
}
