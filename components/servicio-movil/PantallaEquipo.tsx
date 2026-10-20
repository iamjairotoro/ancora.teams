'use client'
// La pantalla de un equipo en el servicio, en teléfono (Equipo-A): su encabezado (confirmados sobre asignados y cuántas posiciones faltan), el carrusel de herramientas (solo ícono y nombre: no se lee
// nada nuevo de ninguna tabla), las personas asignadas como tarjetas y las posiciones sin cubrir. Conserva lo que el panel de escritorio ya muestra: el «!» del correo con «Reintentar correo», «Su rol cambió»,
// el bloqueo de la fecha, «Aceptó en {equipo}» y «Aceptaron en otro equipo». Quién declinó solo lo ve quien puede (administrador; un líder, en su equipo). «Notificar a N nuevos» es de ESTE equipo.
// Asignar a alguien en una posición libre y «Gestionar posiciones» llegan con la hoja de asignar (B4): por ahora las posiciones sin cubrir se muestran, sin botón.
import { Ellipsis, Plus } from 'lucide-react'
import type { Invitation } from '@/lib/types'
import type { EstadoEquipoServicio } from '@/lib/admin/estadoEquipoServicio'
import { claveDeHerramienta, estadoDePersona, herramientasDeTelefono, puedeVerRechazos, rangoDeHoras, voluntariosDeEquipo, type EstadoPersona, type SeccionEquipo } from '@/lib/admin/servicioMovil'
import { blockedIdsForTeam, type Viewer } from '@/lib/teamBlocks'
import { textoAceptoEn } from '@/lib/convocatoriaEstado'
import { vacantesPorConflicto } from '@/lib/vacantesPorConflicto'
import { problemaDeCorreo, resultadoDe } from '@/lib/problemasCorreo'
import { fechaLarga } from '@/lib/home/hoy'
import { TEXTOS_HOME } from '@/lib/textos/home'
import { confirmadosDe } from '@/lib/textos/home'
import { TEXTOS_SERVICIO as T, faltaPosicion, faltan, nombreDeHerramienta, notificarNuevos } from '@/lib/textos/servicio'
import { TeamMono, teamColorProps } from '../TeamColor'
import ProblemaCorreo from '../ProblemaCorreo'
import MensajeConvocatoria from '../MensajeConvocatoria'
import type { ServicioAdminProps } from './tipos'
import { IconoHerramienta } from './iconos'
import ui from './pantallas.module.css'

const TEXTO_ESTADO: Record<EstadoPersona, string> = {
  'por-notificar': T.porNotificar, confirmado: TEXTOS_HOME.confirmo, 'sin-responder': T.sinResponder, rechazo: T.noPuede, 'otro-equipo': '', reconfirmar: T.reconfirmar,
}
const PUNTO: Record<EstadoPersona, string> = { 'por-notificar': '', confirmado: ui.puntoOk, 'sin-responder': '', rechazo: ui.puntoNo, 'otro-equipo': ui.puntoOtro, reconfirmar: '' }

export interface PantallaEquipoProps {
  p: ServicioAdminProps
  seccion: SeccionEquipo
  estado: EstadoEquipoServicio
  viewer: Viewer
  onAbrirHerramienta: (clave: string) => void
  onAnadirHerramienta: () => void
  onNotificar: (teamId: string, nuevos: number) => void
  onMasPersona: (v: { memberId: string; nombre: string }) => void
}

