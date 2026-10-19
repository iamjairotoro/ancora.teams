'use client'
// Vista «Hoy» del Home en teléfono: la tarjeta del próximo servicio y «Próximos servicios». «Necesita atención» NO va aquí (decisión de Claudia; su cálculo sigue en la página para el escritorio).
import type { HomeProps, UpcomingService } from './Home'
import { FilaProximo } from './HomeMovil'
import ui from './home-movil.module.css'

export interface VistaHoyProps {
  next: HomeProps['next']
  upcoming: UpcomingService[]
  onAbrirServicio: () => void
  onVerTodos: () => void
}

export default function VistaHoy(p: VistaHoyProps) {
  return (
    <>
      {p.next ? (
        <section className={`${ui.tarjeta} ${ui.hero}`} aria-label="Próximo servicio">
          <p className={ui.heroCuando}>{p.next.whenLabel}</p>
          <h2 className={ui.heroTit}>{p.next.title}</h2>
          <p className={ui.heroMeta}>{p.next.confirmedCount} de {p.next.calledCount} confirmados · {p.next.uncoveredCount} sin cubrir</p>
          <button type="button" className={ui.boton} onClick={p.onAbrirServicio}>Abrir servicio</button>
        </section>
      ) : (
        <section className={`${ui.tarjeta} ${ui.hero}`} aria-label="Próximo servicio">
          <p className={ui.heroCuando}>SIN PRÓXIMO SERVICIO</p>
          <p className={ui.vacio}>Todavía no hay ninguno programado. Cuando crees un servicio nuevo, va a aparecer acá.</p>
        </section>
      )}
      <div className={ui.secCab}><h2 className={ui.seccion}>Próximos servicios</h2><button type="button" className={ui.enlace} onClick={p.onVerTodos}>Ver todos</button></div>
      <div className={ui.tarjeta}>
        {p.upcoming.length === 0 && <p className={ui.vacio}>No hay servicios próximos.</p>}
        {p.upcoming.map(s => <FilaProximo key={s.id} s={s} onAbrir={p.onAbrirServicio} />)}
      </div>
    </>
  )
}
