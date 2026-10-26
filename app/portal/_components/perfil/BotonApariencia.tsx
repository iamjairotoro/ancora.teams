'use client'
// La apariencia del Perfil en TELÉFONO (mockup Perfil-A): un botón redondo de 44 con el ícono del tema actual (teléfono = Automático, sol = Claro, luna = Oscuro) que abre un menú chico (radio 18, filas de 46; MenuFlotante)
// con Automático, Claro y Oscuro y un check en la actual. Misma preferencia de siempre (useDarkMode + /api/portal/preferencias); el escritorio sigue con el selector segmentado.
import { useState } from 'react'
import { Check, Moon, Smartphone, Sun } from 'lucide-react'
import MenuFlotante from '@/components/MenuFlotante'
import type { ThemePref } from '@/lib/useDarkMode'
import { NOMBRE_TEMA, TEXTOS_APARIENCIA, etiquetaBotonApariencia } from '@/lib/textos/apariencia'
import ui from './perfil.module.css'

const ICONO = { system: Smartphone, light: Sun, dark: Moon } as const
const ORDEN: ThemePref[] = ['system', 'light', 'dark']

export default function BotonApariencia({ pref, onChange }: { pref: ThemePref; onChange: (p: ThemePref) => void }) {
  const [abierto, setAbierto] = useState(false)
  const Icono = ICONO[pref]
  return (
    <div className={ui.aparCaja}>
      <button type="button" className={ui.aparBtn} aria-label={etiquetaBotonApariencia(pref)} aria-haspopup="menu" aria-expanded={abierto} onClick={() => setAbierto(v => !v)}><Icono size={20} aria-hidden="true" /></button>
      {abierto && (
        <MenuFlotante titulo={TEXTOS_APARIENCIA.menu} role="menu" claseCaja="" onCerrar={() => setAbierto(false)} margenDerecho={0} separacion={8}>
          {ORDEN.map(p => {
            const I = ICONO[p]
            return (
              <button key={p} type="button" role="menuitemradio" aria-checked={pref === p} onClick={() => { if (p !== pref) onChange(p) }}>
                <I size={18} aria-hidden="true" /><span style={{ flex: 1 }}>{NOMBRE_TEMA[p]}</span>{pref === p && <Check size={18} aria-hidden="true" />}
              </button>
            )
          })}
        </MenuFlotante>
      )}
    </div>
  )
}
