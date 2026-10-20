'use client'
// Las hojas de abajo de las pantallas de teléfono del servicio (fase 3 · B2/B3): «⋯» del servicio, cambiar de servicio (con historial), horario, duplicar, añadir una herramienta y las acciones de una persona.
// Todas sobre HojaBase (la misma de «Más» y «Nuevo servicio»): el foco entra, Tab no sale, se cierra con Escape, el fondo, la ✕ o el gesto «atrás». Una acción que navega o abre otra hoja primero
// cierra la suya (`cerrar(despues)`). Nada se escribe desde aquí salvo el horario, que usa la ruta que ya usa el escritorio (/api/update-service); lo demás lo hacen las funciones de la página.
import { useId, useState } from 'react'
import { ChevronRight, Copy, History, Plus, Trash2, User } from 'lucide-react'
import type { Service, ToolType } from '@/lib/types'
import { servicioTerminado } from '@/lib/servicioTerminado'
import { etiquetaDeServicio } from '@/lib/admin/servicioMovil'
import { TEXTOS_SERVICIO as T, nombreDeHerramienta } from '@/lib/textos/servicio'
import HojaBase from '../admin-movil/HojaBase'
import hoja from '@/app/portal/_components/disponibilidad/hoja.module.css'
import ui from './pantallas.module.css'

const Titulo = ({ id, children }: { id: string; children: React.ReactNode }) => <h2 id={id} className={hoja.titulo}>{children}</h2>

export function HojaAccionesServicio({ puedeDuplicar, hayHistorial, onNuevo, onDuplicar, onHistorial, onEliminar, onCerrar }: {
  puedeDuplicar: boolean; hayHistorial: boolean
  onNuevo: () => void; onDuplicar: () => void; onHistorial: () => void; onEliminar: () => void
  onCerrar: () => void
}) {
  const id = useId()
  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={<Titulo id={id}>{T.masAcciones}</Titulo>}>
      {cerrar => (
        <ul className={ui.listaHoja}>
          <li><button type="button" className={ui.filaHoja} onClick={() => cerrar(onNuevo)}><Plus size={18} aria-hidden="true" />{T.nuevoServicio}</button></li>
          {puedeDuplicar && <li><button type="button" className={ui.filaHoja} onClick={() => cerrar(onDuplicar)}><Copy size={18} aria-hidden="true" />{T.duplicarServicio}</button></li>}
          {hayHistorial && <li><button type="button" className={ui.filaHoja} onClick={() => cerrar(onHistorial)}><History size={18} aria-hidden="true" />{T.verHistorial}</button></li>}
          <li><button type="button" className={`${ui.filaHoja} ${ui.peligro}`} onClick={() => cerrar(onEliminar)}><Trash2 size={18} aria-hidden="true" />{T.eliminarServicio}</button></li>
        </ul>
      )}
    </HojaBase>
  )
}

/** Los servicios que no terminaron y, bajo «Ver historial», los últimos terminados. */
export function HojaCambiarServicio({ services, actualId, historialAbierto, onElegir, onCerrar }: { services: Service[]; actualId: string | null; historialAbierto: boolean; onElegir: (id: string) => void; onCerrar: () => void }) {
  const id = useId(), [historial, setHistorial] = useState(historialAbierto)
  const ahora = new Date(), terminado = (s: Service) => servicioTerminado(s.fecha, s.hora_fin, ahora, s.hora_inicio)
  const proximos = services.filter(s => !terminado(s)), pasados = services.filter(terminado).slice().reverse().slice(0, 10)
  const fila = (s: Service, cerrar: (d?: () => void) => void) => (
    <li key={s.id}><button type="button" className={`${ui.filaHoja} ${s.id === actualId ? ui.filaElegida : ''}`} aria-current={s.id === actualId ? 'true' : undefined} onClick={() => cerrar(() => onElegir(s.id))}>{etiquetaDeServicio(s)}</button></li>
  )
  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={<Titulo id={id}>{T.cambiarServicio}</Titulo>}>
      {cerrar => (
        <>
          {proximos.length === 0 ? <p className={ui.ayuda} style={{ margin: '0.5rem 0.25rem' }}>{T.sinServiciosFuturos}</p> : <ul className={ui.listaHoja}>{proximos.map(s => fila(s, cerrar))}</ul>}
          {pasados.length > 0 && (
            <>
              <button type="button" className={ui.enlace} aria-expanded={historial} onClick={() => setHistorial(h => !h)}>{historial ? T.ocultarHistorial : T.verHistorial}</button>
              {historial && <ul className={ui.listaHoja}>{pasados.map(s => fila(s, cerrar))}</ul>}
            </>
          )}
        </>
      )}
    </HojaBase>
  )
}

