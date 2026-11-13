'use client'
// El menú del círculo de la estructura, tablero «Nueva canción · 7»: una hoja inferior con el LUGAR que se tocó (círculo, nombre y «Lugar 6 de 9 · aparece 3 veces») y sus acciones sobre la estructura:
// «Repetir aquí», «Mover en la estructura» (‹ ›), «Quitar de la estructura» (apagado en la última aparición de la parte: para eso está «Eliminar sección»), «Renombrar» y «Eliminar sección» (visibles pero apagados hasta S6).
// Con `bloqueado` (la canción ya tiene un orden propio guardado) todo sale apagado y con el aviso: el servidor no pisa un arreglo existente.
// Solo presentación: no sabe de datos; quien lo usa cambia la estructura.
import { ArrowLeftRight, ChevronLeft, ChevronRight, CircleMinus, Pencil, Repeat, Trash2, X } from 'lucide-react'
import { contar } from '@/lib/textos/plural'
import { TEXTOS_NUEVA as T } from '@/lib/nuevaCancion'
import type { ParteTira } from '../lectura/TiraPartes'
import coloresUi from '../lectura/partes.module.css'
import ui from './menu-parte.module.css'

type Props = {
  parte: ParteTira; lugar: number; total: number; apariciones: number
  puedeRepetir: boolean; puedeQuitar: boolean; puedeIzquierda: boolean; puedeDerecha: boolean; bloqueado: boolean
  onRepetirAqui: () => void; onMover: (delta: -1 | 1) => void; onQuitar: () => void; onCerrar: () => void
}

export default function MenuParte({ parte, lugar, total, apariciones, puedeRepetir, puedeQuitar, puedeIzquierda, puedeDerecha, bloqueado, onRepetirAqui, onMover, onQuitar, onCerrar }: Props) {
  return (
    <div className={ui.velo} onClick={onCerrar}>
      <div className={`${coloresUi.colores} ${ui.hoja}`} role="dialog" aria-modal="true" aria-label={T.menuTitulo} onClick={e => e.stopPropagation()}>
        <div className={ui.cab}>
          <span className={ui.circ} data-parte={parte.clave} aria-hidden="true">{parte.abrev}</span>
          <div className={ui.quien}><span className={ui.nombre}>{parte.nombre}</span><span className={ui.pos}>{T.lugarYApariciones(lugar, total, apariciones)}</span></div>
          <button type="button" className={ui.cerrar} onClick={onCerrar} aria-label={T.cerrar}><X size={18} aria-hidden="true" /></button>
        </div>
        {bloqueado && (
          <p className={ui.aviso} role="note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>
            <span>{T.estructuraSoloLectura}</span>
          </p>
        )}
        <button type="button" className={ui.fila} onClick={onRepetirAqui} disabled={bloqueado || !puedeRepetir}>
          <span className={ui.icono} aria-hidden="true"><Repeat size={20} /></span>
          <span className={ui.texto}><span className={ui.titulo}>{T.repetirAqui}</span><span className={ui.ayuda}>{puedeRepetir ? T.repetirAquiAyuda : T.limiteEstructura}</span></span>
        </button>
        <div className={`${ui.fila} ${bloqueado ? ui.apagada : ''}`} role="group" aria-label={T.moverTitulo}>
          <span className={ui.icono} aria-hidden="true"><ArrowLeftRight size={20} /></span>
          <span className={ui.texto}><span className={ui.titulo}>{T.moverTitulo}</span></span>
          <button type="button" className={ui.paso} onClick={() => onMover(-1)} disabled={bloqueado || !puedeIzquierda} aria-label={T.moverIzquierda}><ChevronLeft size={22} aria-hidden="true" /></button>
          <button type="button" className={ui.paso} onClick={() => onMover(1)} disabled={bloqueado || !puedeDerecha} aria-label={T.moverDerecha}><ChevronRight size={22} aria-hidden="true" /></button>
        </div>
        <button type="button" className={ui.fila} onClick={onQuitar} disabled={bloqueado || !puedeQuitar}>
          <span className={ui.icono} aria-hidden="true"><CircleMinus size={20} /></span>
          <span className={ui.texto}><span className={ui.titulo}>{T.quitarDeEstructura}</span><span className={ui.ayuda}>{puedeQuitar ? T.quitarAyuda : T.quitarUltimaAyuda}</span></span>
        </button>
        <button type="button" className={ui.fila} disabled>
          <span className={ui.icono} aria-hidden="true"><Pencil size={20} /></span>
          <span className={ui.texto}><span className={ui.titulo}>{T.renombrar}</span></span>
        </button>
        <button type="button" className={`${ui.fila} ${ui.peligro}`} disabled>
          <span className={ui.icono} aria-hidden="true"><Trash2 size={20} /></span>
          <span className={ui.texto}><span className={ui.titulo}>{T.eliminarSeccion}</span><span className={ui.ayuda}>{T.eliminarAyuda(apariciones)}</span></span>
        </button>
      </div>
    </div>
  )
}
