'use client'
// SU equipo en Personas: las personas con sus posiciones (iniciales, nunca foto), la ficha de cada una y «Agregar persona». Es el ÚNICO bloque de esta pantalla que escribe (por lib/lider/cliente → /api/lider/equipo, que
// vuelve a autorizar y a validar en el servidor). Agregar: solo personas que YA existen (búsqueda por nombre); no se crean personas. No cambia líderes, roles ni datos personales.
import { useState } from 'react'
import { Plus } from 'lucide-react'
import PersonaCelda, { claseFilaPersona } from '../personas/PersonaCelda'
import { TeamMono } from '../TeamColor'
import { confirmar } from '@/lib/ventanas/ventanas'
import { enviar } from '@/lib/lider/cliente'
import type { EquipoPersonasPropio as Datos } from '@/lib/lider/personasLider'
import { TEXTOS_LIDER as T, TEXTOS_PERSONAS_LIDER as TP, aVerPersona, confirmarQuitarDelEquipo, personasN } from '@/lib/textos/servicioLider'
import HojaAgregarPersona from './HojaAgregarPersona'
import HojaPersona from './HojaPersona'
import ui from './lider-movil.module.css'

const iniciales = (n: string, a: string) => `${n[0] ?? ''}${a[0] ?? ''}`.toLocaleUpperCase('es')

export default function PersonasEquipoPropio({ equipo, personasVisibles, onCambio }: { equipo: Datos; personasVisibles: Datos['personas']; onCambio: () => void }) {
  const [abierta, setAbierta] = useState<string | null>(null), [agregar, setAgregar] = useState(false)
  const [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false)
  const persona = abierta ? equipo.personas.find(p => p.integrante === abierta) ?? null : null
  const hacer = async (cuerpo: Record<string, unknown>) => { setOcupado(true); setError(null); const r = await enviar('equipo', cuerpo); setOcupado(false); if (!r.ok) setError(r.error); onCambio() }
  return (
    <section className={`${ui.tarjeta} ${ui.propia}`} aria-label={`${equipo.nombre}. ${T.tuEquipo}`}>
      <div className={ui.cab}><TeamMono name={equipo.nombre} color={equipo.color} /><span className={ui.cabNombre}>{equipo.nombre}</span><span className={ui.etiqueta}>{T.tuEquipo}</span><span className={ui.cuenta}>{personasN(equipo.personas.length)}</span></div>
      {personasVisibles.length === 0 ? <p className={ui.vacioEquipo}>{equipo.personas.length === 0 ? TP.sinPersonas : TP.sinResultados}</p> : (
        <ul className={ui.personas}>
          {personasVisibles.map(p => { const nombre = `${p.nombre} ${p.apellido}`.trim(); return (
            <li key={p.integrante}>
              <button type="button" className={`${claseFilaPersona} ${ui.filaBoton}`} aria-label={aVerPersona(nombre)} onClick={() => setAbierta(p.integrante)}>
                <PersonaCelda iniciales={iniciales(p.nombre, p.apellido)} nombre={nombre} etiqueta={p.esLider ? TP.lider : p.esYo ? TP.tu : null} secundaria={p.posiciones.length ? p.posiciones.map(x => x.nombre).join(' · ') : TP.sinPosiciones} />
              </button>
            </li>
          ) })}
        </ul>
      )}
      {error && <p className={ui.error} role="alert">{error}</p>}
      <div className={ui.acciones}>
        <button type="button" className={ui.boton} disabled={ocupado} onClick={() => setAgregar(true)}><Plus size={16} aria-hidden="true" />{TP.agregar}</button>
      </div>
      {persona && <HojaPersona equipo={equipo} persona={persona} ocupado={ocupado} onCerrar={() => setAbierta(null)}
        onPosiciones={posiciones => hacer({ accion: 'posiciones', integrante: persona.integrante, posiciones })}
        onQuitar={async () => { if (await confirmar(confirmarQuitarDelEquipo(`${persona.nombre} ${persona.apellido}`.trim(), equipo.nombre), { accion: TP.quitar, peligro: true })) hacer({ accion: 'quitar', integrante: persona.integrante }) }} />}
      {agregar && <HojaAgregarPersona equipoId={equipo.id} onCerrar={() => setAgregar(false)} onElegir={p => hacer({ accion: 'agregar', equipo: equipo.id, persona: p })} />}
    </section>
  )
}
