'use client'
// La lista de Servicios en teléfono (≤ 768 px), cuando no hay ?servicio= en la URL (fase 3 · A2, mockup Admin-A): una fila por servicio y equipo, con la franja del color del equipo, el día, el horario, «N de M confirmados»
// y un chip («Faltan N» / «N sin responder» / «Completo») o el botón «Convocar» si el equipo aún no fue convocado. Tocar la fila abre ese servicio con ese equipo (ver lib/admin/urlServicio.ts).
// Los datos salen del resumen por equipo (useResumenServicios → /api/admin/servicios-resumen: solo conteos y estados); las filas se arman en lib/admin/listaServicios.ts (puras, con pruebas).
import { useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import type { ServicioResumen } from '@/lib/admin/resumenServicios'
import { equiposDeLista, filasHistorial, filasProximas, type FilaLista } from '@/lib/admin/listaServicios'
import { TEXTOS_SERVICIO as T, abrirFila } from '@/lib/textos/servicio'
import { teamColorProps } from '../TeamColor'
import ErrorDeCarga from '../ErrorDeCarga'
import ui from './lista.module.css'

export interface ListaServiciosProps {
  servicios: ServicioResumen[] | null
  cargando: boolean
  error: string | null
  onReintentar: () => void
  /** Abre ese servicio (y ese equipo) en la vista de Servicio. */
  onAbrir: (servicioId: string, teamId: string) => void
  onNuevo: () => void
}

function Fila({ f, onAbrir }: { f: FilaLista; onAbrir: ListaServiciosProps['onAbrir'] }) {
  const abrir = () => onAbrir(f.servicioId, f.teamId)
  return (
    <li className={`${ui.fila} ${f.terminado ? ui.filaTerminada : ''}`} {...teamColorProps(f.color)}>
      <button type="button" className={ui.filaBtn} onClick={abrir} aria-label={abrirFila(f.nombre, f.cuando)}>
        <span className={ui.dia} aria-hidden="true"><span>{f.diaSemana}</span><b>{f.dia}</b><span>{f.mes}</span></span>
        <span className={ui.txt}>
          <span className={ui.nombre}>{f.nombre}</span>
          <span className={ui.detalle}>{f.detalle}</span>
          {(f.estado.tipo === 'faltan' || f.estado.tipo === 'sin-responder' || f.estado.tipo === 'completo') && (
            <span className={`${ui.estado} ${f.estado.tipo === 'faltan' ? ui.faltan : f.estado.tipo === 'sin-responder' ? ui.sinResponder : ui.completo}`}>{f.estado.texto}</span>
          )}
        </span>
        <ChevronRight size={16} className={ui.chev} aria-hidden="true" />
      </button>
      {f.estado.tipo === 'convocar' && <button type="button" className={ui.convocar} onClick={abrir}>{T.convocar}</button>}
    </li>
  )
}

export default function ListaServicios(p: ListaServiciosProps) {
  const [equipo, setEquipo] = useState<string | null>(null)
  const [historial, setHistorial] = useState(false)
  const equipos = p.servicios ? equiposDeLista(p.servicios) : []
  // Un filtro que ya no existe (el equipo salió de la lista al recargar) vuelve a «Todos».
  const filtro = equipo && equipos.some(e => e.teamId === equipo) ? equipo : null
  const proximas = p.servicios ? filasProximas(p.servicios, filtro) : [], pasadas = p.servicios ? filasHistorial(p.servicios, filtro) : []
  return (
    <div className={ui.raiz}>
      <div className={ui.cab}>
        <h1 className={ui.titulo}>{T.titulo}</h1>
        <button type="button" className={ui.mas} onClick={p.onNuevo} aria-label={T.nuevoServicio}><Plus size={22} aria-hidden="true" /></button>
      </div>
      {p.error ? (
        <div className={ui.vacio}><ErrorDeCarga compacto titulo={T.noSePudieronCargar} cuerpo={p.error} onReintentar={p.onReintentar} /></div>
      ) : p.cargando || !p.servicios ? (
        <p className={ui.estadoCarga} role="status">{T.cargando}</p>
      ) : (
        <>
          {equipos.length > 0 && (
            <div className={ui.chips} role="group" aria-label={T.filtroEquipo}>
              <button type="button" className={ui.chip} aria-pressed={filtro === null} onClick={() => setEquipo(null)}>{T.todos}</button>
              {equipos.map(e => <button key={e.teamId} type="button" className={ui.chip} aria-pressed={filtro === e.teamId} onClick={() => setEquipo(e.teamId)}>{e.nombre}</button>)}
            </div>
          )}
          <h2 className={ui.seccion}>{T.proximos}</h2>
          {proximas.length === 0 ? (
            <div className={ui.vacio}><p className={ui.vacioT}>{filtro ? T.sinProximosDelEquipo : T.sinProximos}</p>{!filtro && <p className={ui.vacioA}>{T.sinProximosAyuda}</p>}</div>
          ) : (
            <ul className={ui.lista}>{proximas.map(f => <Fila key={f.clave} f={f} onAbrir={p.onAbrir} />)}</ul>
          )}
          <button type="button" className={ui.historial} aria-expanded={historial} onClick={() => setHistorial(h => !h)}>{historial ? T.ocultarHistorial : T.verHistorial}</button>
          {historial && (
            <>
              <h2 className={ui.seccion}>{T.historial}</h2>
              {pasadas.length === 0 ? <div className={ui.vacio}><p className={ui.vacioA}>{T.sinHistorial}</p></div> : <ul className={ui.lista}>{pasadas.map(f => <Fila key={f.clave} f={f} onAbrir={p.onAbrir} />)}</ul>}
            </>
          )}
        </>
      )}
    </div>
  )
}
