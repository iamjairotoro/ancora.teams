'use client'
// «Escribirle a…» (punto 54, commit 6): la hoja con las personas con quienes se puede iniciar un mensaje directo. En el teléfono sube desde abajo; desde 640 px es una ventana centrada (la misma hoja que Disponibilidad:
// ../disponibilidad/hoja.module.css, velo 30 / hoja 31). role="dialog", el foco entra, Tab no sale, Escape y tocar el fondo la cierran, y el foco vuelve al botón que la abrió.
import { useEffect, useRef } from 'react'
import { AvatarPersona } from './ListaChats'
import type { PersonaChat } from './tipos'
import hoja from '../disponibilidad/hoja.module.css'
import ui from './chats.module.css'

export default function HojaDirecto({ personas, onElegir, onCerrar }: { personas: PersonaChat[]; onElegir: (id: string) => void; onCerrar: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previo = document.body.style.overflow; document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => { document.body.style.overflow = previo }
  }, [])
  function tecla(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); onCerrar(); return }
    if (e.key !== 'Tab') return
    const f = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled])') || [])
    if (!f.length) return
    const act = document.activeElement
    if (e.shiftKey && (act === f[0] || act === ref.current)) { e.preventDefault(); f[f.length - 1].focus() }
    else if (!e.shiftKey && act === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
  }
  return (
    <>
      <div className={hoja.velo} onClick={onCerrar} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="chat-directo-titulo" tabIndex={-1} className={hoja.hoja} style={{ background: 'var(--anc-panel-solid)' }} onKeyDown={tecla}>
        <div className={hoja.asa} aria-hidden="true" />
        <div className={hoja.cabeza}>
          <h2 id="chat-directo-titulo" className={hoja.titulo}>Escribirle a…</h2>
          <button type="button" className={ui.cerrar} onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>
        {personas.length === 0 ? <p className={ui.vacio} style={{ boxShadow: 'none' }}>No hay nadie más en el equipo todavía.</p> : (
          <ul className={ui.personas}>
            {personas.map(p => (
              <li key={p.id}><button type="button" className={ui.persona} onClick={() => onElegir(p.id)}><AvatarPersona p={p} chico />{`${p.nombre} ${p.apellido ?? ''}`.trim()}</button></li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
