'use client'
/* Selector «Apariencia» del Perfil: Sistema / Claro / Oscuro (punto 53; rediseñado en el 54, commit 1, como en la maqueta). Título de sección encima y el selector segmentado compartido
   (segmentado/: tres columnas iguales, pieza activa que se desliza, radiogroup con flechas de teclado). Misma preferencia que usa la administración (useDarkMode + cookie anc-theme); aquí se guarda
   por /api/portal/preferencias (null = Sistema). */
import type { ThemePref } from '@/lib/useDarkMode'
import Segmentado from './segmentado/Segmentado'
import ui from './apariencia.module.css'

const OPCIONES: { valor: ThemePref; texto: string }[] = [
  { valor: 'system', texto: 'Sistema' },
  { valor: 'light', texto: 'Claro' },
  { valor: 'dark', texto: 'Oscuro' },
]

export default function AparienciaControl({ pref, onChange }: { pref: ThemePref; onChange: (p: ThemePref) => void }) {
  return (
    <section className={ui.apar}>
      <h2 className={ui.titulo} id="apariencia-lbl">Apariencia</h2>
      <Segmentado opciones={OPCIONES} valor={pref} onCambio={onChange} idEtiqueta="apariencia-lbl" />
    </section>
  )
}
