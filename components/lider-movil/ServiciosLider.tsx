'use client'
// «Servicios» del LÍDER en teléfono: las MISMAS pantallas del administrador (lista con el servicio más cercano destacado, ficha de la fecha con la rejilla de equipos y pantalla de equipo: servicio-movil/FichaServicio, PantallaServicio,
// VistaEquipo) con los permisos del líder: en SU equipo abre y cambia herramientas, posiciones y voluntarios; en los demás ve la información, con el candado, y no cambia nada. Sin «Notificar», sin «Orden del servicio», sin lápiz del
// horario ni «⋯»: eso es de quien administra (y el líder no lo tiene hoy).
// Los datos vienen de /api/lider/servicios y /api/lider/servicio, que recortan en el servidor. Un equipo ajeno se dibuja con EquipoAjeno, que no recibe ni importa nada que escriba; el único bloque que escribe es EquipoPropio,
// y cada escritura la vuelve a autorizar el servidor.
import ErrorDeCarga from '../ErrorDeCarga'
import ChecklistLider from '../servicio-movil/ChecklistLider'
import BarraSuperior from '../servicio-movil/BarraSuperior'
import EsqueletoLista from '../servicio-movil/EsqueletoLista'
import EsqueletoServicio from '../servicio-movil/EsqueletoServicio'
import FichaServicio from '../servicio-movil/FichaServicio'
import { HeroServicio, RejillaEquipos } from '../servicio-movil/PantallaServicio'
import lista from '../servicio-movil/lista.module.css'
import pantallas from '../servicio-movil/pantallas.module.css'
import EquipoAjeno from './EquipoAjeno'
import EquipoPropio, { type Vista } from './EquipoPropio'
import PantallaEquipo from './PantallaEquipo'
import PantallaHorario from './PantallaHorario'
import PantallaNotas from './PantallaNotas'
import { cuentasDelServicio, tarjetaDe } from './datosVista'
import { useCarga, type Carga } from './useCarga'
import { fechaLarga } from '@/lib/home/hoy'
import { fechaDeFicha } from '@/lib/admin/listaServicios'
import { fechaMedia } from '@/lib/admin/servicioMovil'
import { diasHasta } from '@/lib/portal/fechas'
import type { EquipoLider, ServicioDeLista } from '@/lib/lider/servicioLider'
import { TEXTOS_SERVICIO as TA, abrirFila, enDiasTexto } from '@/lib/textos/servicio'
import { TEXTOS_LIDER as T, TEXTOS_LIDER_EDICION as TE } from '@/lib/textos/servicioLider'
import ui from './lider-movil.module.css'

export interface DestinoLider { servicio?: string | null; equipo?: string | null; vista?: Vista | null; ref?: string | null }

function Falla({ c, onReintentar }: { c: Carga<unknown>; onReintentar: () => void }) {
  if (c.estado === 'prohibido') return <p className={lista.vacioA}>{T.sinAcceso}</p>
  return <ErrorDeCarga compacto titulo={T.noSePudoCargar} cuerpo={T.noSePudoCargarCuerpo} onReintentar={onReintentar} />
}

function ListaServicios({ irA }: { irA: (d: DestinoLider) => void }) {
  const [c, recargar] = useCarga<{ servicios: ServicioDeLista[] }>('/api/lider/servicios')
  return (
    <div className={lista.raiz}>
      <div className={lista.cab}><h1 className={lista.titulo}>{TA.titulo}</h1></div>
      {c.estado === 'cargando' ? <EsqueletoLista seccion />
        : c.estado !== 'ok' ? <div className={lista.vacio}><Falla c={c} onReintentar={recargar} /></div>
        : c.datos.servicios.length === 0 ? <div className={lista.vacio}><p className={lista.vacioT}>{T.sinServicios}</p></div>
        : (
          <>
            <h2 className={lista.seccion}>{TA.proximos}</h2>
            <ul className={lista.lista}>
              {c.datos.servicios.map((s, i) => {
                const f = fechaDeFicha(s.fecha)
                return <FichaServicio key={s.id} grande={i === 0} fecha={f} nombre={s.titulo} horario={s.horas} enDias={i === 0 ? enDiasTexto(diasHasta(s.fecha)) : null} ariaLabel={abrirFila(s.titulo, f.cuando)} onAbrir={() => irA({ servicio: s.id })} />
              })}
            </ul>
          </>
        )}
    </div>
  )
}

