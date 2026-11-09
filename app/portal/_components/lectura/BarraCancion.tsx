'use client'
// La barra superior de la lectura (etapa C3a): volver, saltar a sección, la píldora del tono, adjuntos y ajustes. «Editar» (solo administradoras) llega en un paso aparte (C3e).
// Por ahora la píldora del tono lleva al selector que ya hay en la hoja y «Ajustes» abre la ventana de tipografía de siempre; las hojas nuevas de tonalidad y preferencias vienen después (C3b y C3d).
import { useState } from 'react'
import { ChevronLeft, ChevronsUpDown, Paperclip, SlidersHorizontal } from 'lucide-react'
import MenuFlotante from '@/components/MenuFlotante'
import type { ParteTira } from '@/components/canciones/lectura/TiraPartes'
import { TEXTOS_ACORDES as T } from '@/lib/textos/acordesLectura'
import VentanaTipografia from '../tipografia/VentanaTipografia'
import type { LyricPrefs } from '@/lib/lyricPrefs'
import partes from '@/components/canciones/lectura/partes.module.css'
import ui from './barra-cancion.module.css'

// Al elegir una parte del menú se espera un instante antes de saltar: el menú devuelve el foco al botón al cerrarse y eso desplazaría la pantalla hacia arriba.
export default function BarraCancion({ etiquetaVolver, onVolver, partes: lista, activa, onIr, tono, onTono, hayAdjuntos, onAdjuntos, tipografia }: {
  etiquetaVolver: string; onVolver: () => void
  partes: ParteTira[]; activa: number; onIr: (i: number) => void
  tono: string; onTono: () => void
  hayAdjuntos: boolean; onAdjuntos: () => void
  tipografia: { prefs: LyricPrefs; elegir: (p: Partial<Pick<LyricPrefs, 'fontFamily' | 'textScale'>>) => void; errPrefs: boolean }
}) {
  const [saltoAbierto, setSaltoAbierto] = useState(false), [ajustes, setAjustes] = useState(false)
  return (
    <div className={`${partes.colores} ${ui.barra}`}>
      <div className={ui.izq}>
        <button type="button" className={ui.circulo} aria-label={etiquetaVolver} onClick={onVolver}><ChevronLeft size={22} aria-hidden="true" /></button>
        <div className={ui.ancla}>
          <button type="button" className={ui.circulo} aria-label={T.saltarASeccion} aria-haspopup="dialog" aria-expanded={saltoAbierto} onClick={() => setSaltoAbierto(v => !v)}><ChevronsUpDown size={20} aria-hidden="true" /></button>
          {saltoAbierto && (
            <MenuFlotante dialogo titulo={T.saltarASeccion} onCerrar={() => setSaltoAbierto(false)} margenDerecho={0} separacion={8} capa={29}>
              <ul className={`${partes.colores} ${ui.salto}`}>
                {lista.map((p, i) => (
                  <li key={i}>
                    <button type="button" data-parte={p.clave} aria-current={i === activa ? 'true' : undefined} onClick={() => { setSaltoAbierto(false); setTimeout(() => onIr(i), 80) }}>
                      <span className={ui.saltoCod} aria-hidden="true">{p.abrev}</span>{p.nombre}{p.repeat > 1 && <span className={ui.saltoRep}>×{p.repeat}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </MenuFlotante>
          )}
        </div>
      </div>
      <div className={ui.der}>
        <button type="button" className={ui.tono} aria-label={T.tonoPildora(tono)} onClick={onTono}>{tono}</button>
        {hayAdjuntos && <button type="button" className={ui.icono} aria-label={T.adjuntos} onClick={onAdjuntos}><Paperclip size={20} aria-hidden="true" /></button>}
        <div className={ui.ancla}>
          <button type="button" className={ui.icono} aria-label={T.ajustes} aria-haspopup="dialog" aria-expanded={ajustes} onClick={() => setAjustes(v => !v)}><SlidersHorizontal size={20} aria-hidden="true" /></button>
          {ajustes && <VentanaTipografia prefs={tipografia.prefs} elegir={tipografia.elegir} errPrefs={tipografia.errPrefs} onCerrar={() => setAjustes(false)} />}
        </div>
      </div>
    </div>
  )
}
