'use client'
/* Control «Apariencia» del Perfil: Sistema / Claro / Oscuro (punto 53). Misma preferencia que usa la administración
   (useDarkMode + cookie anc-theme); aquí se guarda por /api/portal/preferencias (null = Sistema). Zonas táctiles de 44 px. */
import { Monitor, Sun, Moon } from 'lucide-react'
import type { ThemePref } from '@/lib/useDarkMode'
import ui from './portal.module.css'

const OPCIONES: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'Sistema', Icon: Monitor },
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Oscuro', Icon: Moon },
]

export default function AparienciaControl({ pref, onChange }: { pref: ThemePref; onChange: (p: ThemePref) => void }) {
  return (
    <div className={ui.apar}>
      <span className={ui.aparTitle} id="apariencia-lbl">Apariencia</span>
      <div className={ui.seg} role="radiogroup" aria-labelledby="apariencia-lbl">
        {OPCIONES.map(({ value, label, Icon }) => (
          <button key={value} type="button" role="radio" aria-checked={pref === value} className={ui.segBtn} onClick={() => onChange(value)}>
            <Icon size={14} aria-hidden="true" />{label}
          </button>
        ))}
      </div>
    </div>
  )
}
