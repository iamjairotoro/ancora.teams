'use client'
// El modo Acordes del editor móvil (etapa C2c): la letra en solo lectura con los acordes encima. Se toca ENTRE dos letras (el cursor naranja) y se elige el acorde en la paleta; se toca un acorde para cambiarlo o quitarlo.
// Un interludio es una línea de solo acordes que va al final de una sección (se agrega con «+ Línea de acordes»). Todo cambio sale por `onCambio` con un documento nuevo; aquí no se guarda nada.
import { useEffect, useMemo, useRef, useState } from 'react'
import { mostrarAcorde, type Acorde, type ItemCompas } from '@/lib/acordes'
import { acordeEn, anchoDeEspacio, borrarSeccion, conAnchoDeEspacio, ESPACIOS_EN_COMPAS, esEspacio, insertarPieza, lineasDeCompas, moverPieza, nuevoEspacio, ponerLineaCompas, quitarLineaCompas, cambiarTipoSeccion, estructura, renumerarVersos, tipoDeNombre, TIPOS_SECCION, finDeSeccion, iniciosDePalabra, moverAcorde, palabraEn, ponerAcorde, siguientePalabra, ponerInterludio, quitarAcorde, quitarInterludio, INSTRUMENTAL, type Documento } from '@/lib/editorAcordes'
import { TEXTOS_EDITOR as T } from '@/lib/textos/editorAcordes'
import LineaConAcordes from './LineaConAcordes'
import PaletaAcordes, { type DatosPanel } from './PaletaAcordes'
import ui from './editor-cancion-movil.module.css'

type Sel = { tipo: 'letra'; at: number } | { tipo: 'int'; fin: number; linea: number; idx: number | null } | { tipo: 'nuevaInt'; fin: number } | null          // int: la línea de acordes `linea` (0 = la primera) del final de una línea de letra y su pieza `idx` (null = ninguna: lo siguiente va al final)
type Mas = { mas: true }          // el «+» que se dibuja sobre cada palabra de la línea activa (viaja como «acorde» de su trozo, solo en pantalla)
const esMas = (a: Acorde | Mas): a is Mas => 'mas' in a
type Props = { doc: Documento; tono: string; notacion?: 'american' | 'number'; onCambio: (d: Documento, aviso?: string) => void }

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

