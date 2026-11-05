'use client'
// Un equipo AJENO en Personas: plegado, con candado y «Solo lectura»; por persona, nombre y posiciones (iniciales, nunca foto). Sus props son SOLO datos (nada de funciones de acción) y este archivo no importa
// lib/lider/cliente: no tiene cómo escribir. Las filas no se pueden abrir: no hay ficha de otro equipo.
import { useState } from 'react'
import { ChevronDown, Lock } from 'lucide-react'
import PersonaCelda, { claseFilaPersona } from '../personas/PersonaCelda'
import { TeamMono } from '../TeamColor'
import type { EquipoPersonasAjeno as Datos } from '@/lib/lider/personasLider'
import { TEXTOS_LIDER as T, ocultarEquipoN, personasN, verEquipoN } from '@/lib/textos/servicioLider'
import { TEXTOS_PERSONAS_LIDER as TP } from '@/lib/textos/servicioLider'
import ui from './lider-movil.module.css'

const iniciales = (n: string, a: string) => `${n[0] ?? ''}${a[0] ?? ''}`.toLocaleUpperCase('es')

export default function PersonasEquipoAjeno({ equipo, abierto: forzado }: { readonly equipo: Datos; readonly abierto?: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const visible = forzado || abierto
  return (
    <section className={ui.tarjeta}>
      <button type="button" className={ui.cab} aria-expanded={visible} aria-label={visible ? ocultarEquipoN(equipo.nombre) : verEquipoN(equipo.nombre)} onClick={() => setAbierto(a => !a)}>
        <TeamMono name={equipo.nombre} color={equipo.color} /><span className={ui.cabNombre}>{equipo.nombre}</span>
        <span className={ui.lectura}><Lock size={14} aria-hidden="true" />{TP.soloLectura}</span><span className={ui.cuenta}>{personasN(equipo.personas.length)}</span>
        <ChevronDown size={18} aria-hidden="true" style={{ transform: visible ? 'rotate(180deg)' : undefined }} />
      </button>
      {visible && (equipo.personas.length === 0 ? <p className={ui.vacioEquipo}>{TP.sinPersonas}</p> : (
        <ul className={ui.personas}>
          {equipo.personas.map((p, i) => (
            <li key={i} className={`${claseFilaPersona} ${ui.filaPlana}`}>
              <PersonaCelda iniciales={iniciales(p.nombre, p.apellido)} nombre={`${p.nombre} ${p.apellido}`.trim()} secundaria={p.posiciones.length ? p.posiciones.join(' · ') : TP.sinPosiciones} />
            </li>
          ))}
        </ul>
      ))}
    </section>
  )
}