/** Las dos horas del servicio; guarda con /api/update-service (la ruta de hoy) solo la que cambió y avisa para recargar el servicio. */
export function HojaHorario({ servicio, onGuardado, onCerrar }: { servicio: Service; onGuardado: () => void; onCerrar: () => void }) {
  const id = useId()
  const ini0 = (servicio.hora_inicio || '10:00').slice(0, 5), fin0 = (servicio.hora_fin || '14:00').slice(0, 5)
  const [inicio, setInicio] = useState(ini0), [fin, setFin] = useState(fin0), [guardando, setGuardando] = useState(false), [fallo, setFallo] = useState(false)
  async function guardar(cerrar: (d?: () => void) => void) {
    setGuardando(true); setFallo(false)
    try {
      const pedidos: Promise<Response>[] = []
      if (inicio !== ini0) pedidos.push(fetch('/api/update-service',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:servicio.id,hora_inicio:inicio})}))
      if (fin !== fin0) pedidos.push(fetch('/api/update-service',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:servicio.id,hora_fin:fin})}))
      const rs = await Promise.all(pedidos)
      if (rs.some(r => !r.ok)) { setFallo(true); setGuardando(false); return }
      cerrar(onGuardado)
    } catch { setFallo(true) }
    setGuardando(false)
  }
  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={<Titulo id={id}>{T.cambiarHorario}</Titulo>}>
      {cerrar => (
        <form className={ui.formHoja} onSubmit={e => { e.preventDefault(); void guardar(cerrar) }}>
          <div className={ui.par}>
            <label className={ui.campo}><span className={ui.etiqueta}>{T.horaInicio}</span><input type="time" className={ui.entrada} value={inicio} onChange={e => setInicio(e.target.value)} required /></label>
            <label className={ui.campo}><span className={ui.etiqueta}>{T.horaFin}</span><input type="time" className={ui.entrada} value={fin} onChange={e => setFin(e.target.value)} required /></label>
          </div>
          {fallo && <p className={ui.fallo} role="alert">{T.noSePudoGuardarHorario}</p>}
          <button type="submit" className={ui.guardar} disabled={guardando || !inicio || !fin}>{guardando ? T.guardando : T.guardar}</button>
        </form>
      )}
    </HojaBase>
  )
}

export function HojaDuplicar({ onDuplicar, onCerrar }: { onDuplicar: (fecha: string) => void; onCerrar: () => void }) {
  const id = useId(), [fecha, setFecha] = useState('')
  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={<Titulo id={id}>{T.duplicarServicio}</Titulo>}>
      {cerrar => (
        <form className={ui.formHoja} onSubmit={e => { e.preventDefault(); if (fecha) cerrar(() => onDuplicar(fecha)) }}>
          <label className={ui.campo}><span className={ui.etiqueta}>{T.duplicarAFecha}</span><input type="date" className={ui.entrada} value={fecha} onChange={e => setFecha(e.target.value)} required /></label>
          <button type="submit" className={ui.guardar} disabled={!fecha}>{T.duplicar}</button>
        </form>
      )}
    </HojaBase>
  )
}

const HERRAMIENTAS_OFRECIDAS: ToolType[] = ['setlist', 'schedule', 'checklist', 'notes']
/** Las herramientas que se pueden añadir a un equipo (la misma lista de escritorio, sin «Subir archivo»). */
export function HojaAnadirHerramienta({ onElegir, onCerrar }: { onElegir: (tipo: ToolType) => void; onCerrar: () => void }) {
  const id = useId()
  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={<Titulo id={id}>{T.anadirHerramientaTitulo}</Titulo>}>
      {cerrar => (
        <ul className={ui.listaHoja}>
          {HERRAMIENTAS_OFRECIDAS.map(t => <li key={t}><button type="button" className={ui.filaHoja} onClick={() => cerrar(() => onElegir(t))}>{nombreDeHerramienta(t)}<ChevronRight size={16} aria-hidden="true" style={{ marginLeft: 'auto' }} /></button></li>)}
        </ul>
      )}
    </HojaBase>
  )
}

export function HojaPersona({ nombre, onVer, onCerrar }: { nombre: string; onVer: () => void; onCerrar: () => void }) {
  const id = useId()
  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={<Titulo id={id}>{nombre}</Titulo>}>
      {cerrar => (
        <ul className={ui.listaHoja}>
          <li><button type="button" className={ui.filaHoja} onClick={() => cerrar(onVer)}><User size={18} aria-hidden="true" />{T.verPersona}</button></li>
        </ul>
      )}
    </HojaBase>
  )
}
