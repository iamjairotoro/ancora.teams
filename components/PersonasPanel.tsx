'use client'
/* ════════════════════════════════════════════════════════════════════════
   PersonasPanel.tsx — "Personas" y "Equipos" como dos pestañas de una sola
   entrada de menú, al estilo Planning Center (People | Teams): un título y
   un botón primario que cambian con la pestaña, encima del contenido de
   siempre. NO reemplaza a TeamPanel.tsx ni a TeamsAdminPanel.tsx — los
   monta tal cual, sin tocar su contenido; solo cambia DÓNDE se montan.

   El botón primario dispara la acción de alta que cada panel ya tenía
   (su propio "+ Agregar"), registrada vía la prop opcional onRequestNew —
   ningún formulario ni lógica de alta se duplica acá.

   Admins es la tercera pestaña y la ve SOLO el owner (canSeeAdmins, la
   misma condición que antes tenía el ítem del menú): para cualquier otro
   no se renderiza ni la pestaña ni el panel, y un activeTab='admins' que
   le llegue a un no-owner cae, en silencio, en Personas.
   ════════════════════════════════════════════════════════════════════════ */
import { useRef } from 'react'
import { Plus } from 'lucide-react'
import type { Member } from '@/lib/types'
import TeamPanel from './TeamPanel'
import TeamsAdminPanel from './TeamsAdminPanel'
import AdminsPanel from './AdminsPanel'
import styles from './ui.module.css'

export type PersonasTab = 'personas' | 'equipos' | 'admins'

interface Props {
  members: Member[]
  onRefreshMembers: () => void
  darkMode?: boolean
  canSeeAdmins: boolean
  activeTab: PersonasTab
  onTabChange: (tab: PersonasTab) => void
}

const TITLE: Record<PersonasTab, string> = { personas: 'Personas', equipos: 'Equipos', admins: 'Admins' }
// Etiqueta corta (la que se ve) y frase completa (aria-label) del botón
// primario — la palabra corta sigue a la pestaña, el "+" hace de verbo.
const ADD_SHORT: Record<PersonasTab, string> = { personas: 'Persona', equipos: 'Equipo', admins: 'Admin' }
const ADD_LABEL: Record<PersonasTab, string> = { personas: 'Agregar persona', equipos: 'Agregar equipo', admins: 'Agregar admin' }

const rootStyle: React.CSSProperties = { fontFamily: 'var(--font-jakarta), ui-rounded, -apple-system, "SF Pro Rounded", system-ui, sans-serif' }

export default function PersonasPanel({ members, onRefreshMembers, darkMode, canSeeAdmins, activeTab: requestedTab, onTabChange }: Props) {
  const activeTab: PersonasTab = requestedTab === 'admins' && !canSeeAdmins ? 'personas' : requestedTab
  // Solo uno de los dos paneles está montado a la vez (según la pestaña),
  // así que un único ref alcanza para guardar "la acción de alta de quien
  // esté montado ahora" — cada panel la reemplaza al montarse.
  const requestNewRef = useRef<(() => void) | null>(null)

  return (
    <div>
      {/* Esta franja es la única parte nueva — el font-family propio no se
          le pasa a TeamPanel/TeamsAdminPanel de abajo (cada uno sigue con
          el suyo, sin cambios), solo vive acá. Sin maxWidth: ocupa el ancho
          de la página (<main> mide hasta 1240px), para que el botón quede
          pegado al borde derecho del contenido — el mismo de la línea bajo
          las pestañas — y no al de un contenedor angosto. */}
      <div style={rootStyle}>
        {/* Título a la izquierda (flex:1, no se mueve al cambiar de
            pestaña) y botón a la derecha, en la misma fila: si no cabe, se
            recorta el título con puntos suspensivos antes de que el botón
            se mueva o baje de línea. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}>
          <h2 style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontSize: 15.5, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.012em' }}>
            {TITLE[activeTab]}
          </h2>
          <button onClick={() => requestNewRef.current?.()} className="anc-btn anc-btn--accent anc-btn--sm"
            style={{ flex: 'none', marginLeft: 'auto' }} aria-label={ADD_LABEL[activeTab]}>
            <Plus size={12} aria-hidden="true" />
            <span>{ADD_SHORT[activeTab]}</span>
          </button>
        </div>

        <div className={styles.tabs} role="tablist" style={{ marginTop: 14 }}>
          <button role="tab" aria-selected={activeTab === 'personas'} onClick={() => onTabChange('personas')}>Personas</button>
          <button role="tab" aria-selected={activeTab === 'equipos'} onClick={() => onTabChange('equipos')}>Equipos</button>
          {canSeeAdmins && (
            <button role="tab" aria-selected={activeTab === 'admins'} onClick={() => onTabChange('admins')}>Admins</button>
          )}
        </div>
      </div>

      {activeTab === 'personas' ? (
        <TeamPanel members={members} onRefresh={onRefreshMembers}
          onRequestNew={fn => { requestNewRef.current = fn }} />
      ) : activeTab === 'equipos' ? (
        <TeamsAdminPanel darkMode={darkMode}
          onRequestNew={fn => { requestNewRef.current = fn }} />
      ) : (
        <AdminsPanel darkMode={darkMode}
          onRequestNew={fn => { requestNewRef.current = fn }} />
      )}
    </div>
  )
}
