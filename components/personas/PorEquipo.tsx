'use client'
// «Personas · por equipo» (Personas · A): un bloque desplegable por equipo (monograma con el color del equipo, nombre, «N personas») con sus personas dentro, más «Sin equipo». Cada persona abre su ficha;
// «Gestionar equipo» lleva a la pantalla de gestión de ese equipo (TeamsAdminPanel, sin cambios). Sin estados de cumplimiento. Solo dibuja lo que recibe: el agrupado está en lib/admin/personasPorEquipo.ts.
import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import PersonAvatar from '../PersonAvatar'
import { TeamMono } from '../TeamColor'
import { textoPersonas, type GrupoPorEquipo } from '@/lib/admin/personasPorEquipo'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useTelefonoYa } from '@/lib/useTelefonoYa'
import CampoBusqueda from '../campos/CampoBusqueda'
import ui from './por-equipo.module.css'

const iniciales = (p: { nombre: string; apellido: string }) => `${p.nombre[0] ?? ''}${p.apellido[0] ?? ''}`.toLocaleUpperCase('es') || '?'

export default function PorEquipo({ grupos, consulta, onConsulta, onAbrirPersona, onGestionar, hayGente, abrirAlEntrar = null }: {
  grupos: GrupoPorEquipo[]
  consulta: string
  onConsulta: (q: string) => void
  onAbrirPersona: (id: string) => void
  onGestionar: (teamId: string) => void
  /** false = no hay ninguna persona cargada (se dice otra cosa que «sin resultados»). */
  hayGente: boolean
  /** El equipo que la URL pide desplegar al entrar (solo ese); null = ninguno pedido. */
  abrirAlEntrar?: string | null
}) {
  const base = useId()
  // Abiertos: SOLO los que la persona toca (cada bloque se abre y se cierra por su cuenta) y, si la URL pide un equipo (`?team=<id>`), ese y nada más. Con una búsqueda, todos los que quedan se muestran abiertos.
  // En TELÉFONO «Equipos» se abre con todos cerrados. En escritorio, sin equipo pedido, se conserva lo de siempre: el primer equipo con gente se abre una vez. Nada se guarda ni se recuerda entre visitas.
  const telefono = useMediaQuery('(max-width: 768px)')
  const telefonoYa = useTelefonoYa()      // teléfono: «Líder» como etiqueta junto al nombre (Personas-D); el escritorio lo conserva en la línea de abajo
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set(abrirAlEntrar ? [abrirAlEntrar] : []))
  const tocado = useRef(false)
  // los datos llegan después de montar: lo automático ocurre UNA vez y solo si la persona todavía no abrió ni cerró nada
  useEffect(() => {
    if (tocado.current) return
    if (abrirAlEntrar) { if (grupos.some(g => g.clave === abrirAlEntrar)) { setAbiertos(new Set([abrirAlEntrar])); tocado.current = true } return }
    if (telefono !== false) return
    const primero = grupos.find(g => g.total > 0 && g.teamId)
    if (primero) { setAbiertos(new Set([primero.clave])); tocado.current = true }
  }, [grupos, telefono, abrirAlEntrar])
  const alternar = (clave: string) => { tocado.current = true; setAbiertos(prev => { const n = new Set(prev); if (n.has(clave)) n.delete(clave); else n.add(clave); return n }) }
  return (
    <div className={ui.raiz}>
      {telefonoYa
        ? <CampoBusqueda valor={consulta} onCambio={onConsulta} placeholder="Buscar persona" etiqueta="Buscar persona" />
        : (
          <label className={ui.buscar}>
            <Search size={18} aria-hidden="true" />
            <input type="search" value={consulta} onChange={e => onConsulta(e.target.value)} placeholder="Buscar persona" aria-label="Buscar persona" />
          </label>
        )}
      <p className={ui.etiqueta}>Equipos</p>
      {grupos.length === 0 && <p className={ui.ninguno}>{hayGente ? 'No hay nadie con ese nombre.' : 'Todavía no hay personas.'}</p>}
      {grupos.map(g => {
        const abierto = !!consulta.trim() || abiertos.has(g.clave)
        const idPanel = `${base}-${g.clave}`
        return (
          <section key={g.clave} className={`${ui.bloque}${abierto ? ` ${ui.abierto}` : ''}`}>
            <button type="button" className={ui.cab} aria-expanded={abierto} aria-controls={idPanel} onClick={() => alternar(g.clave)}>
              {g.teamId ? <TeamMono name={g.nombre} color={g.color} /> : <span className={ui.mono} aria-hidden="true">·</span>}
              <span className={ui.txt}><span className={ui.nombre}>{g.nombre}</span><span className={ui.cuenta}>{textoPersonas(g.total)}</span></span>
              <ChevronDown className={ui.chev} size={18} aria-hidden="true" />
            </button>
            <div className={ui.panel} id={idPanel} role="region" aria-label={g.nombre} {...(abierto ? {} : ({ inert: '' } as Record<string, string>))}>
              <div className={ui.panelIn}>
                <div className={ui.lista}>
                  {g.personas.length === 0 && <p className={ui.vacio}>{g.total === 0 ? 'Todavía no hay personas en este equipo.' : 'Nadie coincide con la búsqueda.'}</p>}
                  {g.personas.map(p => (
                    <button key={p.id} type="button" className={ui.persona} onClick={() => onAbrirPersona(p.id)}>
                      <PersonAvatar className={ui.av} url={p.avatar_url} initials={iniciales(p)} />
                      <span className={ui.quien}>
                        {telefonoYa
                          ? <span className={ui.nmFila}><span className={ui.nm}>{p.nombre} {p.apellido}</span>{p.lider && <span className={ui.liderTag}>Líder</span>}</span>
                          : <span className={ui.nm}>{p.nombre} {p.apellido}</span>}
                        {telefonoYa
                          ? (p.posiciones.length > 0 && <span className={ui.sub}>{p.posiciones.join(' · ')}</span>)
                          : (p.lider || p.posiciones.length > 0) && (
                              <span className={ui.sub}>{p.lider && <span className={ui.lider}>Líder</span>}{p.lider && p.posiciones.length > 0 ? ' · ' : ''}{p.posiciones.join(' · ')}</span>
                            )}
                      </span>
                    </button>
                  ))}
                </div>
                {g.teamId && (
                  <button type="button" className={ui.gestionar} onClick={() => onGestionar(g.teamId!)}>
                    <SlidersHorizontal size={18} aria-hidden="true" /><span>Gestionar equipo</span><ChevronRight size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
