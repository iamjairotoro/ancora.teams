'use client'
// Presencia de una hoja, ventana o pantalla de teléfono en el árbol de quien la usa (plan de animaciones, etapa M3; el mecanismo es el de M2, lib/usePresencia.ts). Quien la usa deja de montar la pieza con «{abierta && <Hoja/>}» y la
// pone dentro de <Presente abierta={…}>{() => <Hoja/>}</Presente>: la pieza se monta al abrir, sigue montada mientras sale (entrada y salida animadas en teléfono, app/ancora-movimiento.css) y se desmonta al terminar; si se reabre a mitad
// de la salida, se cancela el desmontaje. La pieza lee la presencia con `usePresenciaActual()` y se pone los atributos con atributosHoja(); sin <Presente> (null) se comporta como siempre.
//   · `valor`: lo que la pieza muestra (el día, la persona…). Mientras está abierta sigue a `valor`; al cerrar se queda con el último, así la salida no cambia de contenido aunque quien la usa ya lo haya borrado.
//   · El contenido nace de nuevo en cada apertura (la función de hijos solo se llama mientras está montada).
//   · El foco vuelve al botón que la abrió en cuanto empieza a cerrarse (también en iPhone, donde un toque no da foco: se recuerda el último control tocado).
//   · `onSalio`: se llama cuando la pieza ya salió del todo (para quien guarda una lista de piezas, como las ventanas de avisar y confirmar).
import { createContext, useContext, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { elementoQueAbrio, useCongelado, usePresencia, type Presencia } from '@/lib/usePresencia'

const Contexto = createContext<Presencia | null>(null)
// Si una pieza se cierra y en ese mismo instante se abre otra encima (una hoja que cierra y deja paso a una ventana de confirmar), el foco NO se le quita a la nueva: el botón al que debía volver queda anotado y lo toma la que cierre después.
let focoPendiente: HTMLElement | null = null
/** La presencia de la pieza en la que estás (null si no está dentro de un <Presente>). */
export const usePresenciaActual = (): Presencia | null => useContext(Contexto)

// useLayoutEffect corre ANTES que los efectos de la pieza (que le pasan el foco): aquí todavía está el botón que la abrió.
const useEfectoLayout = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default function Presente<T = true>({ abierta, valor, onSalio, children }: { abierta: boolean; valor?: T; onSalio?: () => void; children: (valor: T) => ReactNode }) {
  const p = usePresencia(abierta)
  const congelado = useCongelado<T>(valor as T, abierta)
  const volverA = useRef<HTMLElement | null>(null)
  useEfectoLayout(() => {
    if (!abierta) return
    volverA.current = elementoQueAbrio()
    return () => {
      const propio = volverA.current
      setTimeout(() => {
        // Si el botón de origen ya no está (la hoja desde la que se abrió esta ventana se cerró), se usa el que dejó anotado la pieza anterior.
        const el = propio && document.contains(propio) ? propio : focoPendiente && document.contains(focoPendiente) ? focoPendiente : null
        if (!el) return
        const a = document.activeElement as HTMLElement | null
        if (a?.closest?.('[role="dialog"]:not([inert]), [role="alertdialog"]:not([inert])')) { focoPendiente = el; return }      // el foco ya está en otra capa abierta: no se le quita
        focoPendiente = null; el.focus({ preventScroll: true })
      }, 0)
    }
  }, [abierta])
  const estabaMontada = useRef(p.montado)
  useEffect(() => { if (estabaMontada.current && !p.montado) onSalio?.(); estabaMontada.current = p.montado })
  if (!p.montado) return null
  return <Contexto.Provider value={p}>{children(congelado)}</Contexto.Provider>
}
