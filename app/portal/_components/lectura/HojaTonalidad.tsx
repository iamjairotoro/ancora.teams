'use client'
// La hoja «Previsualizar tonalidad» (etapa C3d), en la hoja desde abajo común (HojaBase): «Original X» y «Tono del servicio X» (tocarlos elige ese tono), las letras C a B, bemol y sostenido, el aviso y «Guardar».
// Es una vista previa solo de esta persona y de esta pantalla: no cambia el servicio ni la canción y no se recuerda. La pantalla de atrás cambia al tocar; «Guardar» deja lo elegido y cualquier otra forma de cerrar (✕, Escape, tocar fuera, atrás)
// vuelve al tono con que se abrió. Solo tonos del mismo modo que la canción. El control de Cejilla no existe todavía.
import { useRef } from 'react'
import HojaBase from '@/components/admin-movil/HojaBase'
import hoja from '@/app/portal/_components/disponibilidad/hoja.module.css'
import { esTonoMenor } from '@/lib/tonos'
import { LETRAS_TONO, alElegirAlteracion, alElegirLetra, partesDeTono, tonoDe } from '@/lib/tonalidad'
import { TEXTOS_ACORDES as T } from '@/lib/textos/acordesLectura'
import ui from './hoja-tonalidad.module.css'

export default function HojaTonalidad({ original, servicio, actual, onElegir, onCerrar }: {
  original: string                       // el tono original de la canción (define el modo)
  servicio: string | null                // el tono del servicio, solo si es del mismo modo y distinto del original
  actual: string                         // el tono en que se está leyendo
  onElegir: (tono: string) => void
  onCerrar: (guardado: boolean) => void  // false = se cerró sin «Guardar»: la pantalla vuelve al tono con que se abrió
}) {
  const guardado = useRef(false)
  const p = partesDeTono(actual), menor = esTonoMenor(original)
  const bemolOk = !!p && !!tonoDe(original, p.letra, p.alt === 'b' ? '' : 'b'), sostenidoOk = !!p && !!tonoDe(original, p.letra, p.alt === '#' ? '' : '#')
  const elegir = (t: string | null) => { if (t && t !== actual) onElegir(t) }
  return (
    <HojaBase idTitulo="tono-titulo" cabeza={<h2 id="tono-titulo" className={hoja.titulo}>{T.tonalidadTitulo}</h2>} onCerrar={() => onCerrar(guardado.current)}>
      {cerrar => (
        <div>
          <div className={ui.origen}>
            <button type="button" className={ui.enlace} aria-pressed={actual === original} onClick={() => elegir(original)}>{T.originalTono(original)}</button>
            {servicio && <button type="button" className={ui.enlace} aria-pressed={actual === servicio} onClick={() => elegir(servicio)}>{T.servicioTono(servicio)}</button>}
          </div>
          <div className={ui.letras} role="radiogroup" aria-label={T.tonosLetras}>
            {LETRAS_TONO.map(l => <button key={l} type="button" role="radio" aria-checked={p?.letra === l} className={ui.letra} onClick={() => elegir(alElegirLetra(original, actual, l))}>{l}{menor ? 'm' : ''}</button>)}
          </div>
          <div className={ui.alts} role="group" aria-label={T.alteracion}>
            <button type="button" className={ui.alt} aria-pressed={p?.alt === 'b'} aria-label={T.bemol} disabled={!bemolOk} onClick={() => elegir(alElegirAlteracion(original, actual, 'b'))}>♭</button>
            <button type="button" className={ui.alt} aria-pressed={p?.alt === '#'} aria-label={T.sostenido} disabled={!sostenidoOk} onClick={() => elegir(alElegirAlteracion(original, actual, '#'))}>♯</button>
          </div>
          <p className={ui.aviso}>{servicio ? T.avisoTonoServicio(servicio) : T.avisoTonoSinServicio}</p>
          <button type="button" className={ui.guardar} onClick={() => { guardado.current = true; cerrar() }}>{T.guardarTono}</button>
        </div>
      )}
    </HojaBase>
  )
}
