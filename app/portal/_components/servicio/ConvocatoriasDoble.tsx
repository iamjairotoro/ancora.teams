'use client'
// Las convocatorias de UN servicio cuando hay más de una (teléfono; Doble-A a Doble-D): una tarjeta por EQUIPO con sus posiciones juntas y un solo par de botones (varias posiciones del mismo equipo son UNA convocatoria
// y UNA respuesta). La confirmada va arriba y grande; las demás, pequeñas y apagadas: «Se declinó porque confirmaste otro equipo» (automática, sin culpa: no es un rechazo). Solo dibuja y reenvía: el orden, el choque y los
// textos son lib/portal/doble.ts y lib/textos/doble.ts; las respuestas las hace el controlador (useConvocatorias → la base decide, de forma atómica).
import { Info } from 'lucide-react'
import { AccionesConvocatoria, AvisoCerrada, vistaDeEntrada, type ControladorConvocatorias } from '../convocatorias'
import { teamColorProps, TeamMono } from '@/components/TeamColor'
import { TEXTOS_DOBLE as T } from '@/lib/textos/doble'
import { aCambiarDesde, quedaAlgunaPorResponder } from '@/lib/portal/doble'
import type { EntradaServicioDetalle } from './Servicio'
import ui from './doble.module.css'

export default function ConvocatoriasDoble({ entradas, c }: { entradas: EntradaServicioDetalle[]; c: ControladorConvocatorias }) {
  return (
    <>
      {quedaAlgunaPorResponder(entradas) && <p className={ui.aviso} role="note"><Info size={16} aria-hidden="true" />{T.aviso(entradas.length)}</p>}
      <ul className={ui.lista}>
        {entradas.map(e => {
          const vista = vistaDeEntrada(e), nombre = e.team?.name ?? 'Equipo', pos = T.posiciones(e.posiciones)
          const cab = (extra: React.ReactNode) => (
            <div className={ui.cab}>
              <TeamMono name={nombre} color={e.team?.color} />
              <span className={ui.quien}><span className={ui.equipo}>{nombre}</span>{pos && <span className={ui.posiciones}>{pos}</span>}</span>
              {extra}
            </div>
          )
          return (
            <li key={e.invitation?.id ?? e.team?.id ?? nombre} className={`${ui.tarjeta}${vista === 'confirmado' || vista === 'cambio-de-rol' ? ` ${ui.ok}` : vista === 'otro-equipo' || vista === 'rechazo' ? ` ${ui.apagada}` : ''}`} {...teamColorProps(e.team?.color)}>
              {vista === 'confirmado' && cab(<span className={ui.okEstado}><span className={ui.okCirculo} aria-hidden="true">✓</span>{T.confirmado}</span>)}
              {vista === 'cambio-de-rol' && <>{cab(<span className={`${ui.estado} ${ui.sinResponder}`}>!</span>)}<p className={ui.nota}>Tu rol cambió — aún no confirmas</p></>}
              {vista === 'pendiente' && <>{cab(<span className={`${ui.estado} ${ui.sinResponder}`}>{e.cerrada ? 'No respondiste' : T.sinResponder}</span>)}{e.cerrada ? <div className={ui.acciones}><AvisoCerrada sobreHero /></div> : <div className={ui.acciones}><AccionesConvocatoria entrada={e} c={c} sobreHero /></div>}</>}
              {vista === 'otro-equipo' && <>{cab(null)}<p className={ui.nota}>{T.declinadaAuto}</p>{aCambiarDesde(e, entradas) && <div className={ui.acciones}><button type="button" className={ui.cambiar} disabled={c.ocupado} onClick={() => c.pedirCambiar(e)} aria-label={`Cambiar a ${nombre}`}>{T.cambiar}</button></div>}</>}
              {vista === 'rechazo' && <>{cab(null)}<p className={ui.nota}>{T.rechazo}</p>{!e.cerrada && <div className={ui.acciones}><AccionesConvocatoria entrada={e} c={c} sobreHero /></div>}</>}
            </li>
          )
        })}
      </ul>
    </>
  )
}
