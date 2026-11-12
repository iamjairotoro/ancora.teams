'use client'
// El selector de partes del editor de una canción nueva (paso B): los ocho tipos con el círculo de su color y el nombre que recibirían («Verso 3», «Coro 2»). Lo usan la tarjeta «Empieza por una parte» (documento vacío) y la hoja «Agregar parte».
// Solo presentación: quien lo usa decide qué hace al elegir. Los colores y las abreviaturas son los de la tira de la lectura (lib/partesCancion.ts + partes.module.css).
import { X } from 'lucide-react'
import { TIPOS_SECCION, nombreSiguiente, type Documento, type TipoSeccion } from '@/lib/editorAcordes'
import { parteDe } from '@/lib/partesCancion'
import { TEXTOS_NUEVA as T } from '@/lib/nuevaCancion'
import coloresUi from '@/components/canciones/lectura/partes.module.css'
import ui from './selector-parte.module.css'

/** «PRE CORO 2» → «Pre-coro 2»: como se ve en los mockups (el nombre del documento va en mayúsculas). */
export const etiquetaDeParte = (nombre: string): string => { const t = nombre.charAt(0) + nombre.slice(1).toLowerCase(); return t.replace(/^Pre coro/, 'Pre-coro') }

export default function SelectorParte({ doc, onElegir }: { doc: Documento; onElegir: (tipo: TipoSeccion) => void }) {
  return (
    <div className={`${coloresUi.colores} ${ui.rejilla}`} role="group" aria-label={T.agregarParteTitulo}>
      {TIPOS_SECCION.map(tipo => {
        const nombre = nombreSiguiente(doc, tipo), p = parteDe('', nombre)
        return (
          <button key={tipo} type="button" className={ui.tipo} onMouseDown={e => e.preventDefault()} onClick={() => onElegir(tipo)}>
            <span className={ui.circ} data-parte={p.clave} aria-hidden="true">{p.abrev}</span>
            <span className={ui.nombre}>{etiquetaDeParte(nombre)}</span>
          </button>
        )
      })}
    </div>
  )
}

/** La hoja inferior «Agregar parte»: dice qué partes ya hay y ofrece los ocho tipos. Elegir uno la cierra (quien la usa agrega la parte). */
export function HojaAgregarParte({ doc, existentes, onElegir, onCerrar }: { doc: Documento; existentes: string[]; onElegir: (tipo: TipoSeccion) => void; onCerrar: () => void }) {
  return (
    <div className={ui.velo} onClick={onCerrar}>
      <div className={ui.hoja} role="dialog" aria-modal="true" aria-label={T.agregarParteTitulo} onClick={e => e.stopPropagation()}>
        <div className={ui.cab}>
          <button type="button" className={ui.icono} onClick={onCerrar} aria-label={T.cerrar}><X size={20} aria-hidden="true" /></button>
          <h2>{T.agregarParteTitulo}</h2><span className={ui.icono} aria-hidden="true" />
        </div>
        <p className={ui.ayuda}>{T.agregarParteAyuda(existentes)}</p>
        <SelectorParte doc={doc} onElegir={onElegir} />
        <p className={ui.consejo} role="note">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>
          <span>{T.consejoRepetir}</span>
        </p>
      </div>
    </div>
  )
}
/** La tarjeta del documento vacío. */
export function TarjetaEmpieza({ doc, onElegir }: { doc: Documento; onElegir: (tipo: TipoSeccion) => void }) {
  return (
    <section className={ui.tarjeta} aria-label={T.vacioTitulo}>
      <h3>{T.vacioTitulo}</h3><p>{T.vacioAyuda}</p>
      <SelectorParte doc={doc} onElegir={onElegir} />
    </section>
  )
}
