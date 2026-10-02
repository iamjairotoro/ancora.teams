'use client'
/* ════════════════════════════════════════════════════════════════════════
   AssignPicker.tsx — selector para asignar a una posición (punto 32).
   Reemplaza al <select> nativo para poder mostrar, por persona, una etiqueta
   (Disponible / Bloqueó este día / Ya asignado en {equipo} / Ya tiene
   {posición}). Avisa, NO impide: cualquier fila se puede elegir. La lógica
   de qué decir vive en lib/assignHints.ts; esto solo la dibuja.
   Teclado: ↑ ↓ Inicio Fin mueven, Enter elige, Escape cierra.
   ════════════════════════════════════════════════════════════════════════ */
import { useEffect, useId, useRef, useState } from 'react'
import type { AssignOption } from '@/lib/assignHints'
import styles from './assign-picker.module.css'

interface Props {
  options: AssignOption[]
  title: string                 // «Asignar a Voces · Alabanza»
  triggerLabel: string          // nombre actual, o «Sin asignar — Voces»
  triggerClassName: string
  triggerStyle?: React.CSSProperties
  ariaLabel: string
  canClear?: boolean            // cupo ya asignado: permite dejarlo vacío
  onPick: (memberId: string) => void   // '' = dejar sin asignar
}

export default function AssignPicker({ options, title, triggerLabel, triggerClassName, triggerStyle, ariaLabel, canClear, onPick }: Props) {
  const [open, setOpen] = useState(false)
  // La fila 0 es «Sin asignar» cuando canClear; el resto, las personas.
  const rows: { id: string; opt?: AssignOption }[] = [
    ...(canClear ? [{ id: '' }] : []),
    ...options.map(o => ({ id: o.id, opt: o })),
  ]
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const uid = useId()

  function openIt() {
    const cur = rows.findIndex(r => r.opt?.isCurrent)
    setActive(cur >= 0 ? cur : 0)
    setOpen(true)
  }
  function close(returnFocus = true) { setOpen(false); if (returnFocus) triggerRef.current?.focus() }
  function pick(id: string) { setOpen(false); triggerRef.current?.focus(); onPick(id) }

  // Al abrir, el foco pasa al panel (así recibe las flechas); un clic afuera cierra.
  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    function onDown(e: MouseEvent) { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    document.getElementById(`${uid}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open, uid])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(rows.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(rows.length - 1) }
    else if (e.key === 'Enter') { e.preventDefault(); const r = rows[active]; if (r) pick(r.id) }
    else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button ref={triggerRef} type="button" className={triggerClassName} style={triggerStyle}
        aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => (open ? close(false) : openIt())}
        onKeyDown={e => { if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); openIt() } }}>
        {triggerLabel}
      </button>
      {open && (
        <div ref={panelRef} className={styles.panel} role="listbox" tabIndex={-1} aria-label={title}
          aria-activedescendant={`${uid}-${active}`} onKeyDown={onKeyDown}>
          <div className={styles.head}>{title}</div>
          {options.length === 0 && !canClear && <div className={styles.none}>Nadie disponible para esta posición</div>}
          {rows.map((r, i) => (
            <div key={r.id || 'clear'}>
              <div id={`${uid}-${i}`} role="option" aria-selected={!!r.opt?.isCurrent} data-active={i === active}
                className={styles.opt} onMouseEnter={() => setActive(i)} onClick={() => pick(r.id)}>
                {r.opt ? (
                  <>
                    <span className={styles.av} aria-hidden="true">{r.opt.initials}</span>
                    <span className={styles.nm}>{r.opt.name}</span>
                    <span className={styles.tags}>
                      {r.opt.tags.map((t, k) => <span key={k} className={`${styles.tag} ${styles['tag--' + t.kind]}`}>{t.text}</span>)}
                    </span>
                  </>
                ) : (
                  <span className={styles.clear}>Dejar sin asignar</span>
                )}
              </div>
              {!r.opt && options.length > 0 && <div className={styles.sep} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
