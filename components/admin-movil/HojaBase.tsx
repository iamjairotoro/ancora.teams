'use client'
// La hoja desde abajo de la administración (la misma del portal: velo 30 / hoja 31; sube en el teléfono y respeta la zona segura del iPhone con --safe-bottom; ventana centrada desde 640 px).
// Comportamiento común: role="dialog", el foco entra, Tab no sale, y se cierra con Escape, tocando el fondo, la ✕ o el gesto «atrás» (agrega una entrada al historial al abrirse y la quita al cerrarse).
// Una acción que navega primero cierra la hoja y recién entonces actúa (así no queda una entrada de historial colgada): `cerrar(despues)`. `onCerrar` lo llama la hoja cuando ya cerró (el padre la desmonta
// y devuelve el foco). Usan esta base «Más» y el «+» de Personas.
import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import hoja from '@/app/portal/_components/disponibilidad/hoja.module.css'
import { useTecladoHoja } from '../useTecladoHoja'

const MARCA = 'ancHoja'

export default function HojaBase({ idTitulo, cabeza, onCerrar, children }: {
  idTitulo: string
  /** El contenido de la cabecera (junto a la ✕). Debe llevar el elemento con id `idTitulo`. */
  cabeza: ReactNode
  onCerrar: () => void
  children: (cerrar: (despues?: () => void) => void) => ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const pendiente = useRef<(() => void) | null>(null)
  useTecladoHoja(ref)      // con el teclado abierto, la hoja queda encima del teclado y con scroll interno (la hoja ya tiene overflow-y:auto)

  useEffect(() => {
    const previo = document.body.style.overflow; document.body.style.overflow = 'hidden'
    ref.current?.focus()
    history.pushState({ [MARCA]: true }, '')
    const alAtras = () => { onCerrar(); const a = pendiente.current; pendiente.current = null; if (a) a() }
    window.addEventListener('popstate', alAtras)
    return () => { window.removeEventListener('popstate', alAtras); document.body.style.overflow = previo }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cerrar(despues?: () => void) {
    pendiente.current = despues ?? null
    if ((history.state as Record<string, unknown> | null)?.[MARCA]) history.back()      // dispara popstate → onCerrar + la acción pendiente
    else { onCerrar(); pendiente.current = null; despues?.() }
  }
  function tecla(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); return }
    if (e.key !== 'Tab') return
    const f = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [role="radio"]') || [])
    if (!f.length) return
    const act = document.activeElement
    if (e.shiftKey && (act === f[0] || act === ref.current)) { e.preventDefault(); f[f.length - 1].focus() }
    else if (!e.shiftKey && act === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
  }

  return (
    <>
      <div className={hoja.velo} onClick={() => cerrar()} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={idTitulo} tabIndex={-1} className={`${hoja.hoja} admin-movil`} style={{ background: 'var(--anc-panel-solid)' }} onKeyDown={tecla}>
        <div className={hoja.asa} aria-hidden="true" />
        <div className={hoja.cabeza}>
          {cabeza}
          <button type="button" className={hoja.cerrar} onClick={() => cerrar()} aria-label="Cerrar"><X size={20} aria-hidden="true" /></button>
        </div>
        {children(cerrar)}
      </div>
    </>
  )
}
