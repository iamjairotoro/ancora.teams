'use client'
// La tarjeta del día de la tira (prototipo docs/mockups/index.html), solo dibujo: el título del día, el servicio de ese día (si hay) con «Abrir servicio», el bloqueo (motivo, o «Quitar bloqueo»), la invitación a bloquear
// cuando no hay servicio y, para administración y líderes, quién bloqueó la fecha. Qué botones salen lo dicen las reglas de lib/home/tira.ts (accionesDelDia); aquí no se decide nada.
import { tituloDelDia, type AccionesDelDia, type QuienBloqueo } from '@/lib/home/tira'
import { TEXTOS_TIRA as T } from '@/lib/textos/tiraDias'
import ui from './tira-dias.module.css'

export interface EventoDia {
  servicioId: string
  equipoId: string | null
  /** «Servicio Ancora», «Ensayo». */
  nombre: string
  /** «10:00 – 14:00 · Tu equipo: Alabanza». */
  detalle: string
  /** «Por responder», «Confirmada», «Convocado»… */
  estado: string
  /** El estado pide algo (ámbar). */
  estadoAmbar: boolean
  /** Lo que falta, en ámbar («5 sin cubrir»). */
  extras: string[]
}

export default function PanelDia({ fecha, esHoy, pasado, eventos, acciones, bloqueo, quienes, ocupado, onAbrir, onBloquear, onQuitar }: {
  fecha: string
  esHoy: boolean
  pasado: boolean
  eventos: EventoDia[]
  acciones: AccionesDelDia
  /** El bloqueo propio de la fecha (solo la persona misma): motivo y, si es de algunos equipos, cuáles. */
  bloqueo?: { motivo: string; soloEquipos: string | null } | null
  /** Quién bloqueó la fecha (administración y líderes, ya recortado a lo que cada uno puede ver); undefined = no es su vista. */
  quienes?: QuienBloqueo[]
  ocupado?: boolean
  onAbrir?: (e: EventoDia) => void
  onBloquear?: () => void
  onQuitar?: () => void
}) {
  const varios = eventos.length > 1
  return (
    <>
      <div className={ui.tarjetaCab}>
        <h3 className={ui.tarjetaTitulo}>{tituloDelDia(fecha)}</h3>
        {esHoy && <span className={ui.etiqueta}>{T.hoy}</span>}
      </div>

      {eventos.map(e => (
        <div key={`${e.servicioId}|${e.equipoId ?? ''}`} className={ui.evento}>
          <b className={ui.eventoNombre}>{e.nombre}</b>
          {e.detalle && <span className={ui.eventoDetalle}>{e.detalle}</span>}
          <span className={ui.estados}>
            <span className={`${ui.estado}${e.estadoAmbar ? ` ${ui.estadoAmbar}` : ''}`}>{e.estado}</span>
            {e.extras.map(x => <span key={x} className={`${ui.estado} ${ui.estadoAmbar}`}>{x}</span>)}
          </span>
        </div>
      ))}

      {bloqueo ? (
        <div className={ui.aviso}>
          <b>{T.fechaBloqueada}</b>
          <span className={ui.avisoLinea}>{T.motivo(bloqueo.motivo || T.sinMotivo)}</span>
          {bloqueo.soloEquipos && <span className={ui.avisoLinea}>{T.soloEquipos(bloqueo.soloEquipos)}</span>}
          {acciones.avisoLider && <span className={ui.avisoLinea}>{T.avisoLider}</span>}
        </div>
      ) : acciones.sinServicio && (
        <p className={ui.vacio}>{pasado ? T.sinServicioPasado : `${T.sinServicio}${acciones.bloquear ? ` ${T.sinServicioInvitacion}` : ''}`}</p>
      )}

      {quienes && (
        quienes.length > 0 ? (
          <>
            <p className={ui.quienTit}>{T.quienBloqueo}</p>
            <ul className={ui.quien}>
              {quienes.map(q => (
                <li key={q.memberId} className={ui.quienFila}>
                  <span className={ui.quienNombre}>{q.nombre}</span>
                  <span className={ui.quienFrase}>{q.frase}</span>
                  {q.motivos.length > 0 && <span className={ui.quienFrase}>{T.motivo(q.motivos.join(' · '))}</span>}
                </li>
              ))}
            </ul>
          </>
        ) : <p className={ui.vacio}>{T.nadieBloqueo}</p>
      )}

      {(acciones.abrir || acciones.quitar || acciones.bloquear) && (
        <div className={ui.acciones}>
          {acciones.abrir && eventos.map(e => (
            <button key={`${e.servicioId}|${e.equipoId ?? ''}`} type="button" className={`${ui.btn} ${ui.principal}`} onClick={() => onAbrir?.(e)}>{varios ? `${T.abrirServicio}: ${e.nombre}` : T.abrirServicio}</button>
          ))}
          {acciones.quitar && <button type="button" className={`${ui.btn} ${ui.secundario}`} disabled={ocupado} onClick={onQuitar}>{T.quitar}</button>}
          {acciones.bloquear && <button type="button" className={`${ui.btn} ${acciones.abrir ? ui.secundario : ui.principal}`} disabled={ocupado} onClick={onBloquear}>{T.bloquear}</button>}
        </div>
      )}
    </>
  )
}

/** El aviso de que los bloqueos no cargaron, con «Reintentar» (no se ofrece bloquear ni quitar mientras no se sepa qué días están libres). */
export function AvisoReintentar({ reintentando, onReintentar }: { reintentando: boolean; onReintentar: () => void }) {
  return (
    <div className={`${ui.aviso} ${ui.avisoFila}`} role="alert">
      <span>{T.noCargaronBloqueos}</span>
      <button type="button" className={`${ui.btn} ${ui.secundario}`} disabled={reintentando} onClick={onReintentar}>{reintentando ? T.guardando : T.reintentar}</button>
    </div>
  )
}
