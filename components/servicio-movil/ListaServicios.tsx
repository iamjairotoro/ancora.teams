'use client'
// La lista de Servicios en teléfono (≤ 768 px), cuando no hay ?servicio= en la URL (fase 3 · A2, mockup Servicios-B): UNA FILA POR SERVICIO, compacta: el día, el nombre con los cuadritos de los equipos que
// participan y, debajo, «horario · estado» y lo que falta en ámbar («5 sin cubrir»), todo como texto. Sin botón «Convocar» y sin filtros por equipo; quedan «Próximos», «Ver historial» y el «+».
// Tocar la fila abre el servicio (lib/admin/urlServicio.ts). Los datos salen del resumen por equipo (useResumenServicios → /api/admin/servicios-resumen: solo conteos y estados); las filas se arman en
// lib/admin/listaServicios.ts (puras, con pruebas). Un líder ve solo su equipo (`viewer`).
import { useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import type { ServicioResumen } from '@/lib/admin/resumenServicios'
import { cuadritosVisibles, filasHistorial, filasProximas, type FilaServicio } from '@/lib/admin/listaServicios'
import type { Viewer } from '@/lib/teamBlocks'
import { TEXTOS_SERVICIO as T, abrirFila, masEquiposEtiqueta, masEquiposN } from '@/lib/textos/servicio'
import { teamColorProps } from '../TeamColor'
import ErrorDeCarga from '../ErrorDeCarga'
import ui from './lista.module.css'

export interface ListaServiciosProps {
  servicios: ServicioResumen[] | null
  cargando: boolean
  error: string | null
  onReintentar: () => void
  viewer: Viewer
  /** Abre ese servicio en la vista de Servicio. */
  onAbrir: (servicioId: string) => void
  onNuevo: () => void
}

function Fila({ f, onAbrir }: { f: FilaServicio; onAbrir: ListaServiciosProps['onAbrir'] }) {
  const { items, mas } = cuadritosVisibles(f.equipos)
  return (
    <li>
      <button type="button" className={`${ui.fila} ${f.terminado ? ui.filaTerminada : ''}`} onClick={() => onAbrir(f.servicioId)} aria-label={abrirFila(f.nombre, f.cuando)}>
        <span className={ui.dia} aria-hidden="true"><span>{f.diaSemana}</span><b>{f.dia}</b><span>{f.mes}</span></span>
        <span className={ui.cuerpo}>
          <span className={ui.linea1}>
            <span className={ui.nombre}>{f.nombre}</span>
            {f.equipos.length > 0 && (
              <span className={ui.cuadritos}>
                {items.map(e => <span key={e.teamId} className={ui.cuadrito} role="img" aria-label={e.nombre} {...teamColorProps(e.color)}><span aria-hidden="true">{e.inicial}</span></span>)}
                {mas > 0 && <span className={ui.masEquipos} role="img" aria-label={masEquiposEtiqueta(mas)}><span aria-hidden="true">{masEquiposN(mas)}</span></span>}
              </span>
            )}
          </span>
          <span className={ui.linea2}>
            {[f.horario, f.estado].filter(Boolean).join(' · ')}
            {f.ambar.map(a => <span key={a}>{' · '}<span className={ui.ambar}>{a}</span></span>)}
          </span>
        </span>
        <ChevronRight size={16} className={ui.chev} aria-hidden="true" />
      </button>
    </li>
  )
}

export default function ListaServicios(p: ListaServiciosProps) {
  const [historial, setHistorial] = useState(false)
  const proximas = p.servicios ? filasProximas(p.servicios, p.viewer) : [], pasadas = p.servicios ? filasHistorial(p.servicios, p.viewer) : []
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
          <h2 className={ui.seccion}>{T.proximos}</h2>
          {proximas.length === 0 ? (
            <div className={ui.vacio}><p className={ui.vacioT}>{T.sinProximos}</p><p className={ui.vacioA}>{T.sinProximosAyuda}</p></div>
          ) : (
            <ul className={ui.lista}>{proximas.map(f => <Fila key={f.servicioId} f={f} onAbrir={p.onAbrir} />)}</ul>
          )}
          <button type="button" className={ui.historial} aria-expanded={historial} onClick={() => setHistorial(h => !h)}>{historial ? T.ocultarHistorial : T.verHistorial}</button>
          {historial && (
            <>
              <h2 className={ui.seccion}>{T.historial}</h2>
              {pasadas.length === 0 ? <div className={ui.vacio}><p className={ui.vacioA}>{T.sinHistorial}</p></div> : <ul className={ui.lista}>{pasadas.map(f => <Fila key={f.servicioId} f={f} onAbrir={p.onAbrir} />)}</ul>}
            </>
          )}
        </>
      )}
    </div>
  )
}