function DetalleServicio({ id, equipoId, vista, refId, irA }: { id: string; equipoId: string | null; vista: Vista | null; refId: string | null; irA: (d: DestinoLider) => void }) {
  const [c, recargar] = useCarga<{ servicio: ServicioDeLista; cerrado: boolean; equipos: EquipoLider[] }>(`/api/lider/servicio?id=${encodeURIComponent(id)}`)
  if (c.estado === 'cargando') return <EsqueletoServicio />
  if (c.estado !== 'ok') return <div className={pantallas.raiz}><BarraSuperior atras={{ etiqueta: T.volverAServicios, onClick: () => irA({}) }} /><Falla c={c} onReintentar={recargar} /></div>
  const { servicio, equipos, cerrado } = c.datos
  const subtitulo = `${fechaLarga(servicio.fecha)} · ${servicio.horas}`
  const equipo = equipoId ? equipos.find(e => e.id === equipoId) ?? null : null
  const propio = equipo?.tuEquipo ? equipo : null
  const alServicio = () => irA({ servicio: id })

  if (vista) {
    // Una herramienta de SU equipo (checklist, horario, notas) o «Gestionar equipo»: vuelve a la pantalla de ese equipo.
    const propios = equipos.filter((e): e is Extract<EquipoLider, { tuEquipo: true }> => e.tuEquipo)
    const herramienta = propios.flatMap(e => e.herramientas).find(h => h.id === refId)
    const gestionado = propios.find(e => e.id === refId)
    const dueno = vista === 'equipo' ? gestionado : propios.find(e => e.herramientas.some(h => h.id === refId))
    return (
      <div className={pantallas.raiz}>
        <BarraSuperior atras={{ texto: dueno?.nombre ?? fechaMedia(servicio.fecha), etiqueta: TA.volverAlServicio, onClick: () => irA({ servicio: id, equipo: dueno?.id ?? null }) }} />
        {vista === 'checklist' && herramienta?.tipo === 'checklist' ? <ChecklistLider servicioId={id} herramientaId={herramienta.id} nombre={herramienta.nombre} />
          : vista === 'horario' && herramienta?.tipo === 'schedule' ? <PantallaHorario servicioId={id} herramientaId={herramienta.id} />
          : vista === 'notas' && herramienta?.tipo === 'notes' ? <PantallaNotas servicioId={id} herramientaId={herramienta.id} />
          : vista === 'equipo' && gestionado ? <PantallaEquipo equipoId={gestionado.id} nombre={gestionado.nombre} />
          : <p className={ui.mensaje}>{T.sinAcceso}</p>}
      </div>
    )
  }
  if (equipoId) {
    return (
      <div className={pantallas.raiz}>
        <BarraSuperior atras={{ texto: fechaMedia(servicio.fecha), etiqueta: TA.volverAlServicio, onClick: alServicio }} />
        {propio ? <EquipoPropio equipo={propio} servicioId={id} fecha={servicio.fecha} subtitulo={subtitulo} cerrado={cerrado} onCambio={recargar} irA={(v, ref) => irA({ servicio: id, equipo: propio.id, vista: v, ref })} />
          : equipo && !equipo.tuEquipo ? <EquipoAjeno equipo={equipo} subtitulo={subtitulo} />
          : <div className={pantallas.vacio}><p className={pantallas.vacioT}>{TA.equipoNoEncontrado}</p><button type="button" className={pantallas.enlace} onClick={alServicio}>{TA.volverAlServicio}</button></div>}
      </div>
    )
  }
  const r = cuentasDelServicio(equipos)
  return (
    <div className={pantallas.raiz}>
      <BarraSuperior atras={{ etiqueta: T.volverAServicios, onClick: () => irA({}) }} />
      <HeroServicio fecha={servicio.fecha} horas={servicio.horas} confirmados={r.confirmados} asignados={r.asignados} vacantes={r.vacantes} porcentaje={r.porcentaje} estado={null}>
        <p className={ui.notaEquipo} style={{ marginTop: '0.875rem' }}>{TE.convoca}</p>
      </HeroServicio>
      <h2 className={pantallas.seccion}>{TA.equipos}</h2>
      {equipos.length === 0 ? <div className={pantallas.vacio}><p className={pantallas.vacioT}>{TA.sinEquipos}</p></div> : (
        <>
          <p className={pantallas.ayuda}>{T.equiposAyuda}</p>
          <RejillaEquipos equipos={equipos.map(tarjetaDe)} onAbrir={teamId => irA({ servicio: id, equipo: teamId })} />
        </>
      )}
    </div>
  )
}

export default function ServiciosLider({ servicioId, equipoId, vista, refId, irA }: { servicioId: string | null; equipoId: string | null; vista: Vista | null; refId: string | null; irA: (d: DestinoLider) => void }) {
  return servicioId ? <DetalleServicio key={servicioId} id={servicioId} equipoId={equipoId} vista={vista} refId={refId} irA={irA} /> : <ListaServicios irA={irA} />
}
