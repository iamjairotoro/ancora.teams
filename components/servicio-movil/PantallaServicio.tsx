'use client'
// La pantalla del servicio en teléfono (Servicio-C): título y horario (con el lápiz), la barra y los chips del SERVICIO entero (confirmados sobre asignados, posiciones sin cubrir), «Orden del servicio» y
// «Notificar a N nuevos», y una tarjeta por equipo. Sin porcentaje de ninguna persona. Los números salen de lib/admin/servicioMovil (regla compartida con el panel de escritorio).
import type { ReactNode } from 'react'
import { ChevronRight, Lock, Pencil, X } from 'lucide-react'
import type { ToolType } from '@/lib/types'
import type { Service } from '@/lib/types'
import type { EstadoEquipoServicio } from '@/lib/admin/estadoEquipoServicio'
import { avataresDeTarjeta, rangoDeHoras, voluntariosDeEquipo, type DatosServicio, type ResumenDeServicio, type SeccionEquipo } from '@/lib/admin/servicioMovil'
import { fechaLarga } from '@/lib/home/hoy'
import { confirmadosDe } from '@/lib/textos/home'
import { TEXTOS_SERVICIO as T, faltan, herramientasN, notificarNuevos, sinCubrirN } from '@/lib/textos/servicio'
import { TEXTOS_LIDER as TL } from '@/lib/textos/servicioLider'
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
  /** Lo que pasó al crear este servicio (plantillas por defecto): nota que se puede cerrar, bajo la tarjeta principal. */
  avisoCreacion?: string
  onCerrarAvisoCreacion?: () => void
}

/** La ficha de la fecha (hero): la usan la pantalla del servicio del administrador y la del líder. El lápiz del horario y los botones (`children`) solo salen si quien la usa los da: el líder no cambia el horario ni convoca. */
export function HeroServicio({ fecha, horas, confirmados, asignados, vacantes, porcentaje, estado, onEditarHorario, children }: {
  fecha: string; horas: string; confirmados: number; asignados: number; vacantes: number; porcentaje: number; estado: 'archivado' | 'en-vivo' | null; onEditarHorario?: () => void; children?: ReactNode
}) {
  return (
    <section className={ui.hero} aria-label={fechaLarga(fecha)}>
      <h1 className={ui.heroTit}>{fechaLarga(fecha)}</h1>
      <p className={ui.heroSub}>
        <span>{horas}</span>
        {onEditarHorario && <button type="button" className={ui.lapiz} onClick={onEditarHorario} aria-label={T.cambiarHorario}><Pencil size={16} aria-hidden="true" /></button>}
      </p>
      <div className={ui.barraProg} role="img" aria-label={confirmadosDe(confirmados, asignados)}><span style={{ width: `${porcentaje}%` }} /></div>
      <div className={ui.chips}>
        <span className={ui.chip}>{confirmadosDe(confirmados, asignados)}</span>
        {vacantes > 0 ? <span className={`${ui.chip} ${ui.chipFalta}`}>{sinCubrirN(vacantes)}</span> : asignados > 0 && <span className={`${ui.chip} ${ui.chipOk}`}>{T.todoCubierto}</span>}
        {estado && <span className={`${ui.chip} ${ui.chipEstado}`}>{estado === 'archivado' ? T.archivado : T.enVivo}</span>}
      </div>
      {children}
    </section>
  )
}

export interface DatosTarjetaEquipo {
  teamId: string; nombre: string; color: string | null
  /** «2 de 3 confirmados» o «Sin asignar». */
  subtitulo: string
  /** Iniciales de quienes están (y `null` por cada vacante), ya recortadas a las que caben. */
  avatares: { items: (string | null)[]; mas: number }
  vacantes: number
  /** Los tipos de herramienta del equipo (solo ícono y cuántas). */
  herramientas: ToolType[]
  /** El equipo de quien mira (líder): lleva la etiqueta azul «Tu equipo». */
  tuEquipo?: boolean
  /** Un equipo que quien mira ve pero no cambia: candado discreto con «Solo lectura» para lectores de pantalla. */
  soloLectura?: boolean
}

