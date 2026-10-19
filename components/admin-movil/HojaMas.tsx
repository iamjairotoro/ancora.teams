'use client'
// Hoja «Más» (Menú · A): lo que no cabe en los ítems del menú inferior — Calendario, Chats, Admins (solo el owner) —, la Apariencia y Cerrar sesión. Es la misma hoja del portal (velo 30 / hoja 31;
// sube desde abajo en el teléfono y respeta la zona segura del iPhone con --safe-bottom). role="dialog", el foco entra, Tab no sale, y se cierra con Escape, tocando el fondo, la ✕ o el gesto «atrás»
// (la hoja agrega una entrada al historial al abrirse y la quita al cerrarse). Al cerrar, el foco vuelve al botón «Más» del menú. Una fila que navega primero cierra la hoja y recién entonces actúa
// (así no queda una entrada de historial colgada).
import { useEffect, useRef } from 'react'
import { CalendarDays, ChevronRight, LogOut, MessageCircle, ShieldCheck, X } from 'lucide-react'
import type { ThemePref } from '@/lib/useDarkMode'
import { filasDeMas } from '@/lib/admin/menuMovil'
import AparienciaControl from '@/app/portal/_components/AparienciaControl'
import hoja from '@/app/portal/_components/disponibilidad/hoja.module.css'
import ui from './mas.module.css'

const ICONO = { disponibilidad: CalendarDays, chats: MessageCircle, admins: ShieldCheck } as const
const MARCA = 'ancMas'

export default function HojaMas({ nombreOrg, iniciales, esOwner, themePref, onThemePref, onTab, onSignOut, onCerrar }: {
  nombreOrg: string; iniciales: string; esOwner: boolean
  themePref: ThemePref; onThemePref: (p: ThemePref) => void
  onTab: (tab: 'disponibilidad' | 'chats' | 'admins') => void
  onSignOut: () => void
  onCerrar: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const pendiente = useRef<(() => void) | null>(null)
  const cerrandoPorAtras = useRef(false)

  useEffect(() => {
    const previo = document.body.style.overflow; document.body.style.overflow = 'hidden'
    ref.current?.focus()
    history.pushState({ [MARCA]: true }, '')
    const alAtras = () => { cerrandoPorAtras.current = true; onCerrar(); const a = pendiente.current; pendiente.current = null; if (a) a() }
    window.addEventListener('popstate', alAtras)
    return () => { window.removeEventListener('popstate', alAtras); document.body.style.overflow = previo }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Cierra la hoja (quitando su entrada del historial) y, si hay `despues`, lo hace cuando ya cerró. */
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
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="mas-titulo" tabIndex={-1} className={`${hoja.hoja} admin-movil`} style={{ background: 'var(--anc-panel-solid)' }} onKeyDown={tecla}>
        <div className={hoja.asa} aria-hidden="true" />
        <div className={hoja.cabeza}>
          <div className={ui.quien}>
            <span className={ui.ini} aria-hidden="true">{iniciales}</span>
            <div><h2 className={ui.org} id="mas-titulo">{nombreOrg}</h2><p className={ui.sub}>Administración</p></div>
          </div>
          <button type="button" className={hoja.cerrar} onClick={() => cerrar()} aria-label="Cerrar"><X size={20} aria-hidden="true" /></button>
        </div>

        <div className={ui.lista}>
          {filasDeMas({ esOwner }).map(f => {
            const Icono = ICONO[f.key]
            return (
              <button key={f.key} type="button" className={ui.fila} onClick={() => cerrar(() => onTab(f.tab))}>
                <span className={ui.ficono} aria-hidden="true"><Icono size={18} strokeWidth={1.75} /></span>
                <span className={ui.ftxt}><span className={ui.ft}>{f.label}</span>{f.detalle && <span className={ui.fd}>{f.detalle}</span>}</span>
                <ChevronRight size={16} className={ui.chev} aria-hidden="true" />
              </button>
            )
          })}
        </div>

        <AparienciaControl pref={themePref} onChange={onThemePref} />

        <div className={ui.lista}>
          <button type="button" className={`${ui.fila} ${ui.salir}`} onClick={() => cerrar(onSignOut)}>
            <LogOut size={20} strokeWidth={1.75} aria-hidden="true" /><span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </>
  )
}
