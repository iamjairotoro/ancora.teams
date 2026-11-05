'use client'
// SU equipo en el detalle del servicio (etapas 2 y 4; tablero Servicio-Lider-B): cuántos confirmaron, las herramientas del equipo como píldoras, «Voluntarios · N de M» con «Gestionar equipo», y las posiciones en tarjetas. Al tocar
// una posición se abre su ventana (HojaPosicionLider: cupos, personas y asignar). Es el ÚNICO bloque que escribe (por lib/lider/cliente → /api/lider/*, que decide en el servidor si puede); la ventana solo le avisa. «Notificar» no
// está: la convocatoria la envía quien administra.
import { useId, useState } from 'react'
import { Check, Clock, ListChecks, Plus, StickyNote } from 'lucide-react'
import HojaBase from '../admin-movil/HojaBase'
import hoja from '@/app/portal/_components/disponibilidad/hoja.module.css'
import { TeamMono } from '../TeamColor'
import { enviar } from '@/lib/lider/cliente'
import { cifrasDeEquipo } from '@/lib/lider/asignarLider'
import { TIPOS_HERRAMIENTA, type EquipoPropio as Datos, type TipoHerramienta } from '@/lib/lider/servicioLider'
import { fechaCorta } from '@/lib/admin/servicioMovil'
import { TEXTOS_LIDER as T, TEXTOS_LIDER_EDICION as TE, TEXTOS_LIDER_SERVICIO as TS, confirmadosDe, faltaN, voluntariosDe } from '@/lib/textos/servicioLider'
import pantallas from '../servicio-movil/pantallas.module.css'
import HojaPosicionLider from './HojaPosicionLider'
import ui from './lider-movil.module.css'

