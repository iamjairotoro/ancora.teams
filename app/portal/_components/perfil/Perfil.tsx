'use client'
// La pantalla Perfil del portal (punto 54, commit 1; rediseño de Claudia). Referencia: docs/mockup-musico-v2.html (Perfil). Es un componente suelto, no un parche dentro de PortalApp: recibe lo que el
// servidor ya resolvió (equipos, la fila «Administración») y las acciones. Orden: título «Perfil» · tarjeta de la persona (foto de 60 px con la cámara, nombre y correo) · Mis equipos (solo el nombre,
// tarjetas de alto fijo en dos columnas) · Apariencia (selector segmentado) · Cuenta («Mis datos» y, solo con rol, «Administración») · bloque final sin título (Notificaciones y Cerrar sesión).
// Ya NO están: la tipografía de la letra (vive solo en el «Aa» de cada canción), la lista de posiciones, «Mis instrumentos» ni la fila transitoria «Mi disponibilidad» (su lugar es Servicios, commit 4).
import { useId, useRef, useState } from 'react'
import { Bell, ChevronRight, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { portalFetch } from '@/lib/portal/portalFetch'
import type { ThemePref } from '@/lib/useDarkMode'
import AparienciaControl from '../AparienciaControl'
import FotoPerfil from './FotoPerfil'
import MisDatos from './MisDatos'
import MisEquipos from './MisEquipos'
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

export default function Perfil({ token, esSesion, persona, equipos, administracion, themePref, onThemePref, push, onGuardado, onFoto }: {
  token: string | null
  esSesion: boolean
  persona: DatosPersona
  equipos: EquipoPerfil[]
  administracion: Administracion | null
  themePref: ThemePref
  onThemePref: (p: ThemePref) => void
  push: ControlPush
  onGuardado: (cambios: { nombre: string; apellido: string; telefono: string; fecha_nacimiento: string }) => void
  onFoto: (url: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [errorFoto, setErrorFoto] = useState<string | null>(null)
  const filaDatos = useRef<HTMLButtonElement>(null)
  const idDatos = useId()
  const nombreCompleto = `${persona.nombre || ''} ${persona.apellido || ''}`.trim()

  async function cerrarSesion() {
    // Cierra la sesión del enlace de acceso (cookie + fila) y también la de Google.
    await portalFetch(token, '/api/portal/salir', { method: 'POST' }).catch(() => {})
    await supabase.auth.signOut()
    window.location.href = esSesion ? '/portal' : '/login'
  }

  return (
    <div className={ui.perfil}>
      <h1 className={ui.titulo}>Perfil</h1>

      <section className={`${ui.tarjeta} ${ui.persona}`} aria-label="Tu perfil">
        <FotoPerfil token={token} url={persona.avatar_url} nombre={persona.nombre || ''} apellido={persona.apellido} onFoto={onFoto} onError={setErrorFoto} />
        <div className={ui.quien}>
          <p className={ui.nombre}>{nombreCompleto || 'Sin nombre'}</p>
          {persona.email && <p className={ui.correo}>{persona.email}</p>}
        </div>
      </section>
      {errorFoto && <p className={ui.err} role="alert" style={{ marginTop: -14, padding: '0 4px' }}>{errorFoto}</p>}

      <MisEquipos equipos={equipos} />

      <AparienciaControl pref={themePref} onChange={onThemePref} />

      <section aria-labelledby="perfil-cuenta">
        <h2 className={ui.seccion} id="perfil-cuenta">Cuenta</h2>
        <div className={ui.tarjeta}>
          <button type="button" ref={filaDatos} className={ui.fila} aria-expanded={editando} aria-controls={idDatos}
            onClick={() => { setEditando(e => !e); setGuardado(false) }}>
            <span className={ui.txt}><span className={ui.t}>Mis datos</span><span className={ui.s}>Teléfono, nacimiento</span></span>
            <ChevronRight className={ui.chev} aria-hidden="true" />
          </button>
          {guardado && !editando && <p className={ui.guardado} role="status">Datos guardados.</p>}
          {editando && (
            <MisDatos id={idDatos} persona={persona} esSesion={esSesion} token={token} onGuardado={onGuardado}
              onCerrar={g => { setEditando(false); setGuardado(g); filaDatos.current?.focus() }} />
          )}
          {administracion && (
            <a className={ui.fila} href={administracion.destino}>
              <span className={ui.txt}><span className={ui.t}>Administración</span><span className={ui.s}>{administracion.rol === 'admin' ? 'Abrir el panel de administración' : 'Abrir el inicio de líderes'}</span></span>
              <ChevronRight className={ui.chev} aria-hidden="true" />
            </a>
          )}
        </div>
      </section>

      <div className={ui.final}>
        <div className={ui.tarjeta}><FilaNotificaciones push={push} /></div>
        <div className={ui.tarjeta}>
          <button type="button" className={`${ui.fila} ${ui.centrada}`} onClick={cerrarSesion}><LogOut size={18} aria-hidden="true" />Cerrar sesión</button>
        </div>
      </div>
    </div>
  )
}
