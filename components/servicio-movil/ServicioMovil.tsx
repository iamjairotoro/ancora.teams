'use client'
// El servicio en teléfono (≤ 768 px), en tres niveles que la URL conserva (lib/admin/urlServicio.ts): el servicio (Servicio-C), un equipo (Equipo-A) y una herramienta a pantalla completa.
// Recibe lo MISMO que la vista de escritorio (ServicioAdminProps): no lee nada nuevo; las escrituras son las funciones que la página ya tiene (crear, duplicar, eliminar, convocar, añadir/quitar herramienta)
// y el horario por /api/update-service. Quien ve cada cosa lo decide `viewer`: el administrador ve todos los equipos; un líder, solo el suyo, y «Notificar» se limita a ese equipo.
import { useEffect, useRef, useState } from 'react'
import type { ToolType } from '@/lib/types'
import { servicioTerminado } from '@/lib/servicioTerminado'
import { alcanceNotificar, cupoDentroDeLimites, equiposVisibles, estadoDeEquipo, etiquetaDeServicio, fechaCorta, fechaMedia, herramientaDeClave, opcionesParaAsignar, posicionesDeEquipo, puedeAsignar, resumenDeServicio, type SeccionEquipo } from '@/lib/admin/servicioMovil'
import { positionMaps } from '@/lib/assignHints'
import { blockedIdsForTeam } from '@/lib/teamBlocks'
import type { VistaServicio } from '@/lib/admin/urlServicio'
import type { Viewer } from '@/lib/teamBlocks'
import { TEXTOS_SERVICIO as T } from '@/lib/textos/servicio'
import { usePersonDrawer } from '../persona/PersonDrawer'
import ErrorDeCarga from '../ErrorDeCarga'
import EnsayoPanel from '../EnsayoPanel'
import { C } from '../OrdenDelServicio'
import BarraSuperior from './BarraSuperior'
import HojaNuevoServicio from './HojaNuevoServicio'
import { HojaPosicion } from './HojasEquipo'
import { fichasDeEquipo } from './fichas'
import { HojaAccionesServicio, HojaAnadirHerramienta, HojaCambiarServicio, HojaConfirmarNotificar, HojaDuplicar, HojaHorario } from './HojasServicio'
import PantallaEquipo from './PantallaEquipo'
import PantallaHerramienta from './PantallaHerramienta'
import PantallaServicio from './PantallaServicio'
import type { ServicioAdminProps } from './tipos'
import ui from './pantallas.module.css'

type Hoja = null | 'acciones' | 'cambiar' | 'historial' | 'horario' | 'duplicar' | 'nuevo' | 'herramientas' | { posicion: string } | { notificar: { teamId: string | null; nuevos: number } }

export interface ServicioMovilProps {
  p: ServicioAdminProps
  viewer: Viewer
  vista: VistaServicio
  irA: (v: VistaServicio) => void
  volver: () => void
  onIrAPersonas: () => void
  /** «Editar las posiciones del equipo»: abre la gestión de ese equipo en Personas. */
  onEditarPosiciones: (teamId: string) => void
}

function Mensaje({ titulo, ayuda, boton, onClick }: { titulo: string; ayuda?: string; boton: string; onClick: () => void }) {
  return <div className={ui.vacio}><p className={ui.vacioT}>{titulo}</p>{ayuda && <p className={ui.vacioA}>{ayuda}</p>}<button type="button" className={ui.enlace} onClick={onClick}>{boton}</button></div>
}