export type Vista = 'checklist' | 'horario' | 'notas' | 'equipo'
const ETIQUETA = { 'confirmo': T.confirmo, 'sin-responder': T.sinResponder, 'declino': T.declino } as const
const ICONO: Record<TipoHerramienta, typeof ListChecks> = { checklist: ListChecks, schedule: Clock, notes: StickyNote }
const iniciales = (nombre: string, apellido: string) => `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toLocaleUpperCase('es')
const NOMBRE_TIPO: Record<TipoHerramienta, string> = { checklist: TE.tipoChecklist, schedule: TE.tipoHorario, notes: TE.tipoNotas }
const VISTA_DE: Record<TipoHerramienta, Vista> = { checklist: 'checklist', schedule: 'horario', notes: 'notas' }
const Titulo = ({ id, children }: { id: string; children: React.ReactNode }) => <h2 id={id} className={hoja.titulo}>{children}</h2>

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

export default function EquipoPropio({ equipo, servicioId, fecha, cerrado, irA, onCambio }: { equipo: Datos; servicioId: string; fecha: string; cerrado: boolean; irA: (v: Vista, ref: string) => void; onCambio: () => void }) {
  const [abierta, setAbierta] = useState<string | null>(null)      // la posición cuya ventana está abierta (se vuelve a buscar en equipo.posiciones: siempre al día)
  const [hojaHerr, setHojaHerr] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const tiene = new Set(equipo.herramientas.map(h => h.tipo)), faltan = TIPOS_HERRAMIENTA.filter(t => !tiene.has(t))
  const hacer = async (r: ReturnType<typeof enviar>) => { setOcupado(true); setError(null); const x = await r; setOcupado(false); if (x.ok) onCambio(); else { setError(x.error); onCambio() } }
  const c = cifrasDeEquipo(equipo.posiciones)
  const posicion = abierta ? equipo.posiciones.find(p => p.id === abierta) ?? null : null

  return (
    <section className={`${ui.tarjeta} ${ui.propia}`} aria-label={`${equipo.nombre}. ${T.tuEquipo}`}>
      <div className={ui.cabEquipo}>
        <div className={ui.cab} style={{ padding: 0, minHeight: 0 }}><TeamMono name={equipo.nombre} color={equipo.color} /><span className={ui.cabNombre}>{equipo.nombre}</span><span className={ui.etiqueta}>{T.tuEquipo}</span></div>
        <div className={ui.chipsEquipo}>
          <span className={ui.chipEstado}>{confirmadosDe(c.confirmados, c.cupos)}</span>
          {c.faltan > 0 ? <span className={`${ui.chipEstado} ${ui.chipFaltan}`}>{faltaN(c.faltan)}</span> : c.cupos > 0 && <span className={`${ui.chipEstado} ${ui.chipListo}`}>{TS.todoConfirmado}</span>}
        </div>
      </div>
      <div className={ui.cuerpoEquipo}>
        {cerrado && <p className={ui.avisoCerrado}>{TE.cerrado}</p>}
        <h3 className={ui.seccionEquipo}>{TS.herramientasDelEquipo}</h3>
        <div className={ui.herramientas}>
          {equipo.herramientas.map(h => { const Icono = ICONO[h.tipo]; return (
            <button key={h.id} type="button" className={ui.pildoraHerr} onClick={() => irA(VISTA_DE[h.tipo], h.id)}><Icono size={18} aria-hidden="true" />{h.tipo === 'checklist' && equipo.herramientas.filter(x => x.tipo === 'checklist').length === 1 ? T.checklist : h.nombre}</button>
          ) })}
          {faltan.length > 0 && <button type="button" className={`${ui.pildoraHerr} ${ui.pildoraPunteada}`} disabled={ocupado} onClick={() => setHojaHerr(true)} aria-label={TE.agregarHerramienta}><Plus size={18} aria-hidden="true" />{TS.anadir}</button>}
        </div>
        <div className={ui.filaTitulo}>
          <h3 className={ui.seccionEquipo}>{voluntariosDe(c.asignados, c.cupos)}</h3>
          <button type="button" className={ui.enlaceGestionar} onClick={() => irA('equipo', equipo.id)}>{TS.gestionarEquipo}</button>
        </div>
        <p className={ui.ayudaEquipo}>{TS.ayudaPosiciones}</p>
        {equipo.posiciones.length === 0 ? <p className={ui.ayudaEquipo}>{TS.sinPosiciones}</p> : (
          <div className={ui.posGrid}>
            {equipo.posiciones.map(p => { const asignadas = p.slots.filter(s => s.persona).length; return (
              <button key={p.id} type="button" className={`${ui.posTarjeta}${asignadas === 0 ? ` ${ui.posVacia}` : ''}`} onClick={() => setAbierta(p.id)} aria-label={`${p.nombre}: ${asignadas}/${p.cupos}. ${TE.asignar}`}>
                <span className={ui.posTarjetaCab}><span className={ui.posTarjetaNombre}>{p.nombre}</span><span className={ui.posTarjetaN}>{asignadas}/{p.cupos}</span></span>
                {p.slots.map(s => (
                  <span key={s.slot} className={ui.posSlot}>
                    {s.persona ? (
                      <>
                        <span className={ui.avatarMini} aria-hidden="true">{iniciales(s.persona.nombre, s.persona.apellido)}</span>
                        <span className={ui.posSlotTxt}><span className={ui.posSlotNombre}>{`${s.persona.nombre} ${s.persona.apellido}`.trim()}</span>{s.persona.estado !== 'confirmo' && <span className={`${ui.posSlotEstado}${s.persona.estado === 'declino' ? ` ${ui.posSlotNo}` : ''}`}>{ETIQUETA[s.persona.estado]}</span>}</span>
                        {s.persona.estado === 'confirmo' && <Check size={16} className={ui.checkOk} role="img" aria-label={T.confirmo} />}
                      </>
                    ) : (
                      <><span className={`${ui.avatarMini} ${ui.avatarMiniVacio}`} aria-hidden="true" /><span className={`${ui.posSlotNombre} ${ui.posFalta}`}>{faltaN(1)}</span></>
                    )}
                  </span>
                ))}
              </button>
            ) })}
          </div>
        )}
        {error && <p className={ui.error} role="alert" style={{ padding: 0 }}>{error}</p>}
        <p className={ui.notaEquipo}>{TE.convoca}</p>
      </div>
      {posicion && <HojaPosicionLider posicion={posicion} equipo={equipo.nombre} fecha={fechaCorta(fecha).split(' ').slice(1).join(' ') || fecha} integrantes={equipo.integrantes} cerrado={cerrado} ocupado={ocupado} onCerrar={() => setAbierta(null)}
        onCupos={n => hacer(enviar('cupos', { servicio: servicioId, posicion: posicion.id, cupos: n }))}
        onElegir={(slot, persona) => hacer(enviar('asignar', { servicio: servicioId, posicion: posicion.id, slot, persona }))}
        onQuitar={slot => hacer(enviar('asignar', { servicio: servicioId, posicion: posicion.id, slot, persona: null }))} />}
      {hojaHerr && <HojaHerramienta faltan={faltan} onCerrar={() => setHojaHerr(false)} onElegir={tipo => hacer(enviar('herramientas', { accion: 'agregar', equipo: equipo.id, tipo }))} />}
    </section>
  )
}
