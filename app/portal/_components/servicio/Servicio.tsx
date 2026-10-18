'use client'
// La pantalla Servicio del portal (punto 54, commit 5, diseño B de Claudia). Vive DENTRO de la envoltura (PortalApp, pestaña Servicios) y su URL es `?servicio=<id>&equipo=<id>`: el gesto de volver del iPhone y el botón
// atrás del navegador funcionan. De arriba hacia abajo: barra («‹ Servicios» y el «⋯» con «Ya no puedo ir» y «Quitar mi confirmación»), tarjeta destacada (franja con el color del equipo, «Mañana · Alabanza», la fecha,
// el horario, «Tu rol» y su estado), el selector Orden | Equipo | Mi cronograma y el panel elegido. Mientras la persona no confirme, nada de eso se ve (el servidor tampoco lo manda): solo el aviso.
import { ChevronLeft, Lock } from 'lucide-react'
import Segmentado from '../segmentado/Segmentado'
import { AccionesConvocatoria, IndicadorEstado, vistaDeEntrada, type EntradaConvocatoria, type ControladorConvocatorias, type VistaEstado } from '../convocatorias'
import { teamColorProps } from '@/components/TeamColor'
import { textoDeclinadaPersona } from '@/lib/convocatoriaEstado'
import { agruparEquipo, type BandaPortal, type Vacante } from '@/lib/portal/equipoServicio'
import { diasHasta, fechaConDia, textoRelativo } from '@/lib/portal/fechas'
import { horarioTexto } from '@/lib/portal/agruparServicios'
import MenuConvocatoria from './MenuConvocatoria'
import OrdenServicio, { type ItemOrden } from './OrdenServicio'
import EquipoServicio from './EquipoServicio'
import CronogramaServicio from './CronogramaServicio'
import ui from './servicio.module.css'

export type PanelServicio = 'orden' | 'equipo' | 'cronograma'
export type EntradaServicioDetalle = EntradaConvocatoria & {
  service: EntradaConvocatoria['service'] & { lugar?: string }
  banda?: BandaPortal[]
  vacantes?: Vacante[]
  cronograma?: { hora: string | null; texto: string }[]
  setlist?: ItemOrden[]
}

const OPCIONES: { valor: PanelServicio; texto: string }[] = [{ valor: 'orden', texto: 'Orden' }, { valor: 'equipo', texto: 'Equipo' }, { valor: 'cronograma', texto: 'Mi cronograma' }]
const CLASE_PUNTO: Record<VistaEstado, string> = { confirmado: ui.pOk, pendiente: ui.pPe, 'cambio-de-rol': ui.pRol, rechazo: ui.pNo, 'otro-equipo': ui.pOtro }

function textoDelEstado(e: EntradaConvocatoria, vista: VistaEstado): string {
  switch (vista) {
    case 'confirmado': return 'Confirmado'
    case 'cambio-de-rol': return 'Tu rol cambió — aún no confirmas'
    case 'rechazo': return 'Dijiste que no puedes'
    case 'otro-equipo': return textoDeclinadaPersona(e.reemplazadaPor?.name)
    default: return e.cerrada ? 'No respondiste' : 'Sin responder'
  }
}

