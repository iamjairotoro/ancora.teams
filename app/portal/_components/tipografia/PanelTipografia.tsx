'use client'
// El panel de fuente y tamaño de la letra (punto 54, commit 1: extraído de CancionPortal). `conMuestra` agrega una línea de ejemplo (en el Perfil no hay una canción donde verlo).
import { FONT_OPTIONS, SIZE_STEPS, type LyricPrefs } from '@/lib/lyricPrefs'
import ui from './tipografia.module.css'

const NOMBRES_TAMANO = ['Pequeño', 'Normal', 'Grande', 'Muy grande']

export default function PanelTipografia({ id, prefs, elegir, errPrefs, conMuestra = false }: {
  id?: string
  prefs: LyricPrefs
  elegir: (patch: Partial<Pick<LyricPrefs, 'fontFamily' | 'textScale'>>) => void
  errPrefs: boolean
  conMuestra?: boolean
}) {
  return (
    <div className={ui.aa} id={id}>
      <p className={ui.aaLabel}>FUENTE</p>
      <div className={ui.fonts} role="group" aria-label="Fuente">
        {FONT_OPTIONS.map(o => (
          <button key={o.f} type="button" className={ui.opt} aria-pressed={prefs.fontFamily === o.f} onClick={() => elegir({ fontFamily: o.f })}>
            <b style={{ fontFamily: o.f }}>{o.label}</b><span>{o.sub}</span>
          </button>
        ))}
      </div>
      <p className={ui.aaLabel}>TAMAÑO</p>
      <div className={ui.sizes} role="group" aria-label="Tamaño">
        {SIZE_STEPS.map((z, i) => (
          <button key={z} type="button" className={ui.size} aria-pressed={prefs.textScale === z} aria-label={NOMBRES_TAMANO[i] ?? `Tamaño ${i + 1}`}
            style={{ fontSize: `${0.6875 + i * 0.1}rem` }} onClick={() => elegir({ textScale: z })}>A</button>
        ))}
      </div>
      {conMuestra && (
        <p className={ui.muestra} style={{ fontFamily: prefs.fontFamily, fontSize: `${prefs.textScale}rem`, lineHeight: prefs.lineHeightWide ? 1.9 : 1.55 }}>Sublime gracia del Señor</p>
      )}
      <p className={ui.aaNote}>Tú eliges fuente y tamaño; se guarda en tu perfil y vale para todas las canciones.</p>
      {errPrefs && <p className={ui.aaErr} role="alert">No se pudo guardar tu elección; vale solo mientras tengas esta pantalla abierta.</p>}
    </div>
  )
}
