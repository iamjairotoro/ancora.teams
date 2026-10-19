'use client'
// Vista «Hoy» del Home en teléfono (Home · D), armada desde el resumen de servicios por equipo (lib/home/hoy.ts). «Necesita atención» NO va aquí (decisión de Claudia; su cálculo sigue en la página para el escritorio).
//   · Administrador: tarjeta por SERVICIO (fecha, horario, «Abrir servicio») con una línea por equipo — color, nombre, «9 de 10» y Convocado / Sin convocar —; sin barra de progreso sumada; máximo 3 líneas y «+N».
//   · Líder: la tarjeta de SU equipo, con barra (confirmados sobre convocados).
//   · «Próximos servicios»: una fila por servicio y equipo, con la franja del color del equipo.
import type { ServicioResumen } from '@/lib/admin/resumenServicios'
import { filasProximos, tarjetasHoy, textoConfirmados, textoEstado } from '@/lib/home/hoy'
import type { Viewer } from '@/lib/teamBlocks'
import { ChevronRight } from 'lucide-react'
import { TeamMono, teamColorProps } from '../TeamColor'
import ui from './home-movil.module.css'

export interface VistaHoyProps {
  servicios: ServicioResumen[] | null
  cargando: boolean
  error: string | null
  onReintentar: () => void
  viewer: Viewer
  onAbrirServicio: () => void
  onVerTodos: () => void
}

export default function VistaHoy(p: VistaHoyProps) {
  if (p.error) return (
    <div className={`${ui.tarjeta} ${ui.error}`} role="alert"><p>{p.error}</p><button type="button" className={ui.boton} onClick={p.onReintentar}>Reintentar</button></div>
  )
  if (p.cargando || !p.servicios) return <p className={ui.vacio} role="status">Cargando…</p>
  const tarjetas = tarjetasHoy(p.servicios, p.viewer), { filas, total } = filasProximos(p.servicios, p.viewer)
  return (
    <>
      {tarjetas.length === 0 ? (
        <section className={`${ui.tarjeta} ${ui.hero}`} aria-label="Próximo servicio">
          <p className={ui.heroCuando}>SIN PRÓXIMO SERVICIO</p>
          <p className={ui.vacio}>Todavía no hay ninguno programado. Cuando crees un servicio nuevo, va a aparecer acá.</p>
        </section>
      ) : tarjetas.map(t => {
        const e = t.equipos[0]
        return (
          <section key={t.servicioId + (t.modo === 'equipo' ? e.teamId : '')} className={`${ui.tarjeta} ${ui.hero}`} aria-label={t.modo === 'equipo' ? `Próximo servicio de ${e.nombre}` : 'Próximo servicio'} {...(t.modo === 'equipo' ? teamColorProps(e.color) : {})}>
            {t.modo === 'equipo' && (
              <div className={ui.heroEquipo}><TeamMono name={e.nombre} color={e.color} /><span className={ui.heroEquipoN}>{e.nombre}</span><span className={ui.chipEstado}>{textoEstado(e)}</span></div>
            )}
            <h2 className={ui.heroTit}>{t.titulo}</h2>
            {t.horario && <p className={ui.heroMeta}>{t.horario}</p>}
            {t.modo === 'equipo' && e.convocados > 0 && (
              <>
                <div className={ui.progreso} role="img" aria-label={`${e.confirmados} de ${e.convocados} confirmados`}><span style={{ width: `${Math.round((e.confirmados / e.convocados) * 100)}%` }} /></div>
                <p className={ui.heroMeta}>{e.confirmados} de {e.convocados} confirmados</p>
              </>
            )}
            {t.modo === 'servicio' && (
              <ul className={ui.lineas}>
                {t.equipos.map(q => (
                  <li key={q.teamId} className={ui.linea} {...teamColorProps(q.color)}>
                    <TeamMono name={q.nombre} color={q.color} /><span className={ui.lineaN}>{q.nombre}</span>
                    <span className={ui.lineaV}>{q.estado === 'sin-convocar' ? '' : textoConfirmados(q)}</span>
                    <span className={ui.chipEstado}>{textoEstado(q)}</span>
                  </li>
                ))}
                {t.masEquipos > 0 && <li className={ui.mas}>+{t.masEquipos} {t.masEquipos === 1 ? 'equipo' : 'equipos'}</li>}
              </ul>
            )}
            <button type="button" className={ui.boton} onClick={p.onAbrirServicio}>Abrir servicio</button>
          </section>
        )
      })}
      <div className={ui.secCab}><h2 className={ui.seccion}>Próximos servicios</h2><button type="button" className={ui.enlace} onClick={p.onVerTodos}>{total > filas.length ? `Ver todos (${total})` : 'Ver todos'}</button></div>
      <div className={ui.tarjeta}>
        {filas.length === 0 && <p className={ui.vacio}>No hay servicios próximos.</p>}
        {filas.map(f => (
          <button key={f.clave} type="button" className={`${ui.fila} ${ui.filaEquipo}`} onClick={p.onAbrirServicio} {...teamColorProps(f.color)}>
            <span className={ui.dia} aria-hidden="true"><span>{f.mes}</span><b>{f.dia}</b></span>
            <span className={ui.filaTxt}><span className={ui.filaT}>{f.nombre}</span><span className={ui.filaS}>{f.detalle}</span></span>
            <ChevronRight size={16} className={ui.chev} aria-hidden="true" />
          </button>
        ))}
      </div>
    </>
  )
}
