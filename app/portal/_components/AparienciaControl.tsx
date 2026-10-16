'use client'
/* Selector «Apariencia» del Perfil: Sistema / Claro / Oscuro (punto 53; rediseñado en el 54, commit 1, como en la maqueta). Título de sección encima y un contenedor de tres columnas iguales
   con una pieza activa que se desliza (200 ms; sin animar con prefers-reduced-motion). Medidas y colores en apariencia.module.css. Misma preferencia que usa la administración (useDarkMode +
   cookie anc-theme); aquí se guarda por /api/portal/preferencias (null = Sistema).
   Accesibilidad: radiogroup con nombre «Apariencia» (el título), cada opción es un radio con aria-checked; teclado de radiogroup (solo la elegida entra con Tab; las flechas cambian de opción);
   foco visible. */
import { useRef } from 'react'
import type { ThemePref } from '@/lib/useDarkMode'
import ui from './apariencia.module.css'

const OPCIONES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

export default function AparienciaControl({ pref, onChange }: { pref: ThemePref; onChange: (p: ThemePref) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const indice = Math.max(0, OPCIONES.findIndex(o => o.value === pref))

  function alTeclear(e: React.KeyboardEvent) {
    const paso = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!paso) return
    e.preventDefault()
    const i = (indice + paso + OPCIONES.length) % OPCIONES.length
    onChange(OPCIONES[i].value); refs.current[i]?.focus()
  }

  return (
    <section className={ui.apar}>
      <h2 className={ui.titulo} id="apariencia-lbl">Apariencia</h2>
      <div className={ui.seg} role="radiogroup" aria-labelledby="apariencia-lbl" onKeyDown={alTeclear} style={{ ['--i' as string]: indice }}>
        <span className={ui.pieza} aria-hidden="true" />
        {OPCIONES.map((o, i) => (
          <button key={o.value} type="button" role="radio" aria-checked={pref === o.value} tabIndex={i === indice ? 0 : -1} className={ui.opcion}
            ref={el => { refs.current[i] = el }} onClick={() => onChange(o.value)}>{o.label}</button>
        ))}
      </div>
    </section>
  )
}
