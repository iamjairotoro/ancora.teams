'use client'
// La composición de SU equipo (teléfono): quién está y con qué posiciones; agregar a una persona que ya existe o quitarla. NO cambia líderes ni datos de las personas (eso es de quien administra). Todo por /api/lider/equipo.
import { useState } from 'react'
import ErrorDeCarga from '../ErrorDeCarga'
import { confirmar } from '@/lib/ventanas/ventanas'
import { enviar } from '@/lib/lider/cliente'
import { TEXTOS_LIDER as T, TEXTOS_LIDER_EDICION as TE } from '@/lib/textos/servicioLider'
import HojaAgregarPersona from './HojaAgregarPersona'
import { useCarga } from './useCarga'
import ui from './lider-movil.module.css'

interface Datos { posiciones: { id: string; nombre: string }[]; integrantes: { id: string; nombre: string; apellido: string; esLider: boolean; posiciones: string[] }[]}

export default function PantallaEquipo({ equipoId, nombre }: { equipoId: string; nombre: string }) {
  const [c, recargar] = useCarga<Datos>(`/api/lider/equipo?equipo=${encodeURIComponent(equipoId)}`)
  const [abierto, setAbierto] = useState<string | null>(null), [agregar, setAgregar] = useState(false), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false)
  if (c.estado === 'cargando') return <p className={ui.mensaje} role="status">{T.cargando}</p>
  if (c.estado === 'prohibido') return <p className={ui.mensaje}>{T.sinAcceso}</p>
  if (c.estado === 'error') return <ErrorDeCarga compacto titulo={T.noSePudoCargar} cuerpo={T.noSePudoCargarCuerpo} onReintentar={recargar} />
  const d = c.datos
  const hacer = async (cuerpo: Record<string, unknown>) => { setOcupado(true); setError(null); const r = await enviar('equipo', cuerpo); setOcupado(false); if (!r.ok) setError(r.error); recargar() }
  return (
    <div className={ui.pagina}>
      <h1 className={ui.titulo}>{nombre}</h1>
      <p className={ui.ayuda}>{TE.integrantes}</p>
      <ul className={ui.lista}>
        {d.integrantes.map(i => (
          <li key={i.id} className={ui.tarjeta}>
            <button type="button" className={ui.cab} aria-expanded={abierto === i.id} onClick={() => setAbierto(a => a === i.id ? null : i.id)}>
              <span className={ui.cabNombre}>{`${i.nombre} ${i.apellido}`.trim()}</span>{i.esLider && <span className={ui.etiqueta}>{TE.esLider}</span>}
            </button>
            {abierto === i.id && (
              <div style={{ padding: '0 0.875rem 0.75rem' }}>
                <p className={ui.seccion}>{TE.posiciones}</p>
                <div className={ui.chips}>
                  {d.posiciones.map(p => { const on = i.posiciones.includes(p.id); return (
                    <button key={p.id} type="button" className={`${ui.chip}${on ? ` ${ui.chipOn}` : ''}`} aria-pressed={on} disabled={ocupado}
                      onClick={() => hacer({ accion: 'posiciones', integrante: i.id, posiciones: on ? i.posiciones.filter(x => x !== p.id) : [...i.posiciones, p.id] })}>{p.nombre}</button>
                  ) })}
                </div>
                {!i.esLider && <button type="button" className={ui.peligroBtn} disabled={ocupado} onClick={async () => { if (await confirmar(`¿Quitar a ${i.nombre} ${i.apellido} de ${nombre}? Seguirá en la organización y conserva sus datos.`, { accion: TE.quitarDelEquipo, peligro: true })) hacer({ accion: 'quitar', integrante: i.id }) }}>{TE.quitarDelEquipo}</button>}
              </div>
            )}
          </li>
        ))}
      </ul>
      {error && <p className={ui.error} role="alert">{error}</p>}
      <button type="button" className={ui.boton} disabled={ocupado} onClick={() => setAgregar(true)}>{TE.agregarPersona}</button>
      {agregar && <HojaAgregarPersona equipoId={equipoId} onCerrar={() => setAgregar(false)} onElegir={persona => hacer({ accion: 'agregar', equipo: equipoId, persona })} />}
    </div>
  )
}
