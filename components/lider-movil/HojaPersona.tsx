'use client'
// La ficha de una persona de SU equipo (hoja desde abajo): teléfono y correo (solo se muestran, no se editan), sus posiciones en el equipo (se activan y desactivan) y «Quitar del equipo». No cambia líderes ni datos de
// la persona (eso es de quien administra). No escribe nada por sí sola: avisa al padre (PersonasEquipoPropio), que escribe por /api/lider/equipo.
import { useId } from 'react'
import HojaBase from '../admin-movil/HojaBase'
import hoja from '@/app/portal/_components/disponibilidad/hoja.module.css'
import pantallas from '../servicio-movil/pantallas.module.css'
import type { EquipoPersonasPropio, PersonaPropiaDeEquipo } from '@/lib/lider/personasLider'
import { TEXTOS_PERSONAS_LIDER as TP } from '@/lib/textos/servicioLider'
import ui from './lider-movil.module.css'

export default function HojaPersona({ equipo, persona, ocupado, onPosiciones, onQuitar, onCerrar }: {
  equipo: EquipoPersonasPropio; persona: PersonaPropiaDeEquipo; ocupado: boolean
  onPosiciones: (posiciones: string[]) => void; onQuitar: () => void; onCerrar: () => void
}) {
  const id = useId()
  const nombre = `${persona.nombre} ${persona.apellido}`.trim()
  const tiene = new Set(persona.posiciones.map(p => p.id))
  const motivoSinQuitar = persona.esLider ? TP.noSeQuitaUnLider : persona.esYo ? TP.noTeQuitasTu : null
  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={<h2 id={id} className={hoja.titulo}>{nombre}</h2>}>
      {cerrar => (
        <>
          <p className={ui.sub}>{equipo.nombre}{persona.esLider ? ` · ${TP.lider}` : ''}{persona.esYo ? ` · ${TP.tu}` : ''}</p>
          <ul className={pantallas.listaHoja}>
            <li className={ui.dato}><span className={ui.datoEtiqueta}>{TP.telefono}</span>{persona.telefono ? <a className={ui.enlace} href={`tel:${persona.telefono.replace(/[^\d+]/g, '')}`}>{persona.telefono}</a> : <span className={ui.sinDato}>{TP.sinTelefono}</span>}</li>
            <li className={ui.dato}><span className={ui.datoEtiqueta}>{TP.correo}</span>{persona.email ? <a className={ui.enlace} href={`mailto:${persona.email}`}>{persona.email}</a> : <span className={ui.sinDato}>{TP.sinCorreo}</span>}</li>
          </ul>
          <p className={ui.seccion}>{TP.posiciones}</p>
          {equipo.catalogo.length === 0 ? <p className={ui.nota}>{TP.sinPosicionesEnElEquipo}</p> : (
            <div className={ui.chips}>
              {equipo.catalogo.map(p => { const on = tiene.has(p.id); return (
                <button key={p.id} type="button" className={`${ui.chip}${on ? ` ${ui.chipOn}` : ''}`} aria-pressed={on} disabled={ocupado}
                  onClick={() => onPosiciones(on ? persona.posiciones.filter(x => x.id !== p.id).map(x => x.id) : [...persona.posiciones.map(x => x.id), p.id])}>{p.nombre}</button>
              ) })}
            </div>
          )}
          {motivoSinQuitar ? <p className={ui.nota}>{motivoSinQuitar}</p> : (
            <ul className={pantallas.listaHoja}><li><button type="button" className={`${pantallas.filaHoja} ${pantallas.peligro}`} disabled={ocupado} onClick={() => cerrar(onQuitar)}>{TP.quitar}</button></li></ul>
          )}
          <button type="button" className={`${pantallas.boton} ${ui.cancelarHoja}`} onClick={() => cerrar()}>{TP.cerrarFicha}</button>
        </>
      )}
    </HojaBase>
  )
}
