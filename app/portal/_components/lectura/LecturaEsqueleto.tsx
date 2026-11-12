'use client'
// El marcador de espera de la lectura del músico en TELÉFONO: la barra superior (con «volver», que ya funciona), el título y el artista (se conocen por la lista) y la hoja en gris. Se dibuja mientras llega la canción, en lugar de la
// pantalla «Letra» de antes, que enseguida se cambiaba por la lectura con acordes. No inventa datos: lo que no se sabe todavía (tono, partes, letra) es gris. En escritorio y tableta no se usa.
import { ChevronLeft } from 'lucide-react'
import CabeceraCancion from '@/components/canciones/lectura/CabeceraCancion'
import { TEXTOS_ACORDES as T } from '@/lib/textos/acordesLectura'
import partes from '@/components/canciones/lectura/partes.module.css'
import barra from './barra-cancion.module.css'
import ui from './lectura-esqueleto.module.css'

export default function LecturaEsqueleto({ nombre, artista, bpm, etiquetaVolver, onVolver }: { nombre: string; artista?: string | null; bpm?: number | null; etiquetaVolver: string; onVolver: () => void }) {
  return (
    <div className={partes.colores} data-esqueleto="lectura" aria-busy="true">
      <div className={`${partes.colores} ${barra.barra}`}>
        <div className={barra.izq}>
          <button type="button" className={barra.circulo} aria-label={etiquetaVolver} onClick={onVolver}><ChevronLeft size={22} aria-hidden="true" /></button>
          <span className={`anc-skel ${ui.circulo}`} aria-hidden="true" />
        </div>
        <div className={ui.der} aria-hidden="true"><span className={`anc-skel ${ui.pastilla}`} /></div>
      </div>
      <CabeceraCancion titulo={nombre} artista={artista} bpm={bpm} />
      <p className="sr-only" role="status">{T.cargandoCancion}</p>
      <div className={ui.tira} aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className={`anc-skel ${ui.parte}`} />)}</div>
      <div className={ui.hoja} aria-hidden="true">
        {[0, 1].map(i => (
          <div key={i} className={ui.bloque}><span className={`anc-skel ${ui.nombre}`} /><span className={`anc-skel ${ui.linea}`} /><span className={`anc-skel ${ui.linea} ${ui.corta}`} /><span className={`anc-skel ${ui.linea}`} /></div>
        ))}
      </div>
    </div>
  )
}