export default function ServicioMovil({ p, viewer, vista, irA, volver, onIrAPersonas, onEditarPosiciones }: ServicioMovilProps) {
  const { open: abrirPersona } = usePersonDrawer()
  const [hoja, setHoja] = useState<Hoja>(null)
  const cerrarHoja = () => setHoja(null)
  const servicioId = vista.servicio as string
  const existe = p.services.some(s => s.id === servicioId)
  // Si el servicio abierto se elimina, se vuelve a la lista (no se queda en «no encontramos este servicio»).
  const estuvo = useRef(false)
  useEffect(() => {
    if (existe) { estuvo.current = true; return }
    if (estuvo.current && !p.dataLoading && !p.dataError) { estuvo.current = false; volver() }
  }, [existe, p.dataLoading, p.dataError, volver])

  if (p.dataError) return <div className="anc"><ErrorDeCarga compacto titulo={T.noSePudoCargarServicios} cuerpo={p.dataError} onReintentar={p.onRetryData} /></div>
  if (p.dataLoading || (existe && p.selectedService?.id !== servicioId)) return (
    <div className="anc" role="status" aria-label={T.cargando}>
      <div className="anc-skel" style={{ height: 44, width: '70%', marginBottom: 14 }} />
      <div className="anc-skel" style={{ height: 150, marginBottom: 14 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{[0, 1, 2, 3].map(i => <div key={i} className="anc-skel" style={{ height: 150 }} />)}</div>
    </div>
  )
  const servicio = p.selectedService
  if (!existe || !servicio) return <Mensaje titulo={T.servicioNoEncontrado} ayuda={T.servicioNoEncontradoAyuda} boton={T.volver} onClick={volver} />

  const ahora = new Date(), terminado = servicioTerminado(servicio.fecha, servicio.hora_fin, ahora, servicio.hora_inicio)
  const enVivo = !terminado && new Date(servicio.fecha + 'T' + (servicio.hora_inicio || '10:00')) <= ahora
  const esEnsayo = servicio.kind === 'rehearsal'
  const secciones: SeccionEquipo[] = equiposVisibles(p.equipoSections, viewer)
  const datos = { bandaItems: p.bandaItems, invitations: p.invitations, getSlotsNeeded: p.getSlotsNeeded }
  const estados = new Map(secciones.map(s => [s.teamId, estadoDeEquipo(s, datos)] as const))
  const resumen = resumenDeServicio(Array.from(estados.values()))
  const alcance = alcanceNotificar(viewer, secciones, estados)
  const hayOrden = secciones.some(s => s.tools.some(t => t.tool_type === 'setlist'))
  const miembro = (id: string) => p.members.find(m => m.id === id)
  const ir = (v: Partial<VistaServicio>) => irA({ servicio: servicioId, equipo: null, herramienta: null, ...v })
  // Antes de convocar se pregunta en una hoja (el correo no se puede retirar); «Notificar» recién ahí llama a la función de la página.
  function notificar(teamId: string | null, nuevos: number) { if (!p.sending) setHoja({ notificar: { teamId, nuevos } }) }
  // Las ÚNICAS dos escrituras del teléfono sobre la nómina: assignBanda (quién va en un cupo; '' lo deja libre) y updateSlotsNeeded (cuántos cupos pide una posición). Un líder solo en su equipo.
  function asignar(posicionId: string, memberId: string, slotIndex: number) { if (equipo && puedeAsignar(viewer, equipo.teamId)) p.assignBanda(posicionId, memberId, slotIndex) }
  function cambiarCupo(posicionId: string, nuevo: number, ultimoOcupado: number) { if (equipo && puedeAsignar(viewer, equipo.teamId)) p.updateSlotsNeeded(posicionId, cupoDentroDeLimites(nuevo, ultimoOcupado)) }

  const equipo = vista.equipo ? secciones.find(s => s.teamId === vista.equipo) : null
  let cuerpo: React.ReactNode, barra: React.ReactNode
  const mas = () => setHoja('acciones')
  if (esEnsayo) {
    barra = <BarraSuperior atras={{ etiqueta: T.volverA, onClick: volver }} selector={{ texto: etiquetaDeServicio(servicio), onClick: () => setHoja('cambiar') }} onMas={mas} />
    cuerpo = <EnsayoPanel ensayo={servicio} members={p.members} darkMode={p.darkMode} C={C} />
  } else if (vista.herramienta) {
    const r = herramientaDeClave(secciones, vista.equipo, vista.herramienta)
    barra = <BarraSuperior atras={{ texto: r && vista.equipo ? r.seccion.nombre : fechaMedia(servicio.fecha), etiqueta: T.volverAlServicio, onClick: volver }} />
    cuerpo = r ? <PantallaHerramienta key={r.tool.id} p={p} seccion={r.seccion} tool={r.tool} /> : <Mensaje titulo={T.herramientaNoEncontrada} ayuda={T.herramientaNoEncontradaAyuda} boton={T.volverAlServicio} onClick={volver} />
  } else if (vista.equipo) {
    barra = <BarraSuperior atras={{ texto: fechaMedia(servicio.fecha), etiqueta: T.volverAlServicio, onClick: volver }} onMas={mas} />
    cuerpo = equipo
      ? <PantallaEquipo p={p} seccion={equipo} estado={estados.get(equipo.teamId)!} fichaDe={fichasDeEquipo(p, equipo.teamId, viewer)} onAbrirHerramienta={clave => ir({ equipo: equipo.teamId, herramienta: clave })} onAnadirHerramienta={() => setHoja('herramientas')}
          onNotificar={notificar} puedeAsignar={puedeAsignar(viewer, equipo.teamId)} onAbrirPosicion={posicion => setHoja({ posicion })} />
      : <Mensaje titulo={T.equipoNoEncontrado} boton={T.volverAlServicio} onClick={volver} />
  } else {
    barra = <BarraSuperior atras={{ etiqueta: T.volverA, onClick: volver }} selector={{ texto: etiquetaDeServicio(servicio), onClick: () => setHoja('cambiar') }} onMas={mas} />
    cuerpo = <PantallaServicio servicio={servicio} estado={terminado ? 'archivado' : enVivo ? 'en-vivo' : null} secciones={secciones} estados={estados} resumen={resumen} datos={datos} memberNombre={miembro}
      hayOrden={hayOrden} alcance={alcance} enviando={p.sending} aviso={p.aviso} onCerrarAviso={p.onCerrarAviso} onNotificar={notificar}
      onAbrirOrden={() => ir({ herramienta: 'orden' })} onAbrirEquipo={teamId => ir({ equipo: teamId })} onEditarHorario={() => setHoja('horario')} onIrAPersonas={onIrAPersonas} avisoCreacion={p.avisoCreacion} onCerrarAvisoCreacion={p.onCerrarAvisoCreacion} />
  }

  return (
    <div className={ui.raiz}>
      {barra}
      {cuerpo}
      {hoja === 'acciones' && <HojaAccionesServicio puedeDuplicar={!esEnsayo} hayHistorial={p.services.some(s => servicioTerminado(s.fecha, s.hora_fin, ahora, s.hora_inicio))} onCerrar={cerrarHoja}
        onNuevo={() => setHoja('nuevo')} onDuplicar={() => setHoja('duplicar')} onHistorial={() => setHoja('historial')} onEliminar={() => p.deleteService(servicio.id)}
        onEditarPosiciones={equipo && !vista.herramienta && viewer.kind === 'admin' ? () => onEditarPosiciones(equipo.teamId) : undefined} />}
      {(hoja === 'cambiar' || hoja === 'historial') && <HojaCambiarServicio services={p.services} actualId={servicio.id} historialAbierto={hoja === 'historial'} onCerrar={cerrarHoja} onElegir={id => irA({ servicio: id, equipo: null, herramienta: null })} />}
      {hoja === 'horario' && <HojaHorario servicio={servicio} onCerrar={cerrarHoja} onGuardado={p.onBlocksChange} />}
      {hoja === 'duplicar' && <HojaDuplicar onCerrar={cerrarHoja} onDuplicar={fecha => p.duplicateService(servicio.id, fecha)} />}
      {hoja === 'nuevo' && <HojaNuevoServicio services={p.services} crear={p.createService} onCerrar={cerrarHoja} onCreado={id => irA({ servicio: id, equipo: null, herramienta: null })} />}
      {hoja === 'herramientas' && equipo && <HojaAnadirHerramienta onCerrar={cerrarHoja} onElegir={(tipo: ToolType) => p.addTeamTool(equipo.teamId, tipo)} />}
      {typeof hoja === 'object' && hoja && 'posicion' in hoja && equipo && (() => {
        const pos = posicionesDeEquipo(equipo, datos, miembro).find(x => x.posicionId === hoja.posicion), def = equipo.posiciones.find(x => x.id === hoja.posicion)
        if (!pos || !def) return null
        const { posTeam, posNames } = positionMaps(p.equipoSections), teamNames = new Map(p.equipoSections.map(s => [s.teamId, s.nombre] as [string, string])), bloqueados = blockedIdsForTeam(p.dateBlocks, equipo.teamId), fichaDe = fichasDeEquipo(p, equipo.teamId, viewer)
        const opcionesPara = (actualId?: string) => {
          const base = p.membersFor(pos.posicionId), extra = actualId && !base.some(m => m.id === actualId) ? miembro(actualId) : undefined
          return opcionesParaAsignar({ candidatos: extra ? [...base, extra] : base, posicionId: pos.posicionId, posicionNombre: pos.nombre, teamId: equipo.teamId, actualId, banda: p.bandaItems, posTeam, posNames, teamNames, bloqueados })
        }
        const filas = pos.personas.map(v => ({ slotIndex: v.slotIndex, memberId: v.memberId, nombre: v.nombre, iniciales: v.iniciales, ficha: fichaDe(v.memberId) }))
        return <HojaPosicion key={pos.posicionId} posicion={pos} contexto={`${equipo.nombre} · ${fechaCorta(servicio.fecha)}`} filas={filas} perfilVacio={p.membersFor(pos.posicionId).length === 0} opcionesPara={opcionesPara} onCerrar={cerrarHoja} onIrAPersonas={onIrAPersonas}
          onElegir={(slot, id) => asignar(pos.posicionId, id, slot)} onQuitar={slot => asignar(pos.posicionId, '', slot)} onVer={abrirPersona} onCupos={n => cambiarCupo(pos.posicionId, n, pos.ultimoOcupado)} />
      })()}
      {typeof hoja === 'object' && hoja && 'notificar' in hoja && <HojaConfirmarNotificar nuevos={hoja.notificar.nuevos} onCerrar={cerrarHoja} onConfirmar={() => p.sendInvites(hoja.notificar.teamId ?? undefined)} />}
    </div>
  )
}
