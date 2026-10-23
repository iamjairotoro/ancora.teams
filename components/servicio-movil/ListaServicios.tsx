'use client'
// La lista de Servicios en teléfono (≤ 768 px), cuando no hay ?servicio= en la URL (fase 3 · A2, mockup Servicios-B, primera versión: filas altas): UNA FILA POR SERVICIO: a la izquierda el bloque de fecha y, en tres
// líneas, el nombre, el horario y una fila con los cuadritos de los equipos que participan y, a su lado, las ETIQUETAS de estado (neutra: «Sin convocar», «Convocado», «Completo», «Terminado»; ámbar: «5 sin cubrir»,
// «2 sin responder»). Sin botón «Convocar» y sin filtros por equipo; quedan «Próximos», «Ver historial» y el «+».
// El servicio más cercano es una ficha grande (borde de color de equipo, «en N días»); los demás, filas (FichaServicio, mockup Lista-Admin).
// Tocar la fila abre el servicio (lib/admin/urlServicio.ts). Los datos salen del resumen por equipo (useResumenServicios → /api/admin/servicios-resumen: solo conteos y estados); las filas se arman en
// lib/admin/listaServicios.ts (puras, con pruebas). Un líder ve solo su equipo (`viewer`).
import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { ServicioResumen } from '@/lib/admin/resumenServicios'
import { cuadritosVisibles, filasHistorial, filasProximas, type FilaServicio } from '@/lib/admin/listaServicios'
import type { Viewer } from '@/lib/teamBlocks'
import { diasHasta } from '@/lib/portal/fechas'
import { TEXTOS_SERVICIO as T, abrirFila, enDiasTexto } from '@/lib/textos/servicio'
import FichaServicio, { Chips, Cuadritos } from './FichaServicio'
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

export function Fila({ f, onAbrir, grande = false }: { f: FilaServicio; onAbrir: ListaServiciosProps['onAbrir']; grande?: boolean }) {
  const { items, mas } = cuadritosVisibles(f.equipos)
  const chips = [{ texto: f.estado }, ...f.ambar.map(a => ({ texto: a, ambar: true }))]
  return (
    <FichaServicio grande={grande} fecha={f} nombre={f.nombre} horario={f.horario} terminado={f.terminado} color={f.equipos[0]?.color ?? null}
      enDias={grande && !f.terminado ? enDiasTexto(diasHasta(f.fecha)) : null} ariaLabel={abrirFila(f.nombre, f.cuando)} onAbrir={() => onAbrir(f.servicioId)}
      cuadritos={<Cuadritos items={items} mas={mas} />} chips={<Chips chips={chips} />} />
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
            <ul className={ui.lista}>{proximas.map((f, i) => <Fila key={f.servicioId} f={f} onAbrir={p.onAbrir} grande={i === 0} />)}</ul>
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
