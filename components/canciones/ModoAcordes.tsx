'use client'
// El modo Acordes del editor móvil (etapa C2c): la letra en solo lectura con los acordes encima. Se toca ENTRE dos letras (el cursor naranja) y se elige el acorde en la paleta; se toca un acorde para cambiarlo o quitarlo.
// Un interludio es una línea de solo acordes que va al final de una sección (se agrega con «+ Línea de acordes»). Todo cambio sale por `onCambio` con un documento nuevo; aquí no se guarda nada.
import { useEffect, useMemo, useRef, useState } from 'react'
import { mostrarAcorde, type Acorde, type ItemCompas } from '@/lib/acordes'
import { acordeEn, estructura, finDeSeccion, ponerAcorde, ponerInterludio, quitarAcorde, quitarInterludio, INSTRUMENTAL, type Documento } from '@/lib/editorAcordes'
import { TEXTOS_EDITOR as T } from '@/lib/textos/editorAcordes'
import LineaConAcordes from './LineaConAcordes'
import PaletaAcordes from './PaletaAcordes'
import ui from './editor-cancion-movil.module.css'

type Sel = { tipo: 'letra'; at: number } | { tipo: 'int'; fin: number; idx: number | null } | { tipo: 'nuevaInt'; fin: number } | null
type Props = { doc: Documento; tono: string; onCambio: (d: Documento) => void }

/** Dónde se tocó, como índice de carácter dentro de la línea (con el cursor del navegador si lo sabe; si no, proporcional al ancho del trozo tocado). */
function posicionDeToque(e: React.MouseEvent, linea: HTMLElement): number {
  const x = e.clientX, y = e.clientY, d = document as any
  let nodo: Node | null = null, desde = 0
  if (typeof d.caretPositionFromPoint === 'function') { const p = d.caretPositionFromPoint(x, y); if (p) { nodo = p.offsetNode; desde = p.offset } }
  else if (typeof d.caretRangeFromPoint === 'function') { const r = d.caretRangeFromPoint(x, y); if (r) { nodo = r.startContainer; desde = r.startOffset } }
  const el = nodo ? (nodo.nodeType === 3 ? nodo.parentElement : (nodo as HTMLElement)) : null
  const pieza = el?.closest?.('[data-ini]') as HTMLElement | null
  if (pieza && nodo?.nodeType === 3 && linea.contains(pieza)) return Number(pieza.dataset.ini) + Math.min(desde, Number(pieza.dataset.len))
  const t = (e.target as HTMLElement).closest?.('[data-ini]') as HTMLElement | null
  if (t && linea.contains(t)) { const r = t.getBoundingClientRect(), len = Number(t.dataset.len); return Number(t.dataset.ini) + Math.max(0, Math.min(len, Math.round(((x - r.left) / Math.max(1, r.width)) * len))) }
  return Number(linea.dataset.fin)
}

