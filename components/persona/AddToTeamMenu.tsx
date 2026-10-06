'use client'
/* «Agregar a un equipo» de la ficha: un botón que abre un menú con los equipos
   a los que la persona AÚN NO pertenece. Elegir uno lo agrega (sin posiciones;
   la escritura la hace el padre con lib/addToTeam.ts). El botón se deshabilita
   mientras guarda y un error queda visible hasta cerrarlo o hasta el próximo
   intento. */
import { useEffect, useRef, useState } from 'react'
import { TeamMono } from '../TeamColor'
import styles from './add-to-team-menu.module.css'

export type AddableTeam = { id: string; name: string; color?: string | null }
export type AddToTeamControl = {
  teams: AddableTeam[]
  busy: boolean
  error: string | null
  onPick: (teamId: string) => void
  onClearError: () => void
}

export default function AddToTeamMenu({ control, quiet }: { control: AddToTeamControl; quiet?: boolean }) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    wrapRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btnRef.current?.focus() } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true) }
  }, [open])

  const { teams, busy, error } = control

  // Se abre hacia arriba si abajo no cabe dentro del área con scroll de la ficha.
  function toggle() {
    if (!open) {
      const btn = btnRef.current
      const area = btn?.closest('.anc-dBody')
      if (btn && area) {
        const need = Math.min(240, teams.length * 36 + 14) + 8
        setDropUp(btn.getBoundingClientRect().bottom + need > area.getBoundingClientRect().bottom)
      } else setDropUp(false)
    }
    setOpen(o => !o)
  }
  const empty = teams.length === 0

  return (
    <div>
      <div className={styles.wrap} ref={wrapRef}>
        {empty && !error ? (
          quiet ? null : <p className={styles.none}>Ya está en todos los equipos</p>
        ) : empty ? null : (
          <>
            <button ref={btnRef} type="button" className="anc-btn anc-btn--quiet" disabled={busy}
              aria-haspopup="menu" aria-expanded={open} onClick={() => { control.onClearError(); toggle() }}>
              {busy ? 'Agregando…' : 'Agregar a un equipo'}
            </button>
            {open && (
              <div className={`${styles.menu} ${dropUp ? styles.up : ''}`} role="menu" aria-label="Equipos a los que se puede agregar">
                {teams.map(t => (
                  <button key={t.id} type="button" role="menuitem" className={styles.item}
                    onClick={() => { setOpen(false); control.onPick(t.id) }}>
                    <TeamMono name={t.name} color={t.color} />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {error && (
        <p className={styles.err} role="alert">
          <span>{error}</span>
          <button type="button" onClick={control.onClearError}>Cerrar</button>
        </p>
      )}
    </div>
  )
}