/** La rejilla de equipos del servicio (una tarjeta por equipo): la misma del administrador y del líder. */
export function RejillaEquipos({ equipos, onAbrir }: { equipos: DatosTarjetaEquipo[]; onAbrir: (teamId: string) => void }) {
  return (
    <div className={ui.rejilla}>
      {equipos.map(e => (
        <button key={e.teamId} type="button" className={ui.tarjetaEquipo} onClick={() => onAbrir(e.teamId)} aria-label={e.tuEquipo ? `${e.nombre}. ${TL.tuEquipo}` : e.soloLectura ? `${e.nombre}. ${TL.soloLectura}` : undefined} {...teamColorProps(e.color)}>
          <span className={ui.tarjetaCab}>
            <TeamMono name={e.nombre} color={e.color} />
            <span className={ui.tarjetaTxt}><span className={ui.tarjetaNombre}>{e.nombre}</span><span className={ui.tarjetaSub}>{e.subtitulo}</span></span>
          </span>
          <span className={ui.avatares} aria-hidden="true">
            {e.avatares.items.map((x, i) => <span key={i} className={`${ui.avatar} ${x === null ? ui.avatarVacio : ''}`}>{x}</span>)}
            {e.avatares.mas > 0 && <span className={ui.avatarMas}>+{e.avatares.mas}</span>}
          </span>
          {(e.tuEquipo || e.vacantes > 0) && (
            <span className={ui.chips}>
              {e.tuEquipo && <span className={ui.tuEquipo}>{TL.tuEquipo}</span>}
              {e.vacantes > 0 && <span className={`${ui.chip} ${ui.chipFalta}`}>{faltan(e.vacantes)}</span>}
            </span>
          )}
          <span className={ui.tarjetaPie}>
            <span className={ui.pieIconos}>{e.herramientas.slice(0, 4).map((t, i) => <IconoHerramienta key={i} tipo={t} size={16} />)}</span>
            <span className={ui.pieTxt}>{herramientasN(e.herramientas.length)}</span>
            {e.soloLectura && <Lock size={14} className={ui.candado} aria-hidden="true" />}
            <ChevronRight size={16} className={ui.pieChev} aria-hidden="true" />
          </span>
        </button>
      ))}
    </div>
  )
}

export default function PantallaServicio(p: PantallaServicioProps) {
  const { resumen: r } = p
  const tarjetas: DatosTarjetaEquipo[] = p.secciones.flatMap(s => {
    const e = p.estados.get(s.teamId)
    if (!e) return []
    const { voluntarios } = voluntariosDeEquipo(s, p.datos, p.memberNombre)
    return [{
      teamId: s.teamId, nombre: s.nombre, color: s.color, subtitulo: e.asignados > 0 ? confirmadosDe(e.porAsignado.confirmados, e.asignados) : T.sinAsignar,
      avatares: avataresDeTarjeta(voluntarios.map(v => v.iniciales), e.vacantes), vacantes: e.vacantes, herramientas: s.tools.filter(t => t.tool_type !== 'file_upload').map(t => t.tool_type),
    }]
  })
  return (
    <>
      <HeroServicio fecha={p.servicio.fecha} horas={rangoDeHoras(p.servicio.hora_inicio, p.servicio.hora_fin)} confirmados={r.confirmados} asignados={r.asignados} vacantes={r.vacantes} porcentaje={r.porcentaje} estado={p.estado} onEditarHorario={p.onEditarHorario}>
        {(p.hayOrden || p.alcance) && (
          <div className={ui.botones}>
            {p.hayOrden && <button type="button" className={ui.boton} onClick={p.onAbrirOrden}>{T.ordenDelServicio}</button>}
            {p.alcance && <button type="button" className={`${ui.boton} ${ui.botonPrincipal}`} disabled={p.enviando} onClick={() => p.onNotificar(p.alcance!.teamId, p.alcance!.nuevos)}>{p.enviando ? T.enviando : notificarNuevos(p.alcance.nuevos)}</button>}
          </div>
        )}
      </HeroServicio>
      <MensajeConvocatoria aviso={p.aviso} onCerrar={p.onCerrarAviso} />
      {p.avisoCreacion && (
        <div className={ui.nota} role="status">
          <div className={ui.notaTxt}><span className={ui.notaTit}>{T.alCrearElServicio}</span><span>{p.avisoCreacion}</span></div>
          {p.onCerrarAvisoCreacion && <button type="button" className={ui.notaCerrar} onClick={p.onCerrarAvisoCreacion} aria-label={T.cerrarAviso}><X size={18} aria-hidden="true" /></button>}
        </div>
      )}

      <h2 className={ui.seccion}>{T.equipos}</h2>
      {p.secciones.length === 0 ? (
        <div className={ui.vacio}><p className={ui.vacioT}>{T.sinEquipos}</p><p className={ui.vacioA}>{T.sinEquiposAyuda}</p><button type="button" className={ui.enlace} onClick={p.onIrAPersonas}>{T.irAPersonas}</button></div>
      ) : (
        <>
          <p className={ui.ayuda}>{T.equiposAyuda}</p>
          <RejillaEquipos equipos={tarjetas} onAbrir={p.onAbrirEquipo} />
        </>
      )}
    </>
  )
}
