'use client'
// El bloque de un equipo AJENO: plegado, con candado y «Solo lectura». Sus props son SOLO datos (nada de funciones de acción) y este archivo no importa lib/lider/cliente: no tiene cómo escribir.
import { useState } from 'react'
import { ChevronDown, Lock } from 'lucide-react'
import { TeamMono } from '../TeamColor'
import type { EquipoAjeno as Datos } from '@/lib/lider/servicioLider'
import { TEXTOS_LIDER as T, ocultarEquipoN, verEquipoN } from '@/lib/textos/servicioLider'
import ui from './lider-movil.module.css'

const ETIQUETA = { 'confirmo': T.confirmo, 'sin-responder': T.sinResponder } as const
const iniciales = (nombre: string, apellido: string) => `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toLocaleUpperCase('es')

export default function EquipoAjeno({ equipo }: { readonly equipo: Datos }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <section className={ui.tarjeta}>
      <button type="button" className={ui.cab} aria-expanded={abierto} aria-label={abierto ? ocultarEquipoN(equipo.nombre) : verEquipoN(equipo.nombre)} onClick={() => setAbierto(a => !a)}>
        <TeamMono name={equipo.nombre} color={equipo.color} /><span className={ui.cabNombre}>{equipo.nombre}</span>
        <span className={ui.lectura}><Lock size={14} aria-hidden="true" />{T.soloLectura}</span><span className={ui.cuenta}>{equipo.personas.length}</span>
        <ChevronDown size={18} aria-hidden="true" style={{ transform: abierto ? 'rotate(180deg)' : undefined }} />
      </button>
      {abierto && (equipo.personas.length === 0 ? <p className={ui.vacioEquipo}>{T.nadieAsignado}</p> : (
        <ul className={ui.personas}>
          {equipo.personas.map((p, i) => (
            <li key={i} className={ui.persona}>
              <span className={ui.avatar} aria-hidden="true">{iniciales(p.nombre, p.apellido)}</span>
              <span className={ui.personaTxt}><span className={ui.personaNombre}>{`${p.nombre} ${p.apellido}`.trim()}</span><span className={ui.personaPos}>{p.posicion}</span></span>
              <span className={`${ui.estado}${p.estado === 'confirmo' ? ` ${ui.estadoOk}` : ''}`}>{ETIQUETA[p.estado]}</span>
            </li>
          ))}
        </ul>
      ))}
    </section>
  )
}