export default function PantallaEquipo({ p, seccion, estado, viewer, onAbrirHerramienta, onAnadirHerramienta, onNotificar, onMasPersona }: PantallaEquipoProps) {
  const servicio = p.selectedService!, teamId = seccion.teamId
  const miembro = (id: string) => p.members.find(m => m.id === id)
  const { voluntarios, vacantes } = voluntariosDeEquipo(seccion, { bandaItems: p.bandaItems, getSlotsNeeded: p.getSlotsNeeded }, miembro)
  const bloqueados = blockedIdsForTeam(p.dateBlocks, teamId), verRechazos = puedeVerRechazos(viewer, teamId)
  const herramientas = herramientasDeTelefono(seccion.tools)
  const nombreDeEquipo = (id?: string | null) => p.equipoSections.find(s => s.teamId === id)?.nombre
  const invDe = (memberId: string): Invitation | undefined => p.invitations.find(i => i.member_id === memberId && i.team_id === teamId)

  // Punto 52: quien «aceptó aquí en su lugar» dejó sus posiciones vacantes y ya no sale en la nómina: el líder necesita saber quién se fue y adónde.
  const posDeEquipo = new Map(p.equipoSections.flatMap(sec => sec.posiciones.map(x => [x.id, sec.teamId] as [string, string])))
  const sigue = (memberId: string, tid: string) => p.bandaItems.some(b => b.member_id === memberId && !!b.team_position_id && posDeEquipo.get(b.team_position_id) === tid)
  const idaEquipo = (id: string) => p.invitations.find(i => i.id === id)?.team_id ?? p.equipoDeInvitacion?.[id]
  const seFueron = vacantesPorConflicto(p.invitations, sigue, idaEquipo, new Set([teamId]))

  return (
    <>
      <section className={`${ui.hero} ${ui.heroFranja}`} aria-label={seccion.nombre} {...teamColorProps(seccion.color)}>
        <div className={ui.heroEquipo}><TeamMono name={seccion.nombre} color={seccion.color} /><h1 className={ui.heroTit} style={{ fontSize: '1.5rem' }}>{seccion.nombre}</h1></div>
        <p className={ui.heroSub}>{fechaLarga(servicio.fecha)} · {rangoDeHoras(servicio.hora_inicio, servicio.hora_fin)}</p>
        <div className={ui.chips} style={{ marginTop: '0.75rem' }}>
          <span className={ui.chip}>{estado.asignados > 0 ? confirmadosDe(estado.porAsignado.confirmados, estado.asignados) : T.sinAsignar}</span>
          {estado.vacantes > 0 && <span className={`${ui.chip} ${ui.chipFalta}`}>{faltan(estado.vacantes)}</span>}
        </div>
      </section>

      <h2 className={ui.seccion}>{T.herramientasDelEquipo}</h2>
      {herramientas.length === 0 && <p className={ui.sinHerr}>{T.sinHerramientas}</p>}
      <div className={ui.carrusel}>
        {herramientas.map(t => (
          <button key={t.id} type="button" className={ui.herr} onClick={() => onAbrirHerramienta(claveDeHerramienta(t))}>
            <span className={ui.herrIcono}><IconoHerramienta tipo={t.tool_type} /></span>
            <span className={ui.herrNombre}>{nombreDeHerramienta(t.tool_type)}</span>
          </button>
        ))}
        <button type="button" className={`${ui.herr} ${ui.herrAnadir}`} onClick={onAnadirHerramienta}>
          <span className={ui.herrIcono} style={{ background: 'none' }}><Plus size={20} aria-hidden="true" /></span>
          <span className={ui.herrNombre}>{T.anadirHerramienta}</span>
        </button>
      </div>

      <div className={ui.cabSeccion}><h2 className={ui.seccion}>{T.voluntarios}</h2></div>
      {voluntarios.length === 0 && vacantes.length === 0 && <p className={ui.sinHerr}>{T.sinVoluntarios}</p>}
      <div className={ui.voluntarios}>
        {voluntarios.map(v => {
          const inv = invDe(v.memberId), est = estadoDePersona(inv, { verRechazos })
          const m = miembro(v.memberId)
          const prob = est !== 'otro-equipo' ? problemaDeCorreo({ email: m?.email, estadoGuardado: inv?.email_status, errorGuardado: inv?.email_error, ultimo: resultadoDe(p.resultadosCorreo, v.memberId, teamId) }) : null
          const aceptoEn = est === 'otro-equipo' ? textoAceptoEn(nombreDeEquipo(inv?.superseded_by ? p.equipoDeInvitacion?.[inv.superseded_by] : null)) : ''
          return (
            <div key={v.clave} className={ui.voluntario}>
              {prob && <span className={ui.correo}><ProblemaCorreo nombre={m?.nombre || v.nombre} problema={prob} reintentando={p.reintentandoId === v.memberId} onReintentar={() => p.reintentarCorreo(v.memberId, teamId)} /></span>}
              <button type="button" className={ui.masPersona} aria-label={`${T.accionesDe} ${v.nombre}`} onClick={() => onMasPersona({ memberId: v.memberId, nombre: v.nombre })}><Ellipsis size={18} aria-hidden="true" /></button>
              <span className={ui.voluntarioAv} aria-hidden="true">{v.iniciales}</span>
              <span className={ui.voluntarioNombre}>{v.nombre}</span>
              <span className={ui.posicion}>{v.posicion}</span>
              <span className={ui.estadoPersona}><span className={`${ui.punto} ${PUNTO[est]}`} aria-hidden="true" />{est === 'otro-equipo' ? aceptoEn : TEXTO_ESTADO[est]}</span>
              {bloqueados.has(v.memberId) && <span className={ui.bloqueo}>{T.bloqueoFecha}</span>}
            </div>
          )
        })}
        {vacantes.map(v => (
          <div key={v.posicionId} className={ui.vacante}>
            <span className={ui.vacanteCirculo} aria-hidden="true"><Plus size={22} /></span>
            <span className={ui.vacanteFalta}>{faltaPosicion(v.nombre, v.faltan)}</span>
            <span className={ui.vacanteSub}>{T.sinAsignar}</span>
          </div>
        ))}
      </div>

      {seFueron.length > 0 && (
        <div className={ui.seFueron} role="note">
          <p className={ui.seFueronT}>{T.aceptaronEnOtroEquipo}</p>
          {seFueron.map(v => {
            const m = miembro(v.memberId)
            return <p key={v.invitacion} className={ui.seFueronF}><b>{m ? `${m.nombre} ${m.apellido || ''}`.trim() : T.alguien}</b> · {textoAceptoEn(nombreDeEquipo(v.aceptoEnTeamId))}: {T.suLugarQuedoVacante}</p>
          })}
        </div>
      )}
      <MensajeConvocatoria aviso={p.aviso} onCerrar={p.onCerrarAviso} />
      {estado.nuevos > 0 && (
        <div className={ui.pie}>
          <button type="button" className={ui.boton} disabled={p.sending} onClick={() => onNotificar(teamId, estado.nuevos)}>{p.sending ? T.enviando : notificarNuevos(estado.nuevos)}</button>
        </div>
      )}
    </>
  )
}
