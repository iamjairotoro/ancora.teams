'use client'
// «Servicios» del LÍDER en teléfono (tablero Servicio-Lider-A): la lista de servicios, el detalle (SU equipo, que puede cambiar, y los demás plegados en «Solo lectura») y las pantallas de su equipo (checklist, horario, notas, composición).
// Los datos vienen de /api/lider/servicios y /api/lider/servicio, que recortan en el servidor. Un equipo ajeno se dibuja con EquipoAjeno, que no recibe ni importa nada que escriba; el único bloque que escribe es EquipoPropio,
// y cada escritura la vuelve a autorizar el servidor. No hay «Notificar» ni «Asignar» en equipos ajenos.
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ErrorDeCarga from '../ErrorDeCarga'
import ChecklistLider from '../servicio-movil/ChecklistLider'
import EquipoAjeno from './EquipoAjeno'
import EquipoPropio, { type Vista } from './EquipoPropio'
import PantallaEquipo from './PantallaEquipo'
import PantallaHorario from './PantallaHorario'
import PantallaNotas from './PantallaNotas'
import { useCarga, type Carga } from './useCarga'
import { fechaLarga } from '@/lib/home/hoy'
import { fechaCorta } from '@/lib/admin/servicioMovil'
import type { EquipoLider, ServicioDeLista } from '@/lib/lider/servicioLider'
import { TEXTOS_LIDER as T } from '@/lib/textos/servicioLider'
import ui from './lider-movil.module.css'

export interface DestinoLider { servicio?: string | null; vista?: Vista | null; ref?: string | null }

function Falla({ c, onReintentar }: { c: Carga<unknown>; onReintentar: () => void }) {
  if (c.estado === 'cargando') return <p className={ui.mensaje} role="status">{T.cargando}</p>
  if (c.estado === 'prohibido') return <p className={ui.mensaje}>{T.sinAcceso}</p>
  return <ErrorDeCarga compacto titulo={T.noSePudoCargar} cuerpo={T.noSePudoCargarCuerpo} onReintentar={onReintentar} />
}

function ListaServicios({ irA }: { irA: (d: DestinoLider) => void }) {
  const [c, recargar] = useCarga<{ servicios: ServicioDeLista[] }>('/api/lider/servicios')
  return (
    <div className={ui.pagina}>
      <h1 className={ui.titulo}>{T.servicios}</h1>
      <p className={ui.ayuda}>{T.ayuda}</p>
      {c.estado !== 'ok' ? <Falla c={c} onReintentar={recargar} />
        : c.datos.servicios.length === 0 ? <p className={ui.mensaje}>{T.sinServicios}</p>
        : (
          <ul className={ui.lista}>
            {c.datos.servicios.map(s => {
              const dia = Number(s.fecha.split('-')[2])
              return (
                <li key={s.id}>
                  <button type="button" className={ui.fila} onClick={() => irA({ servicio: s.id })} aria-label={`${s.titulo}, ${fechaCorta(s.fecha)}, ${s.horas}`}>
                    <span className={ui.fecha} aria-hidden="true">{fechaCorta(s.fecha).split(' ')[0]}<span className={ui.fechaDia}>{dia}</span></span>
                    <span className={ui.filaTxt}><span className={ui.filaTit}>{s.titulo}</span><span className={ui.filaSub}>{s.horas}</span></span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
    </div>
  )
}

function DetalleServicio({ id, vista, refId, irA }: { id: string; vista: Vista | null; refId: string | null; irA: (d: DestinoLider) => void }) {
  const [c, recargar] = useCarga<{ servicio: ServicioDeLista; cerrado: boolean; equipos: EquipoLider[] }>(`/api/lider/servicio?id=${encodeURIComponent(id)}`)
  const atras = (al: DestinoLider) => <button type="button" className={ui.atras} onClick={() => irA(al)} aria-label={T.volverAServicios}><ChevronLeft size={22} aria-hidden="true" /><span>{vista ? 'Servicio' : T.servicios}</span></button>
  if (c.estado !== 'ok') return <div className={ui.pagina}>{atras({})}<Falla c={c} onReintentar={recargar} /></div>
  const { servicio, equipos, cerrado } = c.datos
  const propios = equipos.filter(e => e.tuEquipo)
  if (vista) {
    const herramienta = propios.flatMap(e => e.herramientas).find(h => h.id === refId)
    const equipo = propios.find(e => e.id === refId)
    return (
      <div className={ui.pagina}>
        {atras({ servicio: id })}
        {vista === 'checklist' && herramienta?.tipo === 'checklist' ? <ChecklistLider servicioId={id} herramientaId={herramienta.id} nombre={herramienta.nombre} />
          : vista === 'horario' && herramienta?.tipo === 'schedule' ? <PantallaHorario servicioId={id} herramientaId={herramienta.id} />
          : vista === 'notas' && herramienta?.tipo === 'notes' ? <PantallaNotas servicioId={id} herramientaId={herramienta.id} />
          : vista === 'equipo' && equipo ? <PantallaEquipo equipoId={equipo.id} nombre={equipo.nombre} />
          : <p className={ui.mensaje}>{T.sinAcceso}</p>}
      </div>
    )
  }
  return (
    <div className={ui.pagina}>
      {atras({})}
      <header>
        <h1 className={ui.titulo}>{fechaLarga(servicio.fecha)}</h1>
        <p className={ui.sub}>{servicio.horas} · {servicio.titulo}</p>
      </header>
      <p className={ui.ayuda}>{T.ayuda}</p>
      {equipos.map(e => e.tuEquipo
        ? <EquipoPropio key={e.id} equipo={e} servicioId={id} cerrado={cerrado} onCambio={recargar} irA={(v, ref) => irA({ servicio: id, vista: v, ref })} />
        : <EquipoAjeno key={e.id} equipo={e} />)}
    </div>
  )
}

export default function ServiciosLider({ servicioId, vista, refId, irA }: { servicioId: string | null; vista: Vista | null; refId: string | null; irA: (d: DestinoLider) => void }) {
  return servicioId ? <DetalleServicio key={servicioId} id={servicioId} vista={vista} refId={refId} irA={irA} /> : <ListaServicios irA={irA} />
}
