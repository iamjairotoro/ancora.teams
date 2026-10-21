'use client'
// La pantalla de un equipo en el servicio, en teléfono (Equipo-F): su encabezado (confirmados sobre asignados y cuántas posiciones faltan), las herramientas como fichas de ícono y nombre (no se lee nada nuevo
// de ninguna tabla) y UNA TARJETA POR POSICIÓN con quién la ocupa y cuántos cupos faltan; tocarla abre la hoja de posición (Equipo-G/H), donde se asigna y se cambian los cupos. Conserva lo que el panel de
// escritorio ya muestra: el «!» del correo con «Reintentar correo», «Su rol cambió», el bloqueo de la fecha, «Aceptó en {equipo}» y «Aceptaron en otro equipo». El estado de cada persona es un punto de color
// CON etiqueta de lectura (nunca solo el color). Quién declinó solo lo ve quien puede. «Notificar a N nuevos» es de ESTE equipo.
import { Plus } from 'lucide-react'
import type { EstadoEquipoServicio } from '@/lib/admin/estadoEquipoServicio'
import { claveDeHerramienta, cuposLlenos, herramientasDeTelefono, posicionesDeEquipo, rangoDeHoras, type FichaDePersona, type SeccionEquipo } from '@/lib/admin/servicioMovil'
import { textoAceptoEn } from '@/lib/convocatoriaEstado'
import { vacantesPorConflicto } from '@/lib/vacantesPorConflicto'
import { problemaDeCorreo, resultadoDe } from '@/lib/problemasCorreo'
import { fechaLarga } from '@/lib/home/hoy'
import { confirmadosDe } from '@/lib/textos/home'
import { TEXTOS_SERVICIO as T, faltan, nombreDeHerramienta, notificarNuevos, voluntariosN } from '@/lib/textos/servicio'
import { TeamMono, teamColorProps } from '../TeamColor'
import ProblemaCorreo from '../ProblemaCorreo'
import MensajeConvocatoria from '../MensajeConvocatoria'
import type { ServicioAdminProps } from './tipos'
import { IconoHerramienta } from './iconos'
import ui from './pantallas.module.css'

const PUNTO: Record<string, string> = { confirmado: ui.puntoOk, rechazo: ui.puntoNo, 'otro-equipo': ui.puntoOtro }

export interface PantallaEquipoProps {
  p: ServicioAdminProps
  seccion: SeccionEquipo
  estado: EstadoEquipoServicio
  /** memberId → su ficha en este equipo (estado, texto y bloqueo). */
  fichaDe: (memberId: string) => FichaDePersona
  onAbrirHerramienta: (clave: string) => void
  onAnadirHerramienta: () => void
  onNotificar: (teamId: string, nuevos: number) => void
  /** Quien puede asignar en este equipo (administrador, o el líder de ESTE equipo): sin permiso la tarjeta no abre la hoja. */
  puedeAsignar: boolean
  onAbrirPosicion: (posicionId: string) => void
}

export default function PantallaEquipo({ p, seccion, estado, fichaDe, onAbrirHerramienta, onAnadirHerramienta, onNotificar, puedeAsignar, onAbrirPosicion }: PantallaEquipoProps) {
  const servicio = p.selectedService!, teamId = seccion.teamId
  const miembro = (id: string) => p.members.find(m => m.id === id)
  const posiciones = posicionesDeEquipo(seccion, { bandaItems: p.bandaItems, getSlotsNeeded: p.getSlotsNeeded }, miembro), { llenos, total } = cuposLlenos(posiciones)
  const herramientas = herramientasDeTelefono(seccion.tools)
  const nombreDeEquipo = (id?: string | null) => p.equipoSections.find(s => s.teamId === id)?.nombre

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
      <div className={ui.fichasHerr}>
        {herramientas.map(t => (
          <button key={t.id} type="button" className={ui.fichaHerr} onClick={() => onAbrirHerramienta(claveDeHerramienta(t))}><IconoHerramienta tipo={t.tool_type} />{nombreDeHerramienta(t.tool_type)}</button>
        ))}
        <button type="button" className={`${ui.fichaHerr} ${ui.fichaHerrAnadir}`} onClick={onAnadirHerramienta}><Plus size={18} aria-hidden="true" />{T.anadirHerramienta}</button>
      </div>

      <h2 className={ui.seccion}>{voluntariosN(llenos, total)}</h2>
      <p className={ui.ayuda}>{T.ayudaPosiciones}</p>
      {posiciones.length === 0 ? <p className={ui.sinHerr}>{T.sinPosiciones}</p> : (
        <div className={ui.posiciones}>
          {posiciones.map(pos => (
            <div key={pos.posicionId} className={`${ui.posCard} ${pos.asignadas === 0 ? ui.posVacia : ''}`}>
              {puedeAsignar && <button type="button" className={ui.posAbrir} onClick={() => onAbrirPosicion(pos.posicionId)} aria-label={`${pos.nombre}: ${pos.asignadas}/${pos.cupos}`} />}
              <div className={ui.posCab}><span className={ui.posNombre}>{pos.nombre}</span><span className={ui.posCuenta}>{pos.asignadas}/{pos.cupos}</span></div>
              {pos.personas.map(v => {
                const m = miembro(v.memberId), ficha = fichaDe(v.memberId), inv = p.invitations.find(i => i.member_id === v.memberId && i.team_id === teamId)
                const prob = ficha.estado !== 'otro-equipo' ? problemaDeCorreo({ email: m?.email, estadoGuardado: inv?.email_status, errorGuardado: inv?.email_error, ultimo: resultadoDe(p.resultadosCorreo, v.memberId, teamId) }) : null
                return (
                  <div key={v.clave} className={ui.posPersona}>
                    <span className={ui.posAv} aria-hidden="true">{v.iniciales}</span>
                    <span className={ui.posPersonaTxt}><span className={ui.posPersonaNombre}>{v.nombre}</span>{ficha.bloqueo && <span className={ui.bloqueo}>{T.bloqueoFecha}</span>}</span>
                    {prob && <span className={ui.posCorreo}><ProblemaCorreo nombre={m?.nombre || v.nombre} problema={prob} reintentando={p.reintentandoId === v.memberId} onReintentar={() => p.reintentarCorreo(v.memberId, teamId)} /></span>}
                    <span className={`${ui.punto} ${PUNTO[ficha.estado] ?? ''}`} role="img" aria-label={ficha.texto} />
                  </div>
                )
              })}
              {pos.libres.length > 0 && (
                <div className={ui.posPersona}>
                  <span className={`${ui.posAv} ${ui.avatarVacio}`} aria-hidden="true" />
                  <span className={`${ui.posPersonaNombre} ${ui.vacanteFalta}`}>{faltan(pos.libres.length)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
