'use client'
// La hoja «Preferencias» de la lectura (etapa C3b), en la hoja desde abajo común (HojaBase). Todo se guarda al instante en el perfil de la persona (members.chart_prefs.lectura, por /api/portal/preferencias):
// Vista de canción (Ambos / Acordes / Letras), notación (Americano / Números), «Fuente y tamaño», «Detalles de la canción» (muestra u oculta la cabecera) y «Vista compacta». «Exportar canción» no existe todavía y no se ofrece.
// «Fuente y tamaño» abre la ventana de tipografía de siempre (la pantalla propia llega en C3c).
import { useState } from 'react'
import { ChevronRight, ChevronsUpDown, FileText, List } from 'lucide-react'
import HojaBase from '@/components/admin-movil/HojaBase'
import hoja from '@/app/portal/_components/disponibilidad/hoja.module.css'
import { TEXTOS_ACORDES as T } from '@/lib/textos/acordesLectura'
import { NOTACIONES_LECTURA, VISTAS_LECTURA, type LecturaPrefs, type LyricPrefs } from '@/lib/lyricPrefs'
import VentanaTipografia from '../tipografia/VentanaTipografia'
import ui from './hoja-preferencias.module.css'

const ETIQUETA_VISTA: Record<LecturaPrefs['vista'], string> = { ambos: T.vistaAmbos, acordes: T.vistaAcordes, letras: T.vistaLetras }

/** Una opción con interruptor: TODA la fila es el botón (role=switch), así el área táctil es la fila entera y no solo la pista. */
function FilaInterruptor({ icono, texto, ayuda, marcado, onCambio }: { icono: React.ReactNode; texto: string; ayuda?: { id: string; texto: string }; marcado: boolean; onCambio: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={marcado} aria-describedby={ayuda?.id} className={ui.fila} onClick={() => onCambio(!marcado)}>
      <span className={ui.icono} aria-hidden="true">{icono}</span>
      <span className={ui.texto}>{texto}{ayuda && <span id={ayuda.id} className={ui.ayuda}>{ayuda.texto}</span>}</span>
      <span className={ui.pista} aria-hidden="true" />
    </button>
  )
}

export default function HojaPreferencias({ prefs, onPrefs, errPrefs, tipografia, onCerrar }: {
  prefs: LecturaPrefs; onPrefs: (patch: Partial<LecturaPrefs>) => void; errPrefs: boolean
  tipografia: { prefs: LyricPrefs; elegir: (p: Partial<Pick<LyricPrefs, 'fontFamily' | 'textScale'>>) => void; errPrefs: boolean }
  onCerrar: () => void
}) {
  const [fuente, setFuente] = useState(false)
  return (
    <HojaBase idTitulo="prefs-titulo" cabeza={<h2 id="prefs-titulo" className={hoja.titulo}>{T.prefsTitulo}</h2>} onCerrar={onCerrar}>
      {() => (
        <div>
          <p className={ui.seccion}>{T.vistaDeCancion}</p>
          <div className={ui.seg} role="radiogroup" aria-label={T.vistaDeCancion}>
            {VISTAS_LECTURA.map(v => <button key={v} type="button" role="radio" aria-checked={prefs.vista === v} onClick={() => onPrefs({ vista: v })}>{ETIQUETA_VISTA[v]}</button>)}
          </div>

          <ul className={ui.grupo} style={{ marginTop: '0.75rem' }}>
            <li>
              <label className={ui.selector}>
                <span className={ui.icono} aria-hidden="true">C#</span>
                <span className={ui.valor}>{prefs.notation === 'numeros' ? T.numerosFila : T.americanoFila}</span>
                <span className={ui.fin} aria-hidden="true"><ChevronsUpDown size={16} /></span>
                <select aria-label={T.notacionEtiqueta} value={prefs.notation} onChange={e => onPrefs({ notation: e.target.value as LecturaPrefs['notation'] })}>
                  {NOTACIONES_LECTURA.map(n => <option key={n} value={n}>{n === 'numeros' ? T.numerosFila : T.americanoFila}</option>)}
                </select>
              </label>
            </li>
            <li style={{ position: 'relative' }}>
              <button type="button" className={ui.fila} aria-haspopup="dialog" aria-expanded={fuente} onClick={() => setFuente(v => !v)}>
                <span className={ui.icono} aria-hidden="true">T</span><span className={ui.texto}>{T.fuenteYTamano}</span><span className={ui.fin} aria-hidden="true"><ChevronRight size={16} /></span>
              </button>
              {fuente && <VentanaTipografia prefs={tipografia.prefs} elegir={tipografia.elegir} errPrefs={tipografia.errPrefs} onCerrar={() => setFuente(false)} />}
            </li>
          </ul>

          <p className={ui.seccion}>{T.opcionesVisualizacion}</p>
          <ul className={ui.grupo}>
            <li><FilaInterruptor icono={<List size={18} />} texto={T.detallesCancion} marcado={prefs.detalles} onCambio={v => onPrefs({ detalles: v })} /></li>
            <li><FilaInterruptor icono={<FileText size={18} />} texto={T.vistaCompacta} ayuda={{ id: 'prefs-compacta-d', texto: T.vistaCompactaAyuda }} marcado={prefs.compacta} onCambio={v => onPrefs({ compacta: v })} /></li>
          </ul>
          {errPrefs && <p className={ui.error} role="status">{T.errorPrefsHoja}</p>}
          <p className={ui.pie}>{T.prefsPie}</p>
        </div>
      )}
    </HojaBase>
  )
}
