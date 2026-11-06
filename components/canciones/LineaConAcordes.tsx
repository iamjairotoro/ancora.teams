'use client'
// Una línea de letra con los acordes encima, partida por palabra (lib/palabrasConAcordes.ts). La usan el editor móvil (ModoAcordes) y la hoja de lectura (HojaAcordes): un solo módulo de dibujo.
// Cada pantalla pone lo suyo: la clase de la línea, qué se dibuja en el carril del acorde (texto en la lectura, botón en el editor) y los datos que necesita para tocar (data-*).
import type { ReactNode } from 'react'
import { agruparPalabras, type Pieza, type Trozo } from '@/lib/palabrasConAcordes'
import ui from './linea-con-acordes.module.css'

type Datos = Record<string, string | number | undefined>
type Props<A> = {
  trozos: Trozo<A>[]
  /** Lo que va en el carril del acorde de una pieza que tiene acorde. */
  acorde: (p: Pieza<A> & { acorde: A }) => ReactNode
  /** Clase y datos de la pieza (el editor marca ahí el cursor). */
  pieza?: (p: Pieza<A>) => { className?: string; datos?: Datos }
  /** Datos del texto de la pieza (el editor guarda ahí dónde empieza). */
  texto?: (p: Pieza<A>) => Datos
  como?: 'p' | 'div'
  className?: string
  /** Resto de atributos de la línea (en el editor: onClick, role, data-fin). */
  linea?: Record<string, unknown>
}

export default function LineaConAcordes<A>({ trozos, acorde, pieza, texto, como = 'div', className, linea }: Props<A>) {
  const Raiz = como
  return (
    <Raiz className={className} {...(linea as object)}>
      {agruparPalabras(trozos).map((palabra, i) => (
        <span key={i} className={ui.pal}>
          {palabra.map((p, k) => {
            const x = pieza?.(p)
            const tieneAcorde = p.acorde !== undefined
            return (
              <span key={`${p.ini}-${k}`} className={[ui.pieza, x?.className].filter(Boolean).join(' ')} {...(x?.datos as object)}>
                <span className={ui.ac} data-a="" aria-hidden={tieneAcorde ? undefined : true}>{tieneAcorde ? acorde(p as Pieza<A> & { acorde: A }) : null}</span>
                <span className={ui.tx} data-t="" {...(texto?.(p) as object)}>{p.texto}</span>
              </span>
            )
          })}
        </span>
      ))}
    </Raiz>
  )
}
