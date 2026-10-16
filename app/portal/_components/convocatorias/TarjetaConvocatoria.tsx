'use client'
// Una convocatoria como TARJETA (punto 52): franja y monograma del color del equipo (identidad: el color nunca lleva texto), círculo de estado por forma,
// el estado en palabras, sus posiciones y las acciones que corresponden. Referencia: docs/mockup-musico-v2.html (Servicios) y
// docs/mockup-disponibilidad-equipos.html (sección 3). Reutilizable: el punto 54 puede colocarla en otras pantallas.
import { TeamMono, TeamStripe, teamColorProps } from '@/components/TeamColor'
import AccionesConvocatoria from './AccionesConvocatoria'
import { IndicadorEstado, textoEstado, vistaDeEntrada } from './estado'
import type { EntradaConvocatoria } from './tipos'
import type { ControladorConvocatorias } from './useConvocatorias'
import ui from './convocatorias.module.css'

function fechaLarga(fecha: string, horaInicio?: string): string {
  const s = new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  const dia = s.charAt(0).toUpperCase() + s.slice(1)
  return horaInicio ? `${dia} · ${horaInicio.slice(0, 5)}` : dia
}

export default function TarjetaConvocatoria({ entrada, c, onAbrir, cabecera }: {
  entrada: EntradaConvocatoria; c: ControladorConvocatorias; onAbrir?: () => void
  /** La primera línea de la tarjeta. Sin ella: «Domingo, 4 de octubre · 10:00». Con `null` no hay línea (la pantalla ya agrupa por día y lo dice en su encabezado). */
  cabecera?: string | null
}) {
  const vista = vistaDeEntrada(entrada)
  if (!vista || !entrada.team) return null
  const posiciones = entrada.posiciones
  return (
    <article className={ui.tarjeta} {...teamColorProps(entrada.team.color)} aria-label={`${entrada.team.name}: ${textoEstado(entrada)}`}>
      <TeamStripe color={entrada.team.color} />
      <div className={ui.cuerpo}>
        {cabecera !== null && <p className={ui.fecha}>{cabecera ?? fechaLarga(entrada.service.fecha, entrada.service.hora_inicio)}</p>}
        <div className={ui.cabeza}>
          <IndicadorEstado vista={vista} />
          <div className={ui.nombre}>
            <b>{entrada.team.name}</b>
            {posiciones.length > 0 && <span>{posiciones.join(' · ')}</span>}
          </div>
          <TeamMono name={entrada.team.name} color={entrada.team.color} />
        </div>
        <p className={ui.estado}>{textoEstado(entrada)}</p>
        {vista === 'pendiente' && posiciones.length > 1 && <p className={ui.nota}>Aceptar cubre tus {posiciones.length} posiciones en este equipo.</p>}
        {c.errorRespuesta && vista === 'pendiente' && <p role="alert" className={ui.error}>{c.errorRespuesta}</p>}
        <div className={ui.pie}>
          <AccionesConvocatoria entrada={entrada} c={c} />
          {onAbrir && <button type="button" className={`${ui.btn} ${ui.btnT}`} onClick={onAbrir}>Ver detalle ›</button>}
        </div>
      </div>
    </article>
  )
}
