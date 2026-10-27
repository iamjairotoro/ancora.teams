'use client'
// La pantalla «Admin» de la administración en teléfono (Admin-Menu-A): el último ítem del menú inferior, con el estilo del Perfil del portal. Título «Admin», botón redondo de apariencia (Automático, Claro, Oscuro), tarjeta de la
// organización, la sección «Gestión» con sus filas (Calendario, Chats, Admins solo para el propietario, Equipos, Historial) y «Cerrar sesión» al final. Solo la ven los administradores (a /admin solo entran ellos); un líder no la tiene.
// Solo dibuja y reenvía: qué filas hay y a dónde llevan lo decide lib/admin/menuMovil.ts.
import { CalendarDays, ChevronRight, History, LogOut, MessageCircle, ShieldCheck, Users } from 'lucide-react'
import BotonApariencia from '@/app/portal/_components/perfil/BotonApariencia'
import type { ThemePref } from '@/lib/useDarkMode'
import { filasDeAdmin, inicialesDeOrg, type DestinoAdmin } from '@/lib/admin/menuMovil'
import { TEXTOS_ADMIN_MOVIL as T } from '@/lib/textos/adminMovil'
import ui from './pantalla-admin.module.css'

const ICONO = { disponibilidad: CalendarDays, chats: MessageCircle, admins: ShieldCheck, equipos: Users, historial: History } as const

export default function PantallaAdmin({ nombreOrg, esOwner, themePref, onThemePref, onIr, onSignOut }: {
  nombreOrg: string
  esOwner: boolean
  themePref: ThemePref
  onThemePref: (p: ThemePref) => void
  onIr: (destino: DestinoAdmin) => void
  onSignOut: () => void
}) {
  return (
    <div className={ui.pantalla}>
      <div className={ui.cabecera}><h1 className={ui.titulo}>{T.titulo}</h1><BotonApariencia pref={themePref} onChange={onThemePref} /></div>
      <div className={ui.org}>
        <span className={ui.ini} aria-hidden="true">{inicialesDeOrg(nombreOrg)}</span>
        <div className={ui.quien}><p className={ui.nombre}>{nombreOrg}</p><p className={ui.sub}>{esOwner ? T.rolPropietario : T.rolAdmin}</p></div>
      </div>
      <section aria-labelledby="admin-gestion">
        <h2 className={ui.seccion} id="admin-gestion">{T.gestion}</h2>
        <div className={ui.lista}>
          {filasDeAdmin({ esOwner }).map(f => {
            const Icono = ICONO[f.key]
            return (
              <button key={f.key} type="button" className={ui.fila} onClick={() => onIr(f.destino)}>
                <span className={ui.ficono} aria-hidden="true"><Icono size={18} strokeWidth={1.75} /></span>
                <span className={ui.ftxt}><span className={ui.ft}>{f.label}</span><span className={ui.fd}>{f.detalle}</span></span>
                <ChevronRight size={16} className={ui.chev} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </section>
      <div className={ui.lista}>
        <button type="button" className={`${ui.fila} ${ui.salir}`} onClick={onSignOut}>
          <LogOut size={20} strokeWidth={1.75} aria-hidden="true" /><span className={ui.ftxt}><span className={ui.ft}>{T.cerrarSesion}</span></span>
        </button>
      </div>
    </div>
  )
}
