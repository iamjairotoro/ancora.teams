'use client'
// La tira de partes de la lectura (etapa C3a): un círculo de 44 px por cada ENTRADA del arreglo (o por sección, sin arreglo), con el borde del color de la parte, su abreviatura dentro y las repeticiones como insignia en la esquina.
// Tocar una parte salta a su sección. Un toque largo, o un toque en la parte que ya está activa, muestra el nombre en un globo. Es solo presentación: no sabe de datos ni de preferencias.
import { useEffect, useRef, useState } from 'react'
import type { ClaveParte } from '@/lib/partesCancion'
import { TEXTOS_ACORDES as T } from '@/lib/textos/acordesLectura'
import ui from './lectura-partes.module.css'

export type ParteTira = { abrev: string; clave: ClaveParte; nombre: string; repeat: number }
const ESPERA_TOQUE_LARGO = 450, VIDA_GLOBO = 2200, MARGEN_TIRA = 12, ESPACIO_GLOBO = 36

/** Cuánto hay que correr la tira (px, + a la derecha) para que un círculo quede entero dentro de ella con un respiro; 0 si ya se ve. Solo horizontal. */
export function corrimientoParaVer(contenedor: { left: number; right: number }, boton: { left: number; right: number }, margen = MARGEN_TIRA): number {
  return boton.left < contenedor.left + margen ? boton.left - contenedor.left - margen : boton.right > contenedor.right - margen ? boton.right - contenedor.right + margen : 0
}
/** El globo con el nombre va debajo de los círculos cuando encima de la tira no hay sitio (la tira está pegada arriba, bajo la barra de estado); si hay, va encima, como en la maqueta. */
export function globoVaAbajo(cajaTop: number, pegadaEn: number): boolean { return cajaTop - pegadaEn < ESPACIO_GLOBO }

export default function TiraPartes({ partes, activa, onIr }: { partes: ParteTira[]; activa: number; onIr: (i: number) => void }) {
  const [globo, setGlobo] = useState<{ i: number; left: number; abajo: boolean } | null>(null)
  const caja = useRef<HTMLDivElement>(null), largo = useRef<ReturnType<typeof setTimeout> | null>(null), vida = useRef<ReturnType<typeof setTimeout> | null>(null), fueLargo = useRef(false)
  const lista = useRef<HTMLUListElement>(null)
  useEffect(() => () => { if (largo.current) clearTimeout(largo.current); if (vida.current) clearTimeout(vida.current) }, [])

  // La parte activa se mantiene visible DENTRO de la tira: si el desplazamiento la pasa a una que queda fuera del borde, la tira se corre solo en horizontal (nunca mueve la página).
  useEffect(() => {
    const ul = lista.current, btn = ul?.querySelectorAll('button')[activa]
    if (!ul || !btn) return
    const dx = corrimientoParaVer(ul.getBoundingClientRect(), btn.getBoundingClientRect())
    if (!dx) return
    const reducido = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ul.scrollTo({ left: ul.scrollLeft + dx, behavior: reducido ? 'auto' : 'smooth' })
  }, [activa])

  const mostrar = (i: number, el: HTMLElement) => {
    const c = caja.current?.getBoundingClientRect(), r = el.getBoundingClientRect()
    if (!c) return
    const centro = r.left - c.left + r.width / 2
    const pegada = parseFloat(getComputedStyle(caja.current as HTMLElement).top) || 0      // dónde se pega la tira (zona segura); si no hay ~36 px libres encima de ella, el globo va debajo
    setGlobo({ i, left: Math.max(8, Math.min(centro - 40, c.width - 96)), abajo: globoVaAbajo(c.top, pegada) })
    if (vida.current) clearTimeout(vida.current)
    vida.current = setTimeout(() => setGlobo(null), VIDA_GLOBO)
  }
  const alBajar = (i: number, e: React.PointerEvent<HTMLButtonElement>) => {
    fueLargo.current = false
    const el = e.currentTarget
    largo.current = setTimeout(() => { fueLargo.current = true; mostrar(i, el) }, ESPERA_TOQUE_LARGO)
  }
  const cancelarLargo = () => { if (largo.current) { clearTimeout(largo.current); largo.current = null } }
  const alTocar = (i: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (fueLargo.current) { fueLargo.current = false; return }          // el toque largo ya mostró el globo: soltar no salta
    if (i === activa) { mostrar(i, e.currentTarget); return }
    setGlobo(null); onIr(i)
  }

  return (
    <div ref={caja} className={ui.tiraCaja}>
      {globo && <span className={globo.abajo ? `${ui.tip} ${ui.tipAbajo}` : ui.tip} style={{ left: globo.left }} role="status">{partes[globo.i]?.nombre}</span>}
      <ul ref={lista} className={ui.tira} aria-label={T.partes} onScroll={() => setGlobo(null)}>
        {partes.map((p, i) => (
          <li key={i}>
            <button type="button" className={ui.circ} data-parte={p.clave} aria-label={T.parteConRepeticion(p.nombre, p.repeat)} aria-current={i === activa ? 'true' : undefined}
              onPointerDown={e => alBajar(i, e)} onPointerUp={cancelarLargo} onPointerLeave={cancelarLargo} onPointerCancel={cancelarLargo} onContextMenu={e => e.preventDefault()} onClick={e => alTocar(i, e)}>
              {p.abrev}{p.repeat > 1 && <span className={ui.rep} aria-hidden="true">{p.repeat}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