export default function ModoAcordes({ doc, tono, notacion = 'american', onCambio }: Props) {
  const [sel, setSel] = useState<Sel>(null)
  const [menu, setMenu] = useState<number | null>(null)          // la sección cuyo menú (cambiar tipo, renumerar, borrar) está abierto
  const raiz = useRef<HTMLDivElement>(null)
  const est = useMemo(() => estructura(doc.texto), [doc.texto])
  const letra = (a: Acorde) => mostrarAcorde(a, tono, notacion)
  const hayLetra = est.secciones.some(s => s.lineas.length)

  // Al elegir un lugar, la línea queda a la vista ENTRE la barra y el panel fijo (que tapa la parte baja de la pantalla): se desplaza solo lo que haga falta.
  useEffect(() => {
    const marca = raiz.current?.querySelector('[data-sel="1"]') as HTMLElement | null | undefined
    if (!marca) return
    const el = (marca.closest('[data-fin]') as HTMLElement | null) ?? marca
    let cont: HTMLElement | null = el.parentElement
    while (cont && !/(auto|scroll)/.test(getComputedStyle(cont).overflowY)) cont = cont.parentElement
    if (!cont) { el.scrollIntoView({ block: 'center' }); return }
    const panel = document.querySelector('[role="dialog"][aria-label^="Acordes en"]'), tope = cont.getBoundingClientRect().top + 8, limite = (panel ? panel.getBoundingClientRect().top : window.innerHeight) - 12
    const r = el.getBoundingClientRect()
    if (r.bottom > limite) cont.scrollBy(0, r.bottom - limite)
    else if (r.top < tope) cont.scrollBy(0, r.top - tope)
  }, [sel])
  useEffect(() => { setSel(s => (s && s.tipo === 'letra' && s.at > doc.texto.length ? null : s)) }, [doc.texto])

  const alTocar = (e: React.MouseEvent, ini: number, fin: number) => {
    const chip = (e.target as HTMLElement).closest?.('[data-ac], [data-mas]') as HTMLElement | null
    if (chip) { setSel({ tipo: 'letra', at: Number(chip.dataset.ac ?? chip.dataset.mas) }); return }
    setSel({ tipo: 'letra', at: Math.max(ini, Math.min(fin, posicionDeToque(e, e.currentTarget as HTMLElement))) })
  }

  // ── lo que hace la paleta, según lo elegido ──
  const lineas = (fin: number) => lineasDeCompas(doc, fin)
  const lineaDe = (at: number) => est.lineas.find(l => l.ini <= at && at <= l.fin)
  const etiqueta = (x: ItemCompas | undefined, falta: string) => (!x ? falta : 'acorde' in x ? letra(x.acorde) : esEspacio(x) ? '·' : x.texto)
  const paleta: DatosPanel | null = (() => {
    if (!sel) return null
    if (sel.tipo === 'letra') {
      const l = lineaDe(sel.at)
      return {
        actual: acordeEn(doc, sel.at),
        onElegir: (a: Acorde) => { const d = ponerAcorde(doc, sel.at, a); if (d) onCambio(d) },
        onQuitar: () => onCambio(quitarAcorde(doc, sel.at)),
        palabra: palabraEn(doc, sel.at),
        // ‹ › mueven el acorde una letra (y el ancla con él); si aún no hay acorde, mueven solo el lugar donde se va a poner
        onMover: l ? (delta: -1 | 1) => {
          if (acordeEn(doc, sel.at)) { const d = moverAcorde(doc, sel.at, delta); if (d) { onCambio(d); setSel({ tipo: 'letra', at: sel.at + delta }) } }
          else setSel({ tipo: 'letra', at: Math.max(l.ini, Math.min(l.fin, sel.at + delta)) })
        } : undefined,
        onSiguiente: () => setSel(siguientePalabra(doc, sel.at) === null ? null : { tipo: 'letra', at: siguientePalabra(doc, sel.at) as number }),
      }
    }
    // ── una línea de acordes (interludio): acordes, barras «|» y espacios como piezas propias ──
    const nueva = sel.tipo === 'nuevaInt', n = nueva ? lineas(sel.fin).length : sel.linea
    const lista: ItemCompas[] = nueva ? [] : lineas(sel.fin)[n] ?? [], idx = nueva ? null : sel.idx, it = idx !== null ? lista[idx] : undefined
    const poner = (nuevoItems: ItemCompas[], dondeQueda: number | null) => { const d = ponerLineaCompas(doc, sel.fin, n, nuevoItems); if (d) { onCambio(d); setSel(nuevoItems.length && dondeQueda !== null ? { tipo: 'int', fin: sel.fin, linea: n, idx: dondeQueda } : null) } }
    const agregar = (pieza: ItemCompas) => { const r = insertarPieza(lista, idx, pieza); poner(r.items, r.idx) }          // después de la pieza elegida (o al final)
    const ancho = anchoDeEspacio(it)
    return {
      actual: it && 'acorde' in it ? it.acorde : null,
      onElegir: (a: Acorde) => { if (it && 'acorde' in it && idx !== null) poner(lista.map((x, i) => (i === idx ? { acorde: a } : x)), idx); else agregar({ acorde: a }) },
      onQuitar: idx !== null ? () => poner(lista.filter((_, i) => i !== idx), null) : undefined,
      onSeparador: () => agregar({ texto: '|' }),
      onEspacio: ESPACIOS_EN_COMPAS ? () => agregar(nuevoEspacio(2)) : undefined,
      ancho: ancho !== null && idx !== null ? { valor: ancho, onMenos: () => { const c = conAnchoDeEspacio(lista, idx, -1); if (c) poner(c, idx) }, onMas: () => { const c = conAnchoDeEspacio(lista, idx, 1); if (c) poner(c, idx) } } : undefined,
      onMover: idx !== null && ancho === null ? (delta: -1 | 1) => { const c = moverPieza(lista, idx, delta); if (c) poner(c, idx + delta) } : undefined,
      onSiguiente: idx !== null ? () => setSel(idx + 1 < lista.length ? { tipo: 'int', fin: sel.fin, linea: n, idx: idx + 1 } : null) : undefined,
      titulo: it ? (ancho !== null && idx !== null
        ? { principal: T.espacio, detalle: T.espacioEntre(etiqueta(lista[idx - 1], T.inicio), etiqueta(lista[idx + 1], T.final), ancho), grande: false }
        : { principal: etiqueta(it, ''), detalle: 'acorde' in it ? T.enLineaDeAcordes : T.barraDeCompas, grande: 'acorde' in it })
        : { principal: T.lineaDeAcordes, detalle: T.elegirPieza, grande: false },
      soloLinea: true, textoQuitar: T.quitarPieza, textoSiguiente: T.siguientePieza,
    }
  })()

  const fila = (fin: number) => {
    const todas = lineas(fin); if (!todas.length) return null
    return todas.map((lista, n) => {
      const esta = (i: number | null) => sel?.tipo === 'int' && sel.fin === fin && sel.linea === n && sel.idx === i
      return (
        <div className={ui.compas} key={`int-${fin}-${n}`}>
          {lista.map((x, i) => (
            <button key={i} type="button" className={esEspacio(x) ? ui.espacio : undefined} style={esEspacio(x) ? ({ '--n': anchoDeEspacio(x) } as React.CSSProperties) : undefined} data-sel={esta(i) ? '1' : undefined} aria-pressed={esta(i)} aria-label={esEspacio(x) ? T.espacioDeAncho(anchoDeEspacio(x) ?? 0) : undefined} onClick={() => setSel({ tipo: 'int', fin, linea: n, idx: i })}>
              {'acorde' in x ? letra(x.acorde) : esEspacio(x) ? '' : x.texto}
            </button>
          ))}
          <button type="button" aria-label={T.agregarLineaAcordes} onClick={() => setSel({ tipo: 'int', fin, linea: n, idx: null })}>+</button>
          <button type="button" onClick={() => { const d = quitarLineaCompas(doc, fin, n); if (d) onCambio(d); setSel(null) }}>{T.quitarLineaAcordes}</button>
        </div>
      )
    })
  }

  if (!hayLetra) return <p className={ui.ayuda} role="status">{T.sinLetraAcordes}</p>
  return (
    <div ref={raiz}>
      <div className={ui.hoja}>
        {est.secciones.map((sec, k) => {
          const fin = finDeSeccion(doc, k)
          return (
            <section key={k} className={ui.sec}>
              {sec.nombre && <button type="button" className={ui.secNombre} aria-haspopup="dialog" onClick={() => { setSel(null); setMenu(k) }}>{sec.nombre} <span aria-hidden="true">▾</span></button>}
              {sec.lineas.map(i => {
                const l = est.lineas[i]
                if (l.txt.trim() === INSTRUMENTAL) return <div key={i}><p className={ui.fijo}>{T.letraInstrumental}</p>{fila(l.fin)}</div>
                const anclas = doc.anclas.filter(a => a.at >= l.ini && a.at <= l.fin), caret = sel?.tipo === 'letra' && sel.at >= l.ini && sel.at <= l.fin ? sel.at : null
                const palabras = caret !== null ? iniciosDePalabra(l) : []          // solo la línea activa lleva un «+» sobre cada palabra
                const cortes = Array.from(new Set([l.ini, ...anclas.map(a => a.at), ...palabras, ...(caret !== null ? [caret] : [])])).sort((a, b) => a - b)
                return (
                  <div key={i}>
                    <LineaConAcordes
                      className={ui.linea} linea={{ 'data-fin': l.fin, onClick: (e: React.MouseEvent) => alTocar(e, l.ini, l.fin), role: 'presentation' }}
                      trozos={cortes.map((desde, n) => ({ texto: l.txt.slice(desde - l.ini, (n + 1 < cortes.length ? cortes[n + 1] : l.fin) - l.ini), acorde: (anclas.find(x => x.at === desde)?.acorde ?? (palabras.includes(desde) ? ({ mas: true } as Mas) : undefined)) as Acorde | Mas | undefined, marca: sel?.tipo === 'letra' && sel.at === desde }))}
                      acorde={p => esMas(p.acorde)
                        ? <button type="button" className={`${ui.mas} ${sel?.tipo === 'letra' && sel.at === l.ini + p.ini ? ui.masSel : ''}`} data-mas={l.ini + p.ini} aria-label={T.ponerAcordeAqui}>+</button>
                        : <button type="button" className={`${ui.ac} ${sel?.tipo === 'letra' && sel.at === l.ini + p.ini ? ui.acSel : ''}`} data-ac={l.ini + p.ini} aria-label={letra(p.acorde)}>{letra(p.acorde)}</button>}
                      pieza={p => ({ className: p.marca ? ui.caret : undefined, datos: p.marca ? { 'data-sel': '1' } : undefined })}
                      texto={p => ({ 'data-ini': l.ini + p.ini, 'data-len': p.texto.length })}
                    />
                    {fila(l.fin)}
                  </div>
                )
              })}
              {fin !== null && <button type="button" className={ui.agregar} onClick={() => setSel({ tipo: 'nuevaInt', fin })}>{T.agregarLineaAcordes}</button>}
            </section>
          )
        })}
      </div>
      <p className={ui.ayuda}>{T.ayudaAcordes}</p>
      {menu !== null && est.secciones[menu] && (() => {
        const sec = est.secciones[menu], esVerso = tipoDeNombre(sec.nombre) === 'verso'
        const cerrar = () => setMenu(null)
        return (
          <div className={ui.velo} role="presentation" onClick={cerrar}>
            <div className={ui.hojaSec} role="dialog" aria-modal="true" aria-label={T.seccionDe(sec.nombre)} onClick={e => e.stopPropagation()}>
              <h3>{sec.nombre}</h3>
              <p className={ui.secEt}>{T.cambiarTipo}</p>
              <div className={ui.tipos}>
                {TIPOS_SECCION.map(tp => <button key={tp} type="button" aria-pressed={tipoDeNombre(sec.nombre) === tp} onClick={() => { const d = cambiarTipoSeccion(doc, menu, tp); if (d && d !== doc) onCambio(d); cerrar() }}>{T.tiposSeccion[tp]}</button>)}
              </div>
              {esVerso && <button type="button" className={ui.fila2} onClick={() => { const d = renumerarVersos(doc); if (d !== doc) onCambio(d); cerrar() }}>{T.renumerarVersos}</button>}
              <button type="button" className={`${ui.fila2} ${ui.peligro}`} onClick={() => { const r = borrarSeccion(doc, menu); if (r) onCambio(r.doc, T.seccionBorrada(r.nombre, r.quitados.acordes, r.quitados.interludios)); setSel(null); cerrar() }}>{T.borrarSeccion}</button>
              <button type="button" className={ui.fila2} onClick={cerrar}>{T.cerrar}</button>
            </div>
          </div>
        )
      })()}
      {sel && <div aria-hidden="true" style={{ height: 340 }} />}
      {sel && paleta && <PaletaAcordes tono={tono} {...paleta} onCerrar={() => setSel(null)} />}
    </div>
  )
}
