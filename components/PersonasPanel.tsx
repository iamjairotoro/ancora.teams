'use client'
/* ════════════════════════════════════════════════════════════════════════
   PersonasPanel.tsx — «Personas» (con «Admins» solo para el owner) y, dentro de ella, la gestión de equipos.

   «Equipos» ya NO es una pestaña ni un ítem del menú: los equipos se ven como bloques desplegables dentro de Personas (vista «Equipos» en teléfono / «Por equipo» en escritorio; al entrar siempre abre «Personas» / «Lista») y se
   administran en la pantalla «Gestionar equipo(s)» — que es TeamsAdminPanel tal cual, sin tocar su contenido — a la que se llega desde «Gestionar equipos» (cabecera), «Gestionar equipo» (cada bloque),
   el «+ → Equipo» o el aviso de alta parcial. Se vuelve con «‹ Personas». La pantalla de gestión vive en la URL (?gestion=equipos|equipo&team=…); el enlace viejo `?tab=equipos` sigue funcionando
   (lib/admin/urlPestana.ts lo convierte).

   El «+» de la cabecera abre «Persona / Equipo» (hoja en teléfono, desplegable en escritorio); en Admins es un solo «+ Admin». El alta de persona y de equipo son los de cada panel (registrados con
   onRequestNew): ningún formulario ni lógica de alta se duplica acá.

   Admins es la segunda pestaña y la ve SOLO el owner (canSeeAdmins): para cualquier otro no se renderiza ni la pestaña ni el panel, y un activeTab='admins' que le llegue a un no-owner cae, en
   silencio, en Personas.
   ════════════════════════════════════════════════════════════════════════ */
import ErrorDeCarga from './ErrorDeCarga'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, SlidersHorizontal } from 'lucide-react'
import type { Member } from '@/lib/types'
import TeamPanel from './TeamPanel'
import TeamsAdminPanel from './TeamsAdminPanel'
import AdminsPanel from './AdminsPanel'
import BotonNuevo from './personas/BotonNuevo'
import Segmentado from '@/app/portal/_components/segmentado/Segmentado'
import { PersonNotice, type MembersChangedInfo, type PartialTeamFailure } from './AddPersonDialog'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { equipoAbiertoDeUrl, urlConGestion, vistaDePersonasDeUrl, type Gestion } from '@/lib/admin/urlPestana'
import { TEXTOS_PERSONAS } from '@/lib/textos/personas'
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
  // La carga de /admin falló (personas, equipos o servicios): en vez de una lista vacía, el aviso con «Reintentar».
  errorCarga?: string | null
  onReintentarCarga?: () => void
}

const TITLE: Record<PersonasTab, string> = { personas: 'Personas', admins: 'Admins' }

// «A», «A y B», «A, B y C»
function listaNatural(xs: string[]) {
  const n = xs.filter(Boolean)
  return n.length <= 1 ? (n[0] || 'un equipo') : `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`
}

const rootStyle: React.CSSProperties = { fontFamily: 'var(--font-jakarta), ui-rounded, -apple-system, "SF Pro Rounded", system-ui, sans-serif' }

export default function PersonasPanel({ members, onRefreshMembers, onMembersChanged, darkMode, canSeeAdmins, roleByMember, activeTab: requestedTab, onTabChange, gestionInicial = null, errorCarga = null, onReintentarCarga }: Props) {
  const activeTab: PersonasTab = requestedTab === 'admins' && !canSeeAdmins ? 'personas' : requestedTab
  // La acción de alta de quien esté montado ahora (cada panel la reemplaza al montarse).
  const requestNewRef = useRef<(() => void) | null>(null)
  const telefono = useMediaQuery('(max-width: 768px)')

  // La vista de Personas: al ENTRAR siempre abre «Personas» (la lista de gente), también en teléfono; solo `?vista=equipos` en la URL abre «Equipos». La elección de la persona vale mientras esté aquí:
  // no se guarda en ninguna parte ni se recuerda entre visitas (al salir de Personas la URL pierde `vista`, ver lib/admin/urlPestana.ts).
  const [vistaElegida, setVistaElegida] = useState<'lista' | 'equipo' | null>(null)
  // Se lee de useSearchParams y no de window.location: al llegar con router.push (p. ej. desde la tarjeta de un equipo del Home) este panel se monta ANTES de que el navegador ponga la URL nueva, y window.location todavía
  // trae la de la pantalla anterior (diagnóstico de octubre 2026: la tarjeta caía en Personas > Personas).
  const params = useSearchParams()
  const [vistaDeLaUrl] = useState<'lista' | 'equipo'>(() => vistaDePersonasDeUrl(params))
  const vista = vistaElegida ?? vistaDeLaUrl
  // «Equipos» abre TODOS los equipos cerrados; solo se despliega el que la persona toque o el que la URL pida explícitamente (`?team=<id>`). Nada se recuerda entre visitas.
  const [equipoDeLaUrl] = useState<string | null>(() => equipoAbiertoDeUrl(params))
  // En teléfono las vistas se llaman «Personas» y «Equipos»; el escritorio conserva «Lista» y «Por equipo» hasta que se decida (textos en lib/textos/personas.ts).
  const nombresDeVista = telefono === true ? [TEXTOS_PERSONAS.vistaPersonas, TEXTOS_PERSONAS.vistaEquipos] : [TEXTOS_PERSONAS.vistaListaEscritorio, TEXTOS_PERSONAS.vistaPorEquipoEscritorio]

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
      <div style={telefono === true ? undefined : rootStyle}>      {/* teléfono: la letra del body, como el resto */}
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
            <Segmentado className={panel.selector} etiqueta={TEXTOS_PERSONAS.comoVer} valor={vista} onCambio={setVistaElegida}
              opciones={[{ valor: 'lista', texto: nombresDeVista[0] }, { valor: 'equipo', texto: nombresDeVista[1] }]} />
            <button type="button" className={panel.gestionar} onClick={() => irAGestion({ modo: 'equipos' })}><SlidersHorizontal size={16} aria-hidden="true" />Gestionar equipos</button>
          </div>
        )}
      </div>

      {activeTab === 'personas' ? (errorCarga ? (
        <ErrorDeCarga titulo="No se pudieron cargar las personas" cuerpo={errorCarga} onReintentar={onReintentarCarga} />
      ) : (
        <TeamPanel members={members} onRefresh={onRefreshMembers} onMembersChanged={membersChangedFromPersonas} roleByMember={roleByMember}
          vista={vista} equipoAbierto={equipoDeLaUrl} onGestionar={teamId => irAGestion({ modo: 'equipo', teamId })}
          onRequestNew={fn => { requestNewRef.current = fn }} />
      )) : (
        <AdminsPanel darkMode={darkMode}
          onRequestNew={fn => { requestNewRef.current = fn }} />
      )}

      {aviso}
    </div>
  )
}
