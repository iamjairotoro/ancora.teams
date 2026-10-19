'use client'
/* ════════════════════════════════════════════════════════════════════════
   PersonasPanel.tsx — «Personas» (con «Admins» solo para el owner) y, dentro de ella, la gestión de equipos.

   «Equipos» ya NO es una pestaña ni un ítem del menú: los equipos se ven como bloques desplegables dentro de Personas (vista «Por equipo», Personas · A; en escritorio, «Lista» por defecto) y se
   administran en la pantalla «Gestionar equipo(s)» — que es TeamsAdminPanel tal cual, sin tocar su contenido — a la que se llega desde «Gestionar equipos» (cabecera), «Gestionar equipo» (cada bloque),
   el «+ → Equipo» o el aviso de alta parcial. Se vuelve con «‹ Personas». La pantalla de gestión vive en la URL (?gestion=equipos|equipo&team=…); el enlace viejo `?tab=equipos` sigue funcionando
   (lib/admin/urlPestana.ts lo convierte).

   El «+» de la cabecera abre «Persona / Equipo» (hoja en teléfono, desplegable en escritorio); en Admins es un solo «+ Admin». El alta de persona y de equipo son los de cada panel (registrados con
   onRequestNew): ningún formulario ni lógica de alta se duplica acá.

   Admins es la segunda pestaña y la ve SOLO el owner (canSeeAdmins): para cualquier otro no se renderiza ni la pestaña ni el panel, y un activeTab='admins' que le llegue a un no-owner cae, en
   silencio, en Personas.
   ════════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, SlidersHorizontal } from 'lucide-react'
import type { Member } from '@/lib/types'
import TeamPanel from './TeamPanel'
import TeamsAdminPanel from './TeamsAdminPanel'
import AdminsPanel from './AdminsPanel'
import BotonNuevo from './personas/BotonNuevo'
import Segmentado from '@/app/portal/_components/segmentado/Segmentado'
import { PersonNotice, type MembersChangedInfo, type PartialTeamFailure } from './AddPersonDialog'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { urlConGestion, type Gestion } from '@/lib/admin/urlPestana'
import styles from './ui.module.css'
import panel from './personas/personas-panel.module.css'

export type PersonasTab = 'personas' | 'admins'

interface Props {
  members: Member[]
  onRefreshMembers: () => void
  // Punto 39: recarga completa (personas + membresías) tras cualquier alta,
  // edición, borrado o cambio de equipo/posición en Personas o en Equipos.
  onMembersChanged?: () => void
  darkMode?: boolean
  canSeeAdmins: boolean
  // Rol de organización por persona (owner/admin), de /admin: etiquetas y filtro «Administradores».
  roleByMember?: Map<string, 'owner' | 'admin'> | null
  activeTab: PersonasTab
  onTabChange: (tab: PersonasTab) => void
  // La pantalla «Gestionar equipo(s)» que pide la URL al entrar (incluido el enlace viejo ?tab=equipos); después la maneja este panel.
  gestionInicial?: Gestion | null
}

const TITLE: Record<PersonasTab, string> = { personas: 'Personas', admins: 'Admins' }

// «A», «A y B», «A, B y C»
function listaNatural(xs: string[]) {
  const n = xs.filter(Boolean)
  return n.length <= 1 ? (n[0] || 'un equipo') : `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`
}

const rootStyle: React.CSSProperties = { fontFamily: 'var(--font-jakarta), ui-rounded, -apple-system, "SF Pro Rounded", system-ui, sans-serif' }

export default function PersonasPanel({ members, onRefreshMembers, onMembersChanged, darkMode, canSeeAdmins, roleByMember, activeTab: requestedTab, onTabChange, gestionInicial = null }: Props) {
  const activeTab: PersonasTab = requestedTab === 'admins' && !canSeeAdmins ? 'personas' : requestedTab
  // La acción de alta de quien esté montado ahora (cada panel la reemplaza al montarse).
  const requestNewRef = useRef<(() => void) | null>(null)
  const telefono = useMediaQuery('(max-width: 768px)')

  // «Lista» o «Por equipo»: por defecto «Por equipo» en teléfono y «Lista» en escritorio; lo que elija la persona manda.
  const [vistaElegida, setVistaElegida] = useState<'lista' | 'equipo' | null>(null)
  const vista = vistaElegida ?? (telefono ? 'equipo' : 'lista')

  // Gestión de equipos: null = Personas; si no, la pantalla de TeamsAdminPanel (la lista de equipos o el detalle de uno).
  const [gestion, setGestion] = useState<Gestion | null>(gestionInicial)
  function irAGestion(g: Gestion | null) {
    setGestion(g)
    const nueva = urlConGestion(window.location.href, g)
    if (nueva) window.history.replaceState(null, '', nueva)
  }
  // «+ → Equipo»: abre la gestión y, cuando TeamsAdminPanel ya registró su acción de alta, la dispara (enfoca el campo «Nombre del equipo»).
  const [pedirEquipoNuevo, setPedirEquipoNuevo] = useState(false)
  useEffect(() => {
    if (!pedirEquipoNuevo || !gestion) return
    // TeamsAdminPanel muestra primero un esqueleto mientras carga: se espera a que exista el campo «Nombre del equipo» (hasta ~3 s) y entonces se dispara su acción de alta.
    let intentos = 0
    const t = setInterval(() => {
      intentos++
      if (document.querySelector('input[placeholder="Nombre del equipo"]') || intentos > 30) { clearInterval(t); requestNewRef.current?.(); setPedirEquipoNuevo(false) }
    }, 100)
    return () => clearInterval(t)
  }, [pedirEquipoNuevo, gestion])

  // Fallo parcial del alta (punto 37): la persona se creó pero no se pudo agregar a algún equipo. Aviso PERSISTENTE, vive acá porque este panel es el que puede cambiar de pantalla.
  const [notice, setNotice] = useState<PartialTeamFailure | null>(null)
  function membersChangedFromPersonas(info?: MembersChangedInfo) {
    onMembersChanged?.()
    if (info?.partialTeamFailure) setNotice(info.partialTeamFailure)
  }
  function goToEquipos() {
    const only = notice && notice.teams.length === 1 ? notice.teams[0].id : null
    setNotice(null)
    irAGestion(only ? { modo: 'equipo', teamId: only } : { modo: 'equipos' })
  }

  const aviso = notice && (
    <PersonNotice
      message={`La persona se creó, pero no se pudo agregar a ${listaNatural(notice.teams.map(t => t.name))}. Agrégala desde Gestionar equipos`}
      actionLabel={notice.teams.length === 1 && notice.teams[0].name ? `Ir a ${notice.teams[0].name}` : 'Gestionar equipos'}
      onAction={goToEquipos}
      onDismiss={() => setNotice(null)} />
  )

  // ── Gestionar equipo(s): TeamsAdminPanel tal cual, con «‹ Personas» arriba ──
  if (gestion) {
    return (
      <div>
        <button type="button" className={panel.volver} onClick={() => irAGestion(null)}><ChevronLeft size={18} aria-hidden="true" />Personas</button>
        <TeamsAdminPanel key={gestion.modo === 'equipo' ? gestion.teamId : 'lista'} darkMode={darkMode} onMembersChanged={onMembersChanged}
          initialTeamId={gestion.modo === 'equipo' ? gestion.teamId : null}
          onRequestNew={fn => { requestNewRef.current = fn }} />
        {aviso}
      </div>
    )
  }

  return (
    <div>
      <div style={rootStyle}>
        <div className={panel.cabeza}>
          <h2 className={panel.titulo}>{TITLE[activeTab]}</h2>
          {activeTab === 'personas'
            ? <BotonNuevo etiquetaCorta="Agregar" etiquetaLarga="Agregar persona o equipo"
                onPersona={() => requestNewRef.current?.()} onEquipo={() => { irAGestion({ modo: 'equipos' }); setPedirEquipoNuevo(true) }} />
            : <BotonNuevo etiquetaCorta="Admin" etiquetaLarga="Agregar admin" directo={() => requestNewRef.current?.()} onPersona={() => {}} onEquipo={() => {}} />}
        </div>

        {canSeeAdmins && (
          <div className={styles.tabs} role="tablist" style={{ marginTop: 14 }}>
            <button role="tab" aria-selected={activeTab === 'personas'} onClick={() => onTabChange('personas')}>Personas</button>
            <button role="tab" aria-selected={activeTab === 'admins'} onClick={() => onTabChange('admins')}>Admins</button>
          </div>
        )}

        {activeTab === 'personas' && (
          <div className={panel.fila}>
            <Segmentado className={panel.selector} etiqueta="Cómo ver a las personas" valor={vista} onCambio={setVistaElegida}
              opciones={[{ valor: 'lista', texto: 'Lista' }, { valor: 'equipo', texto: 'Por equipo' }]} />
            <button type="button" className={panel.gestionar} onClick={() => irAGestion({ modo: 'equipos' })}><SlidersHorizontal size={16} aria-hidden="true" />Gestionar equipos</button>
          </div>
        )}
      </div>

      {activeTab === 'personas' ? (
        <TeamPanel members={members} onRefresh={onRefreshMembers} onMembersChanged={membersChangedFromPersonas} roleByMember={roleByMember}
          vista={vista} onGestionar={teamId => irAGestion({ modo: 'equipo', teamId })}
          onRequestNew={fn => { requestNewRef.current = fn }} />
      ) : (
        <AdminsPanel darkMode={darkMode}
          onRequestNew={fn => { requestNewRef.current = fn }} />
      )}

      {aviso}
    </div>
  )
}
