'use client'
// La ventana centrada de teléfono (mockup Ventanas-A, 2 y 3): una pregunta corta (dos botones: secundario gris y primario claro) o un mensaje de resultado (un solo botón). Lo corto va al centro; lo largo sigue siendo
// hoja o pantalla. Comportamiento común con HojaBase: role="alertdialog", el foco entra y no sale con Tab, se cierra con Escape, tocando el fondo o con el gesto «atrás» (agrega una entrada al historial y la quita al cerrar).
// Cerrar sin elegir cuenta como cancelar (`onCerrar`). Va por portal a <body>.
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Bell, CheckCircle2, Info, Trash2 } from 'lucide-react'
import ui from './ventanas.module.css'

const MARCA = 'ancVentana'
export type TonoVentana = 'info' | 'ok' | 'error' | 'aviso' | 'peligro'
export interface BotonVentana { texto: string; primario?: boolean; peligro?: boolean; /** Se llama DESPUÉS de cerrar la ventana (ya sin su entrada del historial). */ onClick: () => void; /** Se llama al tocar, ANTES de cerrar (para anotar la decisión). */ antes?: () => void }

const ICONOS: Record<TonoVentana, ReactNode> = { info: <Bell size="1.25rem" aria-hidden="true" />, ok: <CheckCircle2 size="1.25rem" aria-hidden="true" />, error: <AlertTriangle size="1.25rem" aria-hidden="true" />, aviso: <Info size="1.25rem" aria-hidden="true" />, peligro: <Trash2 size="1.25rem" aria-hidden="true" /> }

export default function VentanaCentrada({ titulo, texto, tono = 'info', botones, onCerrar, children, controlada = false, ocupado = false, error, sinIcono = false }: {
  titulo: string; texto?: string; tono?: TonoVentana; botones: BotonVentana[]; onCerrar: () => void; children?: ReactNode
  /** Modo CONTROLADA (confirmaciones que guardan, como las del portal): sin historial, los botones no cierran solos —quien la usa la cierra cuando termina—, mientras está `ocupado` nada cancela ni se pulsa dos veces, y `error` se dice dentro. El foco entra en el primer botón (la acción segura). */
  controlada?: boolean; ocupado?: boolean; error?: string | null
  /** Sin el círculo del ícono arriba (la ventana de Plantillas, Checklist-Plantillas-A). */
  sinIcono?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const idT = useId()
  const pendiente = useRef<(() => void) | null>(null)

  useEffect(() => {
    const previo = document.body.style.overflow; document.body.style.overflow = 'hidden'
    if (controlada) {
      const antes = document.activeElement as HTMLElement | null
      ref.current?.querySelector<HTMLElement>('button')?.focus()
      return () => { document.body.style.overflow = previo; antes?.focus?.() }
    }
    ref.current?.focus()
    history.pushState({ [MARCA]: true }, '')
    const alAtras = () => { onCerrar(); const a = pendiente.current; pendiente.current = null; if (a) a() }
    window.addEventListener('popstate', alAtras)
    return () => { window.removeEventListener('popstate', alAtras); document.body.style.overflow = previo }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Cierra (quitando la entrada del historial) y luego actúa. */
  function cerrar(despues?: () => void) {
    if (controlada) { if (!ocupado) onCerrar(); return }
    pendiente.current = despues ?? null
    if ((history.state as Record<string, unknown> | null)?.[MARCA]) history.back()
    else { onCerrar(); pendiente.current = null; despues?.() }
  }
  function tecla(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); return }
    if (e.key !== 'Tab') return
    const f = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled])') || [])
    if (!f.length) return
    const act = document.activeElement
    if (e.shiftKey && (act === f[0] || act === ref.current)) { e.preventDefault(); f[f.length - 1].focus() }
    else if (!e.shiftKey && act === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
  }
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className={ui.velo} onClick={e => { if (e.target === e.currentTarget) cerrar() }}>
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby={idT} tabIndex={-1} className={`${ui.ventana} admin-movil`} onKeyDown={tecla}>
        {!sinIcono && <span className={`${ui.icono} ${ui[tono] ?? ''}`}>{ICONOS[tono]}</span>}
        <h2 id={idT} className={ui.titulo}>{titulo}</h2>
        {texto && <p className={ui.texto}>{texto}</p>}
        {children && <div className={ui.cuerpo}>{children}</div>}
        {error && <p role="alert" className={ui.error}>{error}</p>}
        <div className={ui.botones}>
          {botones.map(b => <button key={b.texto} type="button" disabled={controlada && ocupado} aria-busy={controlada && ocupado && b.primario ? true : undefined} className={`${ui.boton}${b.primario ? ` ${b.peligro ? ui.peligroBtn : ui.primario}` : ''}`} onClick={() => { if (controlada) { b.onClick(); return } b.antes?.(); cerrar(b.onClick) }}>{b.texto}</button>)}
        </div>
      </div>
    </div>, document.body)
}
