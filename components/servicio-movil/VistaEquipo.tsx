'use client'
// La pantalla de un equipo en el servicio (teléfono), SOLO presentación: la usan la del administrador (PantallaEquipo) y la del líder (components/lider-movil/EquipoDeServicio). Recibe ya armado lo que se ve y
// los permisos como parámetros: sin `onAbrirHerramienta` las herramientas se ven pero no se abren; sin `onAnadirHerramienta` no hay «Añadir»; sin `onAbrirPosicion` las tarjetas de posición no se tocan.
// `soloLectura` (un equipo que quien mira no puede cambiar) pone el candado; `tuEquipo`, la etiqueta azul. No sabe de datos ni de escrituras.
import type { ReactNode } from 'react'
import { Lock, Plus } from 'lucide-react'
import type { ToolType } from '@/lib/types'
import { TEXTOS_SERVICIO as T, faltan } from '@/lib/textos/servicio'
import { TEXTOS_LIDER as TL } from '@/lib/textos/servicioLider'
import { TeamMono, teamColorProps } from '../TeamColor'
import { IconoHerramienta } from './iconos'
import ui from './pantallas.module.css'

export type EstadoPersonaVista = 'confirmado' | 'rechazo' | 'otro-equipo' | 'pendiente'
const PUNTO: Record<EstadoPersonaVista, string> = { confirmado: ui.puntoOk, rechazo: ui.puntoNo, 'otro-equipo': ui.puntoOtro, pendiente: '' }

export interface PersonaVista { clave: string; iniciales: string; nombre: string; estado: EstadoPersonaVista; estadoTexto: string; bloqueo?: boolean; /** Lo que solo ve el administrador (p. ej. el aviso del correo). */ extra?: ReactNode }
export interface PosicionVista { id: string; nombre: string; asignadas: number; cupos: number; personas: PersonaVista[]; libres: number }
export interface HerramientaVista { clave: string; tipo: ToolType; nombre: string }

export interface VistaEquipoProps {
  nombre: string
  color: string | null
  /** «sábado 14 de noviembre · 10:00 – 14:00». */
  subtitulo: ReactNode
  /** «2 de 3 confirmados» o «Sin asignar». */
  resumen: string
  vacantes: number
  tuEquipo?: boolean
  soloLectura?: boolean
  herramientas: HerramientaVista[]
  onAbrirHerramienta?: (clave: string) => void
  onAnadirHerramienta?: () => void
  tituloVoluntarios: string
  /** El enlace junto al título de voluntarios (el líder: «Gestionar equipo»). */
  accionVoluntarios?: ReactNode
  ayudaPosiciones: string
  sinPosiciones: string
  posiciones: PosicionVista[]
  onAbrirPosicion?: (posicionId: string) => void
  /** Lo que va después de las posiciones (avisos, «Notificar», la nota de la convocatoria). */
  children?: ReactNode
}

export default function VistaEquipo(p: VistaEquipoProps) {
  return (
    <>
      <section className={`${ui.hero} ${ui.heroFranja}`} aria-label={p.nombre} {...teamColorProps(p.color)}>
        <div className={ui.heroEquipo}><TeamMono name={p.nombre} color={p.color} /><h1 className={ui.heroTit} style={{ fontSize: '1.5rem' }}>{p.nombre}</h1></div>
        <p className={ui.heroSub}>{p.subtitulo}</p>
        <div className={ui.chips} style={{ marginTop: '0.75rem' }}>
          {p.tuEquipo && <span className={ui.tuEquipo}>{TL.tuEquipo}</span>}
          {p.soloLectura && <span className={`${ui.chip} ${ui.chipLectura}`}><Lock size={12} aria-hidden="true" />{TL.soloLectura}</span>}
          <span className={ui.chip}>{p.resumen}</span>
          {p.vacantes > 0 && <span className={`${ui.chip} ${ui.chipFalta}`}>{faltan(p.vacantes)}</span>}
        </div>
      </section>

      <h2 className={ui.seccion}>{T.herramientasDelEquipo}</h2>
      {p.herramientas.length === 0 && !p.onAnadirHerramienta && <p className={ui.sinHerr}>{p.soloLectura ? TL.sinHerramientasAjeno : T.sinHerramientas}</p>}
      {p.herramientas.length === 0 && p.onAnadirHerramienta && <p className={ui.sinHerr}>{T.sinHerramientas}</p>}
      <div className={ui.fichasHerr}>
        {p.herramientas.map(t => p.onAbrirHerramienta
          ? <button key={t.clave} type="button" className={`${ui.fichaHerr} anc-bt anc-bt--s`} onClick={() => p.onAbrirHerramienta!(t.clave)}><IconoHerramienta tipo={t.tipo} className="anc-bt__ico" /><span className="anc-bt__txt">{t.nombre}</span></button>
          : <span key={t.clave} className={`${ui.fichaHerr} ${ui.fichaHerrQuieta} anc-bt anc-bt--s`}><IconoHerramienta tipo={t.tipo} className="anc-bt__ico" /><span className="anc-bt__txt">{t.nombre}</span></span>)}
        {p.onAnadirHerramienta && <button type="button" className={`${ui.fichaHerr} ${ui.fichaHerrAnadir} anc-bt anc-bt--s`} onClick={p.onAnadirHerramienta}><Plus className="anc-bt__ico" aria-hidden="true" /><span className="anc-bt__txt">{T.anadirHerramienta}</span></button>}
      </div>

      <div className={ui.cabSeccion}>
        <h2 className={ui.seccion}>{p.tituloVoluntarios}</h2>
        {p.accionVoluntarios}
      </div>
      <p className={ui.ayuda}>{p.ayudaPosiciones}</p>
      {p.posiciones.length === 0 ? <p className={ui.sinHerr}>{p.sinPosiciones}</p> : (
        <div className={ui.posiciones}>
          {p.posiciones.map(pos => (
            <div key={pos.id} className={`${ui.posCard} ${pos.asignadas === 0 ? ui.posVacia : ''}`}>
              {p.onAbrirPosicion && <button type="button" className={ui.posAbrir} onClick={() => p.onAbrirPosicion!(pos.id)} aria-label={`${pos.nombre}: ${pos.asignadas}/${pos.cupos}`} />}
              <div className={ui.posCab}><span className={ui.posNombre}>{pos.nombre}</span><span className={ui.posCuenta}>{pos.asignadas}/{pos.cupos}</span></div>
              {pos.personas.map(v => (
                <div key={v.clave} className={ui.posPersona}>
                  <span className={ui.posAv} aria-hidden="true">{v.iniciales}</span>
                  <span className={ui.posPersonaTxt}><span className={ui.posPersonaNombre}>{v.nombre}</span>{v.bloqueo && <span className={ui.bloqueo}>{T.bloqueoFecha}</span>}</span>
                  {v.extra}
                  <span className={`${ui.punto} ${PUNTO[v.estado]}`} role="img" aria-label={v.estadoTexto} />
                </div>
              ))}
              {pos.libres > 0 && (
                <div className={ui.posPersona}>
                  <span className={`${ui.posAv} ${ui.avatarVacio}`} aria-hidden="true" />
                  <span className={`${ui.posPersonaNombre} ${ui.vacanteFalta}`}>{faltan(pos.libres)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {p.children}
    </>
  )
}
