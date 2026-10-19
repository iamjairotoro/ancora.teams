'use client'
// El «+» de la cabecera de Personas: abre el menú «Persona / Equipo». Teléfono: hoja desde abajo (la misma de «Más»). Escritorio: desplegable pequeño (Escape o un clic afuera lo cierran y el foco vuelve al botón).
// En la pestaña Admins el «+» no ofrece menú: es un solo «+ Admin» (lo resuelve el padre con `directo`).
import { useEffect, useRef, useState } from 'react'
import { Plus, User, Users } from 'lucide-react'
import { useMediaQuery } from '@/lib/useMediaQuery'
import HojaBase from '../admin-movil/HojaBase'
import mas from '../admin-movil/mas.module.css'
import ui from './nuevo.module.css'

export default function BotonNuevo({ etiquetaCorta, etiquetaLarga, directo, onPersona, onEquipo }: {
  etiquetaCorta: string; etiquetaLarga: string
  /** Si se pasa, el botón hace esto sin abrir ningún menú (pestaña Admins). */
  directo?: () => void
  onPersona: () => void
  onEquipo: () => void
}) {
  const telefono = useMediaQuery('(max-width: 768px)')
  const [abierto, setAbierto] = useState(false)
  const boton = useRef<HTMLButtonElement>(null)
  const envoltura = useRef<HTMLDivElement>(null)

  // escritorio: Escape y clic afuera
  useEffect(() => {
    if (!abierto || telefono) return
    const afuera = (e: MouseEvent) => { if (!envoltura.current?.contains(e.target as Node)) setAbierto(false) }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { setAbierto(false); boton.current?.focus() } }
    document.addEventListener('mousedown', afuera); document.addEventListener('keydown', tecla)
    return () => { document.removeEventListener('mousedown', afuera); document.removeEventListener('keydown', tecla) }
  }, [abierto, telefono])
  const cerrarYVolver = () => { setAbierto(false); requestAnimationFrame(() => boton.current?.focus()) }
  const alClic = () => { if (directo) directo(); else setAbierto(v => !v) }

  return (
    <div className={ui.envoltura} ref={envoltura}>
      <button type="button" ref={boton} className={ui.mas} onClick={alClic} aria-label={etiquetaLarga} aria-haspopup={directo ? undefined : 'menu'} aria-expanded={directo ? undefined : abierto}><Plus size={22} aria-hidden="true" /></button>
      <button type="button" className={`anc-btn anc-btn--accent anc-btn--sm ${ui.escritorio}`} onClick={alClic} aria-label={etiquetaLarga} aria-haspopup={directo ? undefined : 'menu'} aria-expanded={directo ? undefined : abierto}>
        <Plus size={12} aria-hidden="true" /><span>{etiquetaCorta}</span>
      </button>

      {abierto && !directo && telefono === false && (
        <div className={ui.menu} role="menu" aria-label="Agregar">
          <button type="button" role="menuitem" className={ui.item} onClick={() => { setAbierto(false); onPersona() }}><User size={15} aria-hidden="true" />Persona</button>
          <button type="button" role="menuitem" className={ui.item} onClick={() => { setAbierto(false); onEquipo() }}><Users size={15} aria-hidden="true" />Equipo</button>
        </div>
      )}
      {abierto && !directo && telefono === true && (
        <HojaBase idTitulo="nuevo-titulo" onCerrar={cerrarYVolver} cabeza={<h2 className={mas.org} id="nuevo-titulo">Agregar</h2>}>
          {cerrar => (
            <div className={mas.lista}>
              <button type="button" className={mas.fila} onClick={() => cerrar(onPersona)}><span className={mas.ficono} aria-hidden="true"><User size={18} strokeWidth={1.75} /></span><span className={mas.ftxt}><span className={mas.ft}>Persona</span><span className={mas.fd}>Dar de alta a alguien</span></span></button>
              <button type="button" className={mas.fila} onClick={() => cerrar(onEquipo)}><span className={mas.ficono} aria-hidden="true"><Users size={18} strokeWidth={1.75} /></span><span className={mas.ftxt}><span className={mas.ft}>Equipo</span><span className={mas.fd}>Crear un equipo nuevo</span></span></button>
            </div>
          )}
        </HojaBase>
      )}
    </div>
  )
}
