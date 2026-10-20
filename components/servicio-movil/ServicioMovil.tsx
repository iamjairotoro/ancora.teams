'use client'
// El servicio en teléfono (≤ 768 px), en tres niveles que la URL conserva (lib/admin/urlServicio.ts): el servicio (Servicio-C), un equipo (Equipo-A) y una herramienta a pantalla completa.
// Recibe lo MISMO que la vista de escritorio (ServicioAdminProps): no lee nada nuevo; las escrituras son las funciones que la página ya tiene (crear, duplicar, eliminar, convocar, añadir/quitar herramienta)
// y el horario por /api/update-service. Quien ve cada cosa lo decide `viewer`: el administrador ve todos los equipos; un líder, solo el suyo, y «Notificar» se limita a ese equipo.
import { useEffect, useRef, useState } from 'react'
import type { ToolType } from '@/lib/types'
import { servicioTerminado } from '@/lib/servicioTerminado'
import { alcanceNotificar, equiposVisibles, estadoDeEquipo, etiquetaDeServicio, fechaMedia, herramientaDeClave, resumenDeServicio, type SeccionEquipo } from '@/lib/admin/servicioMovil'
import type { VistaServicio } from '@/lib/admin/urlServicio'
import type { Viewer } from '@/lib/teamBlocks'
import { TEXTOS_SERVICIO as T, confirmarNotificar } from '@/lib/textos/servicio'
import { usePersonDrawer } from '../persona/PersonDrawer'
import ErrorDeCarga from '../ErrorDeCarga'
import EnsayoPanel from '../EnsayoPanel'
import { C } from '../OrdenDelServicio'
import BarraSuperior from './BarraSuperior'
import HojaNuevoServicio from './HojaNuevoServicio'
import { HojaAccionesServicio, HojaAnadirHerramienta, HojaCambiarServicio, HojaDuplicar, HojaHorario, HojaPersona } from './HojasServicio'
import PantallaEquipo from './PantallaEquipo'
import PantallaHerramienta from './PantallaHerramienta'
import PantallaServicio from './PantallaServicio'
import type { ServicioAdminProps } from './tipos'
import ui from './pantallas.module.css'

type Hoja = null | 'acciones' | 'cambiar' | 'historial' | 'horario' | 'duplicar' | 'nuevo' | 'herramientas' | { persona: { memberId: string; nombre: string } }

export interface ServicioMovilProps {
  p: ServicioAdminProps
  viewer: Viewer
  vista: VistaServicio
  irA: (v: VistaServicio) => void
  volver: () => void
  onIrAPersonas: () => void
}

function Mensaje({ titulo, ayuda, boton, onClick }: { titulo: string; ayuda?: string; boton: string; onClick: () => void }) {
  return <div className={ui.vacio}><p className={ui.vacioT}>{titulo}</p>{ayuda && <p className={ui.vacioA}>{ayuda}</p>}<button type="button" className={ui.enlace} onClick={onClick}>{boton}</button></div>
}

export default function ServicioMovil({ p, viewer, vista, irA, volver, onIrAPersonas }: ServicioMovilProps) {
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
  // Antes de convocar se pregunta (el correo y la notificación no se pueden retirar).
  function notificar(teamId: string | null, nuevos: number) {
    if (p.sending) return
    if (!window.confirm(confirmarNotificar(nuevos))) return
    p.sendInvites(teamId ?? undefined)
  }

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
      ? <PantallaEquipo p={p} seccion={equipo} estado={estados.get(equipo.teamId)!} viewer={viewer} onAbrirHerramienta={clave => ir({ equipo: equipo.teamId, herramienta: clave })} onAnadirHerramienta={() => setHoja('herramientas')}
          onNotificar={notificar} onMasPersona={v => setHoja({ persona: v })} />
      : <Mensaje titulo={T.equipoNoEncontrado} boton={T.volverAlServicio} onClick={volver} />
  } else {
    barra = <BarraSuperior atras={{ etiqueta: T.volverA, onClick: volver }} selector={{ texto: etiquetaDeServicio(servicio), onClick: () => setHoja('cambiar') }} onMas={mas} />
    cuerpo = <PantallaServicio servicio={servicio} estado={terminado ? 'archivado' : enVivo ? 'en-vivo' : null} secciones={secciones} estados={estados} resumen={resumen} datos={datos} memberNombre={miembro}
      hayOrden={hayOrden} alcance={alcance} enviando={p.sending} aviso={p.aviso} onCerrarAviso={p.onCerrarAviso} onNotificar={notificar}
      onAbrirOrden={() => ir({ herramienta: 'orden' })} onAbrirEquipo={teamId => ir({ equipo: teamId })} onEditarHorario={() => setHoja('horario')} onIrAPersonas={onIrAPersonas} />
  }

  return (
    <div className={ui.raiz}>
      {barra}
      {cuerpo}
      {hoja === 'acciones' && <HojaAccionesServicio puedeDuplicar={!esEnsayo} hayHistorial={p.services.some(s => servicioTerminado(s.fecha, s.hora_fin, ahora, s.hora_inicio))} onCerrar={cerrarHoja}
        onNuevo={() => setHoja('nuevo')} onDuplicar={() => setHoja('duplicar')} onHistorial={() => setHoja('historial')} onEliminar={() => p.deleteService(servicio.id)} />}
      {(hoja === 'cambiar' || hoja === 'historial') && <HojaCambiarServicio services={p.services} actualId={servicio.id} historialAbierto={hoja === 'historial'} onCerrar={cerrarHoja} onElegir={id => irA({ servicio: id, equipo: null, herramienta: null })} />}
      {hoja === 'horario' && <HojaHorario servicio={servicio} onCerrar={cerrarHoja} onGuardado={p.onBlocksChange} />}
      {hoja === 'duplicar' && <HojaDuplicar onCerrar={cerrarHoja} onDuplicar={fecha => p.duplicateService(servicio.id, fecha)} />}
      {hoja === 'nuevo' && <HojaNuevoServicio services={p.services} crear={p.createService} onCerrar={cerrarHoja} onCreado={id => irA({ servicio: id, equipo: null, herramienta: null })} />}
      {hoja === 'herramientas' && equipo && <HojaAnadirHerramienta onCerrar={cerrarHoja} onElegir={(tipo: ToolType) => p.addTeamTool(equipo.teamId, tipo)} />}
      {typeof hoja === 'object' && hoja && <HojaPersona nombre={hoja.persona.nombre} onCerrar={cerrarHoja} onVer={() => abrirPersona(hoja.persona.memberId)} />}
    </div>
  )
}