export default function ModoAcordes({ doc, tono, onCambio }: Props) {
  const [sel, setSel] = useState<Sel>(null)
  const raiz = useRef<HTMLDivElement>(null)
  const est = useMemo(() => estructura(doc.texto), [doc.texto])
  const letra = (a: Acorde) => mostrarAcorde(a, tono, 'american')
  const hayLetra = est.secciones.some(s => s.lineas.length)

  useEffect(() => { raiz.current?.querySelector('[data-sel="1"]')?.scrollIntoView({ block: 'center' }) }, [sel])
  useEffect(() => { setSel(s => (s && s.tipo === 'letra' && s.at > doc.texto.length ? null : s)) }, [doc.texto])

  const alTocar = (e: React.MouseEvent, ini: number, fin: number) => {
    const chip = (e.target as HTMLElement).closest?.('[data-ac]') as HTMLElement | null
    if (chip) { setSel({ tipo: 'letra', at: Number(chip.dataset.ac) }); return }
    setSel({ tipo: 'letra', at: Math.max(ini, Math.min(fin, posicionDeToque(e, e.currentTarget as HTMLElement))) })
  }

  // ── lo que hace la paleta, según lo elegido ──
  const items = (fin: number): ItemCompas[] => doc.interludios.find(x => x.at === fin)?.items ?? []
  const lineaDe = (at: number) => est.lineas.find(l => l.ini <= at && at <= l.fin)
  const paleta = (() => {
    if (!sel) return null
    if (sel.tipo === 'letra') {
      const l = lineaDe(sel.at)
      return {
        actual: acordeEn(doc, sel.at),
        onElegir: (a: Acorde) => { const d = ponerAcorde(doc, sel.at, a); if (d) onCambio(d) },
        onQuitar: () => onCambio(quitarAcorde(doc, sel.at)),
        onMover: l ? (delta: -1 | 1) => setSel({ tipo: 'letra', at: Math.max(l.ini, Math.min(l.fin, sel.at + delta)) }) : undefined,
      }
    }
    if (sel.tipo === 'nuevaInt') {
      return { actual: null as Acorde | null, onElegir: (a: Acorde) => { const d = ponerInterludio(doc, sel.fin, [{ acorde: a }]); if (d) { onCambio(d); setSel({ tipo: 'int', fin: sel.fin, idx: 0 }) } } }
    }
    const lista = items(sel.fin), it = sel.idx !== null ? lista[sel.idx] : undefined
    const poner = (nuevo: ItemCompas[]) => { const d = nuevo.length ? ponerInterludio(doc, sel.fin, nuevo) : quitarInterludio(doc, sel.fin); if (d) onCambio(d) }
    return {
      actual: it && 'acorde' in it ? it.acorde : null,
      onElegir: (a: Acorde) => {
        if (sel.idx === null) { poner([...lista, { acorde: a }]); setSel({ tipo: 'int', fin: sel.fin, idx: lista.length }) }
        else poner(lista.map((x, i) => (i === sel.idx ? { acorde: a } : x)))
      },
      onQuitar: sel.idx !== null ? () => { poner(lista.filter((_, i) => i !== sel.idx)); setSel(null) } : undefined,
      onSeparador: () => { poner([...lista, { texto: '|' }]); setSel({ tipo: 'int', fin: sel.fin, idx: lista.length }) },
    }
  })()

  const fila = (fin: number) => {
    const lista = items(fin); if (!lista.length) return null
    return (
      <div className={ui.compas} key={`int-${fin}`}>
        {lista.map((x, i) => (
          <button key={i} type="button" data-sel={sel?.tipo === 'int' && sel.fin === fin && sel.idx === i ? '1' : undefined} aria-pressed={sel?.tipo === 'int' && sel.fin === fin && sel.idx === i} onClick={() => setSel({ tipo: 'int', fin, idx: i })}>
            {'acorde' in x ? letra(x.acorde) : x.texto}
          </button>
        ))}
        <button type="button" aria-label={T.agregarLineaAcordes} onClick={() => setSel({ tipo: 'int', fin, idx: null })}>+</button>
        <button type="button" onClick={() => { onCambio(quitarInterludio(doc, fin)); setSel(null) }}>{T.quitarLineaAcordes}</button>
      </div>
    )
  }

  if (!hayLetra) return <p className={ui.ayuda} role="status">{T.sinLetraAcordes}</p>
  return (
    <div ref={raiz}>
      <div className={ui.hoja}>
        {est.secciones.map((sec, k) => {
          const fin = finDeSeccion(doc, k)
          return (
            <section key={k} className={ui.sec}>
              {sec.nombre && <p className={ui.secNombre}>{sec.nombre}</p>}
              {sec.lineas.map(i => {
                const l = est.lineas[i]
                if (l.txt.trim() === INSTRUMENTAL) return <div key={i}><p className={ui.fijo}>{T.letraInstrumental}</p>{fila(l.fin)}</div>
                const anclas = doc.anclas.filter(a => a.at >= l.ini && a.at <= l.fin), caret = sel?.tipo === 'letra' && sel.at >= l.ini && sel.at <= l.fin ? sel.at : null
                const cortes = Array.from(new Set([l.ini, ...anclas.map(a => a.at), ...(caret !== null ? [caret] : [])])).sort((a, b) => a - b)
                return (
                  <div key={i}>
                    <LineaConAcordes
                      className={ui.linea} linea={{ 'data-fin': l.fin, onClick: (e: React.MouseEvent) => alTocar(e, l.ini, l.fin), role: 'presentation' }}
                      trozos={cortes.map((desde, n) => ({ texto: l.txt.slice(desde - l.ini, (n + 1 < cortes.length ? cortes[n + 1] : l.fin) - l.ini), acorde: anclas.find(x => x.at === desde)?.acorde, marca: sel?.tipo === 'letra' && sel.at === desde }))}
                      acorde={p => <button type="button" className={`${ui.ac} ${sel?.tipo === 'letra' && sel.at === l.ini + p.ini ? ui.acSel : ''}`} data-ac={l.ini + p.ini} aria-label={letra(p.acorde)}>{letra(p.acorde)}</button>}
                      pieza={p => ({ className: p.marca ? ui.caret : undefined, datos: p.marca ? { 'data-sel': '1' } : undefined })}
                      texto={p => ({ 'data-ini': l.ini + p.ini, 'data-len': p.texto.length })}
                    />
                    {fila(l.fin)}
                  </div>
                )
              })}
              {fin !== null && items(fin).length === 0 && <button type="button" className={ui.agregar} onClick={() => setSel({ tipo: 'nuevaInt', fin })}>{T.agregarLineaAcordes}</button>}
            </section>
          )
        })}
      </div>
      <p className={ui.ayuda}>{T.ayudaAcordes}</p>
      {sel && <div aria-hidden="true" style={{ height: 300 }} />}
      {sel && paleta && <PaletaAcordes tono={tono} actual={paleta.actual} onElegir={paleta.onElegir} onQuitar={paleta.onQuitar} onMover={'onMover' in paleta ? paleta.onMover : undefined} onSeparador={'onSeparador' in paleta ? paleta.onSeparador : undefined} onCerrar={() => setSel(null)} />}
    </div>
  )
}
