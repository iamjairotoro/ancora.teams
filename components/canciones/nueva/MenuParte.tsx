'use client'
// El menú del círculo («Parte»), de los tableros «Nueva canción · 5» y «5b»: una hoja inferior con la parte (círculo, nombre y «Parte 3 de 4») y sus acciones.
// Paso D: solo «Repetir ×N» (1 a 9) está activo. «Renombrar» y «Eliminar parte» aparecen pero siguen apagados hasta el paso E; «Mover» aparece apagado con «más adelante».
// Con `bloqueado` (la canción ya tiene un arreglo propio guardado) «Repetir» sale apagado, en ×1, con el aviso del tablero 5b: el servidor no pisa un arreglo existente.
// Solo presentación: no sabe de datos; quien lo usa guarda la repetición.
import { ArrowUpDown, Pencil, Repeat, Trash2, X } from 'lucide-react'
import { REPETICION_MAX, REPETICION_MIN } from '@/lib/arregloCancion'
import { TEXTOS_NUEVA as T } from '@/lib/nuevaCancion'
import type { ParteTira } from '../lectura/TiraPartes'
import coloresUi from '../lectura/partes.module.css'
import ui from './menu-parte.module.css'

export default function MenuParte({ parte, posicion, total, repeat, bloqueado, onRepeat, onCerrar }: {
  parte: ParteTira; posicion: number; total: number; repeat: number; bloqueado: boolean; onRepeat: (n: number) => void; onCerrar: () => void
}) {
  const n = bloqueado ? REPETICION_MIN : repeat
  return (
    <div className={ui.velo} onClick={onCerrar}>
      <div className={`${coloresUi.colores} ${ui.hoja}`} role="dialog" aria-modal="true" aria-label={T.menuTitulo} onClick={e => e.stopPropagation()}>
        <div className={ui.cab}>
          <span className={ui.circ} data-parte={parte.clave} aria-hidden="true">{parte.abrev}</span>
          <div className={ui.quien}><span className={ui.nombre}>{parte.nombre}</span><span className={ui.pos}>{T.parteNumero(posicion, total)}</span></div>
          <button type="button" className={ui.cerrar} onClick={onCerrar} aria-label={T.cerrar}><X size={18} aria-hidden="true" /></button>
        </div>
        <div className={`${ui.fila} ${ui.repetir} ${bloqueado ? ui.apagada : ''}`} role="group" aria-label={T.repetir} aria-disabled={bloqueado || undefined}>
          <span className={ui.icono} aria-hidden="true"><Repeat size={20} /></span>
          <div className={ui.texto}><span className={ui.titulo}>{T.repetir}</span><span className={ui.ayuda}>{T.repetirAyuda}</span></div>
          <button type="button" className={ui.paso} onClick={() => onRepeat(n - 1)} disabled={bloqueado || n <= REPETICION_MIN} aria-label={T.repeticionMenos}>−</button>
          <span className={ui.valor} role="status" aria-label={T.repeticionActual(n)}>×{n}</span>
          <button type="button" className={`${ui.paso} ${ui.mas}`} onClick={() => onRepeat(n + 1)} disabled={bloqueado || n >= REPETICION_MAX} aria-label={T.repeticionMas}>+</button>
        </div>
        {bloqueado && (
          <p className={ui.aviso} role="note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>
            <span>{T.arregloPropio}</span>
          </p>
        )}
        <button type="button" className={ui.accion} disabled><span className={ui.icono} aria-hidden="true"><Pencil size={20} /></span>{T.renombrar}</button>
        <button type="button" className={ui.accion} disabled><span className={ui.icono} aria-hidden="true"><ArrowUpDown size={20} /></span>{T.moverPronto}</button>
        <button type="button" className={`${ui.accion} ${ui.peligro}`} disabled><span className={ui.icono} aria-hidden="true"><Trash2 size={20} /></span>{T.eliminarParte}</button>
      </div>
    </div>
  )
}