export default function Servicio({ entrada, yoId, libraryAccess, abribles, conv, panel, onPanel, onVolver, etiquetaVolver = 'Servicios', onAbrirCancion }: {
  entrada: EntradaServicioDetalle
  yoId: string | null | undefined
  libraryAccess: boolean
  abribles: ReadonlySet<string>
  conv: ControladorConvocatorias
  panel: PanelServicio
  onPanel: (p: PanelServicio) => void
  onVolver: () => void
  /** «‹ Servicios» desde la lista; «‹ Inicio» si se abrió desde el Inicio. */
  etiquetaVolver?: string
  onAbrirCancion: (id: string) => void
}) {
  const svc = entrada.service, team = entrada.team ?? null, inv = entrada.invitation
  const esEnsayo = svc.tipo === 'ensayo'
  const vista = inv && inv.sent_at ? vistaDeEntrada(entrada) : null
  const puedeVer = !!inv && inv.status === 'confirmado'      // el orden, el equipo y el cronograma se ven con la convocatoria confirmada (también después de cerrar)
  const relativo = textoRelativo(diasHasta(svc.fecha))
  const linea = [relativo, team?.name ?? (esEnsayo ? 'Ensayo' : null)].filter(Boolean).join(' · ')
  const horario = [horarioTexto(svc.hora_inicio, svc.hora_fin), svc.lugar || null].filter(Boolean).join(' · ')
  const equipos = agruparEquipo(entrada.banda ?? [], entrada.vacantes ?? [], yoId)
  const items = (entrada.setlist ?? []) as ItemOrden[]
  const menu = vista === 'confirmado' && !entrada.cerrada

  const bloqueado = (texto: string) => <div className={ui.bloqueado}><Lock size={18} aria-hidden="true" />{texto}</div>

  return (
    <div className={ui.pantalla}>
      <div className={ui.barra}>
        <button type="button" className={ui.volver} onClick={onVolver}><ChevronLeft size={22} aria-hidden="true" />{etiquetaVolver}</button>
        {menu && <MenuConvocatoria ocupado={conv.ocupado} onDeclinar={() => conv.pedirDeclinar(entrada)} onQuitar={() => conv.pedirQuitar(entrada)} />}
      </div>

      <section className={ui.hero} aria-labelledby="servicio-fecha" {...(team ? teamColorProps(team.color) : {})}>
        {team && <div className={ui.franja} aria-hidden="true" />}
        <div className={ui.heroCuerpo}>
          {linea && <p className={ui.linea}>{linea}</p>}
          <h1 id="servicio-fecha" className={ui.fecha}>{fechaConDia(svc.fecha)}</h1>
          {horario && <p className={ui.horario}>{horario}</p>}

          {!inv ? <p className={ui.aviso}>{esEnsayo ? 'Aún no has sido convocado a este ensayo.' : 'Aún no has sido convocado a este servicio.'}</p>
            : !inv.sent_at ? <p className={ui.aviso}>Tu convocatoria aún no ha sido enviada — vuelve más tarde.</p>
            : vista && (
              <>
                <div className={ui.rol}>
                  <div className={ui.rolIzq}>
                    <span className={ui.rolEt}>Tu rol</span>
                    <span className={ui.pildoras}>
                      {entrada.posiciones.length > 0 ? entrada.posiciones.map(p => <span key={p} className={ui.pildora}>{p}</span>) : <span className={ui.pildora}>{esEnsayo ? 'Convocado al ensayo' : 'Sin posición'}</span>}
                    </span>
                  </div>
                  <span className={ui.estado}>
                    <span className={`${ui.punto} ${CLASE_PUNTO[vista]}`} aria-hidden="true">{vista === 'confirmado' ? '✓' : vista === 'cambio-de-rol' ? '!' : ''}</span>
                    {textoDelEstado(entrada, vista)}
                  </span>
                </div>
                {(vista !== 'confirmado' || entrada.cerrada) && vista !== 'cambio-de-rol' && <div className={ui.acciones}><AccionesConvocatoria entrada={entrada} c={conv} sobreHero /></div>}
                {conv.errorRespuesta && vista === 'pendiente' && <p role="alert" className={ui.error}>{conv.errorRespuesta}</p>}
              </>
            )}
        </div>
      </section>

      {inv?.sent_at && (esEnsayo ? (
        puedeVer ? <OrdenServicio items={items} titulo="Canciones a repasar" yoId={yoId} libraryAccess={libraryAccess} abribles={abribles} onAbrir={onAbrirCancion} />
          : bloqueado('Confirma tu asistencia para ver las canciones a repasar')
      ) : (
        <>
          <Segmentado opciones={OPCIONES} valor={panel} onCambio={onPanel} etiqueta="Ver del servicio" />
          {panel === 'orden' && (puedeVer ? <OrdenServicio items={items} titulo="Orden del servicio" yoId={yoId} libraryAccess={libraryAccess} abribles={abribles} onAbrir={onAbrirCancion} /> : bloqueado('Confirma tu asistencia para ver el orden del servicio'))}
          {panel === 'equipo' && (puedeVer ? <EquipoServicio equipos={equipos} /> : bloqueado('Confirma tu asistencia para ver quién más sirve este día'))}
          {panel === 'cronograma' && (puedeVer ? (team ? <CronogramaServicio equipo={team} items={entrada.cronograma ?? []} /> : <div className={ui.tarjeta}><p className={ui.vacio}>Este servicio no tiene un cronograma para ti.</p></div>) : bloqueado('Confirma tu asistencia para ver el cronograma de tu equipo'))}
        </>
      ))}
    </div>
  )
}
