'use client'
// La pantalla «Ajustes de fuente» (etapa C3c), dentro de la hoja Preferencias: una vista previa con la fuente y el tamaño elegidos, el tamaño (cuatro pasos, en px) y la fuente (La app, Arial, Georgia, Mono).
// Usa las mismas preferencias de siempre (members.chart_prefs: fontFamily y textScale, por /api/portal/preferencias) y cada cambio se aplica y guarda al instante. Pesos y colores de la letra no se ofrecen todavía.
import { Minus, Plus, ChevronsUpDown } from 'lucide-react'
import LineaConAcordes from '@/components/canciones/LineaConAcordes'
import { FONT_OPTIONS_TELEFONO, SIZE_STEPS, fuenteMarcada, type LyricPrefs } from '@/lib/lyricPrefs'
import { TEXTOS_ACORDES as T } from '@/lib/textos/acordesLectura'
import ui from './pantalla-fuente.module.css'
import linea from '@/components/canciones/hoja-acordes.module.css'

/** El tamaño de un paso, en px (el paso «Normal» es 16). */
export const pxDelPaso = (escala: number): number => Math.round(escala * 16)
// Una línea inventada de muestra, con acordes en tres sitios (no es de ninguna canción).
const MUESTRA = [{ texto: 'Aquí ', acorde: 'A' }, { texto: 'va la ', acorde: 'E' }, { texto: 'primera línea de la letra', acorde: 'F#m' }]

export default function PantallaFuente({ tipografia }: { tipografia: { prefs: LyricPrefs; elegir: (p: Partial<Pick<LyricPrefs, 'fontFamily' | 'textScale'>>) => void; errPrefs: boolean } }) {
  const { prefs, elegir, errPrefs } = tipografia
  const paso = Math.max(0, SIZE_STEPS.indexOf(prefs.textScale)), marcada = fuenteMarcada(prefs.fontFamily)
  const nombre = FONT_OPTIONS_TELEFONO.find(o => o.f === marcada)?.label ?? FONT_OPTIONS_TELEFONO[0].label
  const vars = { '--anc-letra-font': prefs.fontFamily, '--anc-letra-size': `calc(${prefs.textScale}rem / var(--esc, 1))`, '--anc-letra-lh': prefs.lineHeightWide ? 1.9 : 1.55 } as React.CSSProperties
  return (
    <div>
      <p className={ui.seccion}>{T.vistaPrevia}</p>
      <div className={ui.previa} style={vars} aria-hidden="true">
        <LineaConAcordes como="p" className={linea.linea} trozos={MUESTRA} acorde={p => p.acorde} />
      </div>
      <ul className={ui.grupo}>
        <li className={ui.fila}>
          <span className={ui.icono} aria-hidden="true">Aa</span><span className={ui.texto}>{T.tamanoFuente}</span>
          <span className={ui.valor} role="status" aria-live="polite">{pxDelPaso(SIZE_STEPS[paso])} px</span>
          <button type="button" className={ui.paso} aria-label={T.reducirTamano} disabled={paso <= 0} onClick={() => elegir({ textScale: SIZE_STEPS[paso - 1] })}><Minus size={18} aria-hidden="true" /></button>
          <button type="button" className={ui.paso} aria-label={T.aumentarTamano} disabled={paso >= SIZE_STEPS.length - 1} onClick={() => elegir({ textScale: SIZE_STEPS[paso + 1] })}><Plus size={18} aria-hidden="true" /></button>
        </li>
        <li>
          <label className={`${ui.fila} ${ui.selector}`}>
            <span className={ui.icono} aria-hidden="true">Aa</span><span className={ui.texto}>{T.fuenteFila}</span>
            <span className={ui.valor}>{nombre}</span><span className={ui.fin} aria-hidden="true"><ChevronsUpDown size={16} /></span>
            <select aria-label={T.fuenteFila} value={marcada} onChange={e => elegir({ fontFamily: e.target.value })}>
              {FONT_OPTIONS_TELEFONO.map(o => <option key={o.f} value={o.f}>{o.label}</option>)}
            </select>
          </label>
        </li>
      </ul>
      {errPrefs && <p className={ui.error} role="status">{T.errorPrefsHoja}</p>}
      <p className={ui.pie}>{T.fuentePie}</p>
    </div>
  )
}
