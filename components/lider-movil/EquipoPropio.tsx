'use client'
// SU equipo en el detalle del servicio (etapa 2): posiciones con sus cupos y personas, y los botones de sus herramientas. Es el ÚNICO bloque que escribe (por lib/lider/cliente → /api/lider/*, que decide en el servidor si
// puede). Recibe datos y navegación, no funciones de escritura de otra parte. «Notificar» no está: la convocatoria la envía quien administra.
import { useId, useState } from 'react'
import { ChevronRight, Minus, Plus, Trash2 } from 'lucide-react'
import HojaBase from '../admin-movil/HojaBase'
import hoja from '@/app/portal/_components/disponibilidad/hoja.module.css'
import pantallas from '../servicio-movil/pantallas.module.css'
import { TeamMono } from '../TeamColor'
import { enviar } from '@/lib/lider/cliente'
import { TIPOS_HERRAMIENTA, type EquipoPropio as Datos, type PosicionPropia, type TipoHerramienta } from '@/lib/lider/servicioLider'
import { TEXTOS_LIDER as T, TEXTOS_LIDER_EDICION as TE, personasN } from '@/lib/textos/servicioLider'
import ui from './lider-movil.module.css'

export type Vista = 'checklist' | 'horario' | 'notas' | 'equipo'
const ETIQUETA = { 'confirmo': T.confirmo, 'sin-responder': T.sinResponder, 'declino': T.declino } as const
const iniciales = (nombre: string, apellido: string) => `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toLocaleUpperCase('es')
const NOMBRE_TIPO: Record<TipoHerramienta, string> = { checklist: TE.tipoChecklist, schedule: TE.tipoHorario, notes: TE.tipoNotas }
const VISTA_DE: Record<TipoHerramienta, Vista> = { checklist: 'checklist', schedule: 'horario', notes: 'notas' }
const Titulo = ({ id, children }: { id: string; children: React.ReactNode }) => <h2 id={id} className={hoja.titulo}>{children}</h2>

function HojaAsignar({ equipo, posicion, slot, onElegir, onQuitar, onCerrar }: { equipo: Datos; posicion: PosicionPropia; slot: number; onElegir: (personaId: string) => void; onQuitar: () => void; onCerrar: () => void }) {
  const id = useId()
  const actual = posicion.slots.find(s => s.slot === slot)?.persona?.id ?? null
  const conPosicion = equipo.integrantes.filter(i => i.posiciones.includes(posicion.id)), otros = equipo.integrantes.filter(i => !i.posiciones.includes(posicion.id))
  const fila = (i: Datos['integrantes'][number], cerrar: (d?: () => void) => void) => (
    <li key={i.id}><button type="button" className={`${pantallas.filaHoja}${i.id === actual ? ` ${pantallas.filaElegida}` : ''}`} onClick={() => cerrar(() => onElegir(i.id))}>{`${i.nombre} ${i.apellido}`.trim()}</button></li>
  )
  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={<Titulo id={id}>{`${TE.elegirPersona} · ${posicion.nombre}`}</Titulo>}>
      {cerrar => (
        <>
          <p className={ui.nota}>{TE.soloEquipo}</p>
          {conPosicion.length === 0 && <p className={ui.nota}>{TE.nadieDisponible}</p>}
          <ul className={pantallas.listaHoja}>{conPosicion.map(i => fila(i, cerrar))}{otros.map(i => fila(i, cerrar))}</ul>
          {actual && <ul className={pantallas.listaHoja}><li><button type="button" className={`${pantallas.filaHoja} ${pantallas.peligro}`} onClick={() => cerrar(onQuitar)}><Trash2 size={18} aria-hidden="true" />{TE.quitarPersona}</button></li></ul>}
          <button type="button" className={`${pantallas.boton} ${ui.cancelarHoja}`} onClick={() => cerrar()}>Cancelar</button>
        </>
      )}
    </HojaBase>
  )
}

function HojaHerramienta({ faltan, onElegir, onCerrar }: { faltan: TipoHerramienta[]; onElegir: (t: TipoHerramienta) => void; onCerrar: () => void }) {
  const id = useId()
  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={<Titulo id={id}>{TE.agregarHerramienta}</Titulo>}>
      {cerrar => (
        <>
          <ul className={pantallas.listaHoja}>{faltan.map(t => <li key={t}><button type="button" className={pantallas.filaHoja} onClick={() => cerrar(() => onElegir(t))}>{NOMBRE_TIPO[t]}</button></li>)}</ul>
          <button type="button" className={`${pantallas.boton} ${ui.cancelarHoja}`} onClick={() => cerrar()}>Cancelar</button>
        </>
      )}
    </HojaBase>
  )
}

export default function EquipoPropio({ equipo, servicioId, cerrado, irA, onCambio }: { equipo: Datos; servicioId: string; cerrado: boolean; irA: (v: Vista, ref: string) => void; onCambio: () => void }) {
  const [hojaAsignar, setHojaAsignar] = useState<{ posicion: PosicionPropia; slot: number } | null>(null)
  const [hojaHerr, setHojaHerr] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const tiene = new Set(equipo.herramientas.map(h => h.tipo)), faltan = TIPOS_HERRAMIENTA.filter(t => !tiene.has(t))
  const hacer = async (r: ReturnType<typeof enviar>) => { setOcupado(true); setError(null); const x = await r; setOcupado(false); if (x.ok) onCambio(); else { setError(x.error); onCambio() } }
  const asignados = equipo.posiciones.flatMap(p => p.slots).filter(s => s.persona).length

  return (
    <section className={`${ui.tarjeta} ${ui.propia}`} aria-label={`${equipo.nombre}. ${T.tuEquipo}`}>
      <div className={ui.cab}><TeamMono name={equipo.nombre} color={equipo.color} /><span className={ui.cabNombre}>{equipo.nombre}</span><span className={ui.etiqueta}>{T.tuEquipo}</span><span className={ui.cuenta}>{personasN(asignados)}</span></div>
      {cerrado && <p className={ui.avisoCerrado}>{TE.cerrado}</p>}
      {equipo.posiciones.map(p => (
        <div key={p.id} className={ui.posicion}>
          <div className={ui.posCab}>
            <span className={ui.posNombre}>{p.nombre}</span>
            <span className={ui.paso} role="group" aria-label={`${TE.cupos}: ${p.nombre}`}>
              <button type="button" className={ui.pasoBtn} aria-label={`${TE.menosCupos}: ${p.nombre}`} disabled={cerrado || ocupado || p.cupos <= Math.max(1, ...p.slots.filter(s => s.persona).map(s => s.slot))} onClick={() => hacer(enviar('cupos', { servicio: servicioId, posicion: p.id, cupos: p.cupos - 1 }))}><Minus size={16} aria-hidden="true" /></button>
              <span aria-live="polite">{p.cupos}</span>
              <button type="button" className={ui.pasoBtn} aria-label={`${TE.masCupos}: ${p.nombre}`} disabled={cerrado || ocupado || p.cupos >= 20} onClick={() => hacer(enviar('cupos', { servicio: servicioId, posicion: p.id, cupos: p.cupos + 1 }))}><Plus size={16} aria-hidden="true" /></button>
            </span>
          </div>
          {p.slots.map(s => (
            <button key={s.slot} type="button" className={ui.slot} disabled={cerrado || ocupado} onClick={() => setHojaAsignar({ posicion: p, slot: s.slot })}
              aria-label={s.persona ? `${p.nombre}: ${s.persona.nombre} ${s.persona.apellido}. ${TE.cambiar}` : `${p.nombre}: ${TE.sinAsignar}. ${TE.asignar}`}>
              {s.persona ? (
                <>
                  <span className={ui.avatar} aria-hidden="true">{iniciales(s.persona.nombre, s.persona.apellido)}</span>
                  <span className={ui.personaTxt}><span className={ui.personaNombre}>{`${s.persona.nombre} ${s.persona.apellido}`.trim()}</span></span>
                  <span className={`${ui.estado}${s.persona.estado === 'confirmo' ? ` ${ui.estadoOk}` : ''}`}>{ETIQUETA[s.persona.estado]}</span>
                </>
              ) : (
                <><span className={ui.avatar} aria-hidden="true"><Plus size={16} /></span><span className={`${ui.personaTxt} ${ui.sinAsignar}`}>{TE.sinAsignar}</span><span className={ui.accion}>{TE.asignar}</span></>
              )}
            </button>
          ))}
        </div>
      ))}
      {error && <p className={ui.error} role="alert">{error}</p>}
      <div className={ui.acciones}>
        {equipo.herramientas.map(h => <button key={h.id} type="button" className={ui.boton} onClick={() => irA(VISTA_DE[h.tipo], h.id)}>{h.tipo === 'checklist' && equipo.herramientas.filter(x => x.tipo === 'checklist').length === 1 ? T.checklist : h.nombre}</button>)}
        <button type="button" className={ui.boton} onClick={() => irA('equipo', equipo.id)}>{TE.equipo}<ChevronRight size={16} aria-hidden="true" /></button>
        {faltan.length > 0 && <button type="button" className={ui.boton} disabled={ocupado} onClick={() => setHojaHerr(true)}><Plus size={16} aria-hidden="true" />{TE.agregarHerramienta}</button>}
      </div>
      <p className={ui.nota}>{TE.convoca}</p>
      {hojaAsignar && <HojaAsignar equipo={equipo} posicion={hojaAsignar.posicion} slot={hojaAsignar.slot} onCerrar={() => setHojaAsignar(null)}
        onElegir={persona => hacer(enviar('asignar', { servicio: servicioId, posicion: hojaAsignar.posicion.id, slot: hojaAsignar.slot, persona }))} onQuitar={() => hacer(enviar('asignar', { servicio: servicioId, posicion: hojaAsignar.posicion.id, slot: hojaAsignar.slot, persona: null }))} />}
      {hojaHerr && <HojaHerramienta faltan={faltan} onCerrar={() => setHojaHerr(false)} onElegir={tipo => hacer(enviar('herramientas', { accion: 'agregar', equipo: equipo.id, tipo }))} />}
    </section>
  )
}
