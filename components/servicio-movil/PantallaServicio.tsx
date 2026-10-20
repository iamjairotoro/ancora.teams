'use client'
// La pantalla del servicio en teléfono (Servicio-C): título y horario (con el lápiz), la barra y los chips del SERVICIO entero (confirmados sobre asignados, posiciones sin cubrir), «Orden del servicio» y
// «Notificar a N nuevos», y una tarjeta por equipo. Sin porcentaje de ninguna persona. Los números salen de lib/admin/servicioMovil (regla compartida con el panel de escritorio).
import { ChevronRight, Pencil } from 'lucide-react'
import type { Service } from '@/lib/types'
import type { EstadoEquipoServicio } from '@/lib/admin/estadoEquipoServicio'
import { avataresDeTarjeta, rangoDeHoras, voluntariosDeEquipo, type DatosServicio, type ResumenDeServicio, type SeccionEquipo } from '@/lib/admin/servicioMovil'
import { fechaLarga } from '@/lib/home/hoy'
import { confirmadosDe } from '@/lib/textos/home'
import { TEXTOS_SERVICIO as T, faltan, herramientasN, notificarNuevos, sinCubrirN } from '@/lib/textos/servicio'
import { TeamMono, teamColorProps } from '../TeamColor'
import MensajeConvocatoria from '../MensajeConvocatoria'
import type { AvisoConvocatoria } from '@/lib/convocatoriaTypes'
import { IconoHerramienta } from './iconos'
import ui from './pantallas.module.css'

export interface PantallaServicioProps {
  servicio: Service
  estado: 'archivado' | 'en-vivo' | null
  secciones: SeccionEquipo[]
  estados: Map<string, EstadoEquipoServicio>
  resumen: ResumenDeServicio
  datos: DatosServicio
  memberNombre: (id: string) => { nombre: string; apellido?: string } | undefined
  hayOrden: boolean
  alcance: { teamId: string | null; nuevos: number } | null
  enviando: boolean
  aviso: AvisoConvocatoria | null
  onCerrarAviso: () => void
  onNotificar: (teamId: string | null, nuevos: number) => void
  onAbrirOrden: () => void
  onAbrirEquipo: (teamId: string) => void
  onEditarHorario: () => void
  onIrAPersonas: () => void
}

export default function PantallaServicio(p: PantallaServicioProps) {
  const { resumen: r } = p
  return (
    <>
      <section className={ui.hero} aria-label={fechaLarga(p.servicio.fecha)}>
        <h1 className={ui.heroTit}>{fechaLarga(p.servicio.fecha)}</h1>
        <p className={ui.heroSub}>
          <span>{rangoDeHoras(p.servicio.hora_inicio, p.servicio.hora_fin)}</span>
          <button type="button" className={ui.lapiz} onClick={p.onEditarHorario} aria-label={T.cambiarHorario}><Pencil size={16} aria-hidden="true" /></button>
        </p>
        <div className={ui.barraProg} role="img" aria-label={confirmadosDe(r.confirmados, r.asignados)}><span style={{ width: `${r.porcentaje}%` }} /></div>
        <div className={ui.chips}>
          <span className={ui.chip}>{confirmadosDe(r.confirmados, r.asignados)}</span>
          {r.vacantes > 0 ? <span className={`${ui.chip} ${ui.chipFalta}`}>{sinCubrirN(r.vacantes)}</span> : r.asignados > 0 && <span className={`${ui.chip} ${ui.chipOk}`}>{T.todoCubierto}</span>}
          {p.estado && <span className={ui.chip}>{p.estado === 'archivado' ? T.archivado : T.enVivo}</span>}
        </div>
        {(p.hayOrden || p.alcance) && (
          <div className={ui.botones}>
            {p.hayOrden && <button type="button" className={ui.boton} onClick={p.onAbrirOrden}>{T.ordenDelServicio}</button>}
            {p.alcance && <button type="button" className={`${ui.boton} ${ui.botonPrincipal}`} disabled={p.enviando} onClick={() => p.onNotificar(p.alcance!.teamId, p.alcance!.nuevos)}>{p.enviando ? T.enviando : notificarNuevos(p.alcance.nuevos)}</button>}
          </div>
        )}
      </section>
      <MensajeConvocatoria aviso={p.aviso} onCerrar={p.onCerrarAviso} />

      <h2 className={ui.seccion}>{T.equipos}</h2>
      {p.secciones.length === 0 ? (
        <div className={ui.vacio}><p className={ui.vacioT}>{T.sinEquipos}</p><p className={ui.vacioA}>{T.sinEquiposAyuda}</p><button type="button" className={ui.enlace} onClick={p.onIrAPersonas}>{T.irAPersonas}</button></div>
      ) : (
        <>
          <p className={ui.ayuda}>{T.equiposAyuda}</p>
          <div className={ui.rejilla}>
            {p.secciones.map(s => {
              const e = p.estados.get(s.teamId)
              if (!e) return null
              const { voluntarios } = voluntariosDeEquipo(s, p.datos, p.memberNombre), av = avataresDeTarjeta(voluntarios.map(v => v.iniciales), e.vacantes)
              const herramientas = s.tools.filter(t => t.tool_type !== 'file_upload')
              return (
                <button key={s.teamId} type="button" className={ui.tarjetaEquipo} onClick={() => p.onAbrirEquipo(s.teamId)} {...teamColorProps(s.color)}>
                  <span className={ui.tarjetaCab}>
                    <TeamMono name={s.nombre} color={s.color} />
                    <span className={ui.tarjetaTxt}><span className={ui.tarjetaNombre}>{s.nombre}</span><span className={ui.tarjetaSub}>{e.asignados > 0 ? confirmadosDe(e.porAsignado.confirmados, e.asignados) : T.sinAsignar}</span></span>
                  </span>
                  <span className={ui.avatares} aria-hidden="true">
                    {av.items.map((x, i) => <span key={i} className={`${ui.avatar} ${x === null ? ui.avatarVacio : ''}`}>{x}</span>)}
                    {av.mas > 0 && <span className={ui.avatarMas}>+{av.mas}</span>}
                  </span>
                  {e.vacantes > 0 && <span className={ui.chips}><span className={`${ui.chip} ${ui.chipFalta}`}>{faltan(e.vacantes)}</span></span>}
                  <span className={ui.tarjetaPie}>
                    <span className={ui.pieIconos}>{herramientas.slice(0, 4).map(t => <IconoHerramienta key={t.id} tipo={t.tool_type} size={16} />)}</span>
                    <span className={ui.pieTxt}>{herramientasN(herramientas.length)}</span>
                    <ChevronRight size={16} className={ui.pieChev} aria-hidden="true" />
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
