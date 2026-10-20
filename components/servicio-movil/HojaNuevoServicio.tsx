'use client'
// La hoja «Nuevo servicio» de la lista de Servicios en teléfono: lo mismo que el formulario de escritorio (tipo, «Depende de» para el ensayo, fecha, horas y, en el ensayo, lugar / dirección / mapa), en una hoja de abajo.
// Crea con `createService` de la página (la misma función) y, si sale bien, abre el servicio nuevo.
import { useId, useState } from 'react'
import type { Service } from '@/lib/types'
import { TEXTOS_SERVICIO as T } from '@/lib/textos/servicio'
import HojaBase from '../admin-movil/HojaBase'
import hoja from '@/app/portal/_components/disponibilidad/hoja.module.css'
import ui from './lista.module.css'

type Tipo = 'service' | 'rehearsal' | 'other'
export type CrearServicio = (fecha: string, horaInicio?: string, horaFin?: string, kind?: Tipo, extra?: { parentServiceId?: string; lugar?: string; direccion?: string; mapsLink?: string }) => Promise<string | null | void> | void

const fmt = (f: string) => { const [a, m, d] = f.split('-'); return `${d}/${m}/${a}` }

export default function HojaNuevoServicio({ services, crear, onCerrar, onCreado }: { services: Service[]; crear: CrearServicio; onCerrar: () => void; onCreado: (id: string) => void }) {
  const idTitulo = useId()
  const [tipo, setTipo] = useState<Tipo>('service')
  const [padre, setPadre] = useState('')
  const [fecha, setFecha] = useState('')
  const [inicio, setInicio] = useState('10:00')
  const [fin, setFin] = useState('14:00')
  const [lugar, setLugar] = useState('')
  const [direccion, setDireccion] = useState('')
  const [mapa, setMapa] = useState('')
  const [creando, setCreando] = useState(false)
  const [fallo, setFallo] = useState(false)
  const puede = !!fecha && (tipo !== 'rehearsal' || !!padre) && !creando
  const tipos: [Tipo, string][] = [['service', T.tipoServicio], ['rehearsal', T.tipoEnsayo], ['other', T.tipoOtro]]

  async function enviar(cerrar: (despues?: () => void) => void) {
    if (!puede) return
    setCreando(true); setFallo(false)
    try {
      const id = await crear(fecha, inicio, fin, tipo, { parentServiceId: tipo === 'rehearsal' ? padre : undefined, lugar: lugar || undefined, direccion: direccion || undefined, mapsLink: mapa || undefined })
      if (typeof id === 'string' && id) cerrar(() => onCreado(id))
      else setFallo(true)
    } catch { setFallo(true) }
    setCreando(false)
  }

  return (
    <HojaBase idTitulo={idTitulo} onCerrar={onCerrar} cabeza={<h2 id={idTitulo} className={hoja.titulo}>{T.nuevoServicio}</h2>}>
      {cerrar => (
        <form className={ui.form} onSubmit={e => { e.preventDefault(); void enviar(cerrar) }}>
          <div className={ui.campo}>
            <span className={ui.etiqueta} id={`${idTitulo}-tipo`}>{T.tipo}</span>
            <div className={ui.tipos} role="radiogroup" aria-labelledby={`${idTitulo}-tipo`}>
              {tipos.map(([k, t]) => <button key={k} type="button" role="radio" aria-checked={tipo === k} className={ui.tipo} onClick={() => setTipo(k)}>{t}</button>)}
            </div>
          </div>
          {tipo === 'rehearsal' && (
            <label className={ui.campo}><span className={ui.etiqueta}>{T.dependeDe}</span>
              <select className={ui.entrada} value={padre} onChange={e => setPadre(e.target.value)}>
                <option value="">{T.elegirServicio}</option>
                {services.filter(s => (s.kind || 'service') === 'service').map(s => <option key={s.id} value={s.id}>{fmt(s.fecha)} — {s.titulo}</option>)}
              </select>
            </label>
          )}
          <label className={ui.campo}><span className={ui.etiqueta}>{T.fecha}</span><input type="date" className={ui.entrada} value={fecha} onChange={e => setFecha(e.target.value)} required /></label>
          <div className={ui.par}>
            <label className={ui.campo}><span className={ui.etiqueta}>{T.horaInicio}</span><input type="time" className={ui.entrada} value={inicio} onChange={e => setInicio(e.target.value)} /></label>
            <label className={ui.campo}><span className={ui.etiqueta}>{T.horaFin}</span><input type="time" className={ui.entrada} value={fin} onChange={e => setFin(e.target.value)} /></label>
          </div>
          {tipo === 'rehearsal' && (
            <>
              <label className={ui.campo}><span className={ui.etiqueta}>{T.lugar}</span><input className={ui.entrada} placeholder={T.lugarEjemplo} value={lugar} onChange={e => setLugar(e.target.value)} /></label>
              <label className={ui.campo}><span className={ui.etiqueta}>{T.direccion}</span><input className={ui.entrada} placeholder={T.direccionEjemplo} value={direccion} onChange={e => setDireccion(e.target.value)} /></label>
              <label className={ui.campo}><span className={ui.etiqueta}>{T.mapa}</span><input className={ui.entrada} inputMode="url" placeholder={T.mapaEjemplo} value={mapa} onChange={e => setMapa(e.target.value)} /></label>
              <p className={ui.ayuda}>{T.ensayoAyuda}</p>
            </>
          )}
          {fallo && <p className={ui.fallo} role="alert">{T.noSePudoCrear}</p>}
          <button type="submit" className={ui.crear} disabled={!puede}>{creando ? T.creando : T.crear}</button>
        </form>
      )}
    </HojaBase>
  )
}
