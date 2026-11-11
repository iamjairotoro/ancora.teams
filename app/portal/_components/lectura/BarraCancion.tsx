'use client'
// La barra superior de la lectura (etapa C3a): volver, saltar a sección, la píldora del tono, adjuntos (siempre, abre su pantalla) y ajustes. «Editar» (solo administradoras) llega en un paso aparte (C3e).
// «Ajustes» abre la hoja de Preferencias (C3b). La píldora del tono abre «Previsualizar tonalidad» (C3d).
import { useState } from 'react'
import { ChevronLeft, ChevronsUpDown, Paperclip, SlidersHorizontal } from 'lucide-react'
import MenuFlotante from '@/components/MenuFlotante'
import type { ParteTira } from '@/components/canciones/lectura/TiraPartes'
import { TEXTOS_ACORDES as T } from '@/lib/textos/acordesLectura'
import partes from '@/components/canciones/lectura/partes.module.css'
import ui from './barra-cancion.module.css'

// Al elegir una parte del menú se espera un instante antes de saltar: el menú devuelve el foco al botón al cerrarse y eso desplazaría la pantalla hacia arriba.
export default function BarraCancion({ etiquetaVolver, onVolver, partes: lista, activa, onIr, tono, onTono, onAdjuntos, onAjustes, ajustesAbiertos }: {
  etiquetaVolver: string; onVolver: () => void
  partes: ParteTira[]; activa: number; onIr: (i: number) => void
  tono: string; onTono: () => void       // la píldora abre la hoja de tonalidad
  onAdjuntos: () => void      // el clip siempre está: abre la pantalla «Adjuntos» (con o sin archivos)
  onAjustes: () => void; ajustesAbiertos: boolean
}) {
  const [saltoAbierto, setSaltoAbierto] = useState(false)
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
        <button type="button" className={ui.tono} aria-label={T.tonoPildora(tono)} aria-haspopup="dialog" onClick={onTono}>{tono}</button>
        <button type="button" className={ui.icono} aria-label={T.adjuntos} aria-haspopup="dialog" onClick={onAdjuntos}><Paperclip size={20} aria-hidden="true" /></button>
        <button type="button" className={ui.icono} aria-label={T.ajustes} aria-haspopup="dialog" aria-expanded={ajustesAbiertos} onClick={onAjustes}><SlidersHorizontal size={20} aria-hidden="true" /></button>
      </div>
    </div>
  )
}
