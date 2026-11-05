'use client'
// «Agregar persona» al equipo: busca por nombre, en el servidor, a personas que YA existen en la organización y todavía no están en ese equipo (/api/lider/personas/buscar: máximo 30, solo id, nombre y apellido).
// Nunca muestra ni pide teléfono o correo, y no lista a todos: con menos de 2 letras no hay resultados. Elegir a alguien lo reporta al padre; es el padre quien escribe (por /api/lider/equipo).
import { useEffect, useId, useState } from 'react'
import HojaBase from '../admin-movil/HojaBase'
import hoja from '@/app/portal/_components/disponibilidad/hoja.module.css'
import pantallas from '../servicio-movil/pantallas.module.css'
import { TEXTOS_PERSONAS_LIDER as T } from '@/lib/textos/servicioLider'
import ui from './lider-movil.module.css'

interface Resultado { id: string; nombre: string; apellido: string }
const ESPERA_MS = 250, MIN_LETRAS = 2

export default function HojaAgregarPersona({ equipoId, onElegir, onCerrar }: { equipoId: string; onElegir: (personaId: string) => void; onCerrar: () => void }) {
  const id = useId()
  const [q, setQ] = useState(''), [res, setRes] = useState<Resultado[] | null>(null), [estado, setEstado] = useState<'quieto' | 'buscando' | 'error'>('quieto')
  useEffect(() => {
    const t = q.trim()
    if (t.length < MIN_LETRAS) { setRes(null); setEstado('quieto'); return }
    let vigente = true
    setEstado('buscando')
    const espera = setTimeout(() => {
      fetch(`/api/lider/personas/buscar?equipo=${encodeURIComponent(equipoId)}&q=${encodeURIComponent(t)}`, { cache: 'no-store' })
        .then(async r => { if (!vigente) return; if (!r.ok) { setEstado('error'); return } const d = await r.json(); setRes(Array.isArray(d.personas) ? d.personas : []); setEstado('quieto') })
        .catch(() => { if (vigente) setEstado('error') })
    }, ESPERA_MS)
    return () => { vigente = false; clearTimeout(espera) }
  }, [q, equipoId])
  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={<h2 id={id} className={hoja.titulo}>{T.agregarAlEquipo}</h2>}>
      {cerrar => (
        <>
          <input className={ui.campo} type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={T.buscarNombre} aria-label={T.buscarNombre} maxLength={60} autoComplete="off" autoCapitalize="words" />
          {estado === 'error' ? <p className={ui.error} role="alert">{T.noSePudoBuscar}</p>
            : q.trim().length < MIN_LETRAS ? <p className={ui.nota}>{T.escribeParaBuscar}</p>
            : estado === 'buscando' && res === null ? <p className={ui.nota} role="status">{T.buscando}</p>
            : res && res.length === 0 ? <p className={ui.nota}>{T.sinCoincidencias}</p>
            : res ? <ul className={pantallas.listaHoja}>{res.map(p => <li key={p.id}><button type="button" className={pantallas.filaHoja} onClick={() => cerrar(() => onElegir(p.id))}>{`${p.nombre} ${p.apellido}`.trim()}</button></li>)}</ul> : null}
          <button type="button" className={`${pantallas.boton} ${ui.cancelarHoja}`} onClick={() => cerrar()}>Cancelar</button>
        </>
      )}
    </HojaBase>
  )
}
