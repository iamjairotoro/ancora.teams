'use client'
// «Mi cronograma» (punto 54, commit 5): el cronograma de TU equipo en este servicio (service_schedule_items), con la hora a la izquierda en columna fija y el texto. Solo con la convocatoria confirmada y solo el de la
// tarjeta abierta. Lee las horas guardadas tal cual (deuda anotada en PENDIENTES: al cambiar la hora de inicio del servicio, la administración debería ofrecer recalcularlas).
import { TeamMono, teamColorProps } from '@/components/TeamColor'
import ui from './servicio.module.css'

export default function CronogramaServicio({ equipo, items }: { equipo: { name: string; color: string | null }; items: { hora: string | null; texto: string }[] }) {
  return (
    <section className={ui.tarjeta} aria-label={`Mi cronograma · ${equipo.name}`} {...teamColorProps(equipo.color)}>
      <div className={ui.equipoCab}><TeamMono name={equipo.name} color={equipo.color} /><b>Mi cronograma · {equipo.name}</b></div>
      {items.length === 0 ? <p className={ui.vacio}>Tu equipo aún no tiene un cronograma para este servicio.</p> : (
        <ul className={ui.lista}>
          {items.map((it, i) => <li key={i} className={ui.crono}><span className={ui.hora}>{it.hora || '—'}</span><span className={ui.cronoTxt}>{it.texto}</span></li>)}
        </ul>
      )}
    </section>
  )
}
