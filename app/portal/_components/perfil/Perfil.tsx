'use client'
// La pantalla Perfil del portal (punto 54, commit 1). Referencia: docs/mockup-musico-v2.html (Perfil). Es un componente suelto, no un parche dentro de PortalApp: recibe lo que el
// servidor ya resolvió (equipos y posiciones, la fila «Administración») y las acciones. Orden: foto y nombre · Mis equipos y posiciones · Apariencia · Tipografía de la letra y
// Notificaciones · Mis datos · Administración (solo con rol) · Cerrar sesión.
// «Mis instrumentos» ya no está (la columna no se toca). «Mi disponibilidad» es TRANSITORIA: se retira en el commit 4, cuando Disponibilidad pase a la pestaña de Servicios.
import { useId, useState } from 'react'
import { Bell, CalendarOff, ChevronRight, ShieldCheck, Type } from 'lucide-react'
import AvatarUpload from '@/components/AvatarUpload'
import { supabase } from '@/lib/supabase'
import { portalFetch } from '@/lib/portal/portalFetch'
import type { ThemePref } from '@/lib/useDarkMode'
import AparienciaControl from '../AparienciaControl'
import PanelTipografia from '../tipografia/PanelTipografia'
import { useTipografiaLetra } from '../tipografia/useTipografiaLetra'
import EquiposYPosiciones from './EquiposYPosiciones'
import MisDatos from './MisDatos'
import type { Administracion, ControlPush, DatosPersona, EquipoPerfil } from './tipos'
import ui from './perfil.module.css'

function FilaNotificaciones({ push }: { push: ControlPush }) {
  const t = useId(), d = useId()
  const Icono = <Bell size={18} aria-hidden="true" />
  const info = (texto: React.ReactNode) => (
    <>
      <div className={`${ui.fila} ${ui.soloLectura}`}>{Icono}<span className={ui.txt}><span className={ui.t}>Notificaciones</span><span className={ui.s}>Convocatorias y recordatorios</span></span></div>
      <p className={ui.nota}>{texto}</p>
    </>
  )
  if (!push.soportado) return info('Este navegador no admite notificaciones.')
  if (push.sinClave) return info('Aún no están habilitadas para este equipo — falta un ajuste del administrador en el servidor.')
  if (push.esIOS && !push.instalada) return info(<>Para recibir notificaciones en iPhone, agrega esta app a tu pantalla de inicio: toca <b>Compartir</b> (el cuadrado con la flecha) en Safari y luego <b>«Agregar a pantalla de inicio»</b>.</>)
  return (
    <>
      <button type="button" role="switch" aria-checked={push.activadas} aria-labelledby={t} aria-describedby={d} className={ui.fila} disabled={push.cargando} onClick={push.alternar}>
        {Icono}
        <span className={ui.txt}><span className={ui.t} id={t}>Notificaciones</span><span className={ui.s} id={d}>Convocatorias y recordatorios</span></span>
        <span className={ui.sw}>{push.activadas ? 'Activadas' : 'Desactivadas'}<span className={ui.pista} aria-hidden="true"><span className={ui.perilla} /></span></span>
      </button>
      {push.error && <p className={ui.err} role="alert">{push.error}</p>}
    </>
  )
}

export default function Perfil({ token, esSesion, persona, equipos, administracion, themePref, onThemePref, push, bloqueadas, onGuardado, onFoto, onAbrirDisponibilidad }: {
  token: string | null
  esSesion: boolean
  persona: DatosPersona
  equipos: EquipoPerfil[]
  administracion: Administracion | null
  themePref: ThemePref
  onThemePref: (p: ThemePref) => void
  push: ControlPush
  /** Cuántas fechas tiene bloqueadas (solo para la fila transitoria «Mi disponibilidad»). */
  bloqueadas: number
  onGuardado: (cambios: { nombre: string; apellido: string; telefono: string; fecha_nacimiento: string }) => void
  onFoto: (url: string) => void
  onAbrirDisponibilidad: () => void
}) {
  const { prefs, elegir, errPrefs } = useTipografiaLetra(token)
  const [tipoAbierta, setTipoAbierta] = useState(false)
  const idPanel = useId()
  const nombreCompleto = `${persona.nombre || ''} ${persona.apellido || ''}`.trim()

  async function cerrarSesion() {
    // Cierra la sesión del enlace de acceso (cookie + fila) y también la de Google.
    await portalFetch(token, '/api/portal/salir', { method: 'POST' }).catch(() => {})
    await supabase.auth.signOut()
    window.location.href = esSesion ? '/portal' : '/login'
  }

  return (
    <div className={ui.perfil}>
      <div className={ui.cab}>
        <AvatarUpload token={token} currentUrl={persona.avatar_url || undefined} nombre={persona.nombre || ''} apellido={persona.apellido || undefined} size="lg" onUpdate={onFoto} />
        <div className={ui.quien}>
          <h1 className={ui.nombre}>{nombreCompleto || 'Mi perfil'}</h1>
          {persona.email && <p className={ui.correo}>{persona.email}</p>}
        </div>
      </div>

      <EquiposYPosiciones equipos={equipos} />

      <AparienciaControl pref={themePref} onChange={onThemePref} />

      <section className={ui.tarjeta} aria-label="Tipografía y notificaciones">
        <button type="button" className={ui.fila} aria-expanded={tipoAbierta} aria-controls={idPanel} onClick={() => setTipoAbierta(a => !a)}>
          <Type size={18} aria-hidden="true" />
          <span className={ui.txt}><span className={ui.t}>Tipografía de la letra</span><span className={ui.s}>Fuente y tamaño</span></span>
          <ChevronRight className={ui.chev} aria-hidden="true" />
        </button>
        {tipoAbierta && <div className={ui.panelTipo} id={idPanel}><PanelTipografia prefs={prefs} elegir={elegir} errPrefs={errPrefs} conMuestra /></div>}
        <FilaNotificaciones push={push} />
      </section>

      <MisDatos persona={persona} esSesion={esSesion} token={token} onGuardado={onGuardado} />

      {/* TRANSITORIA (se retira en el commit 4 del punto 54): hasta que exista la pestaña Disponibilidad, esta es la entrada al calendario. */}
      <section className={ui.tarjeta} aria-label="Disponibilidad">
        <button type="button" className={ui.fila} onClick={onAbrirDisponibilidad}>
          <CalendarOff size={18} aria-hidden="true" />
          <span className={ui.txt}><span className={ui.t}>Mi disponibilidad</span><span className={ui.s}>{bloqueadas === 0 ? 'Sin fechas bloqueadas' : `${bloqueadas} fecha${bloqueadas !== 1 ? 's' : ''} bloqueada${bloqueadas !== 1 ? 's' : ''}`}</span></span>
          <ChevronRight className={ui.chev} aria-hidden="true" />
        </button>
      </section>

      {administracion && (
        <section className={ui.tarjeta} aria-label="Administración">
          <a className={ui.fila} href={administracion.destino}>
            <ShieldCheck size={18} aria-hidden="true" />
            <span className={ui.txt}><span className={ui.t}>Administración</span><span className={ui.s}>{administracion.rol === 'admin' ? 'Abrir el panel de administración' : 'Abrir el inicio de líderes'}</span></span>
            <ChevronRight className={ui.chev} aria-hidden="true" />
          </a>
        </section>
      )}

      <button type="button" className={ui.salir} onClick={cerrarSesion}>Cerrar sesión</button>
    </div>
  )
}
