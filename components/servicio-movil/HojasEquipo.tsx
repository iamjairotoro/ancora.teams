'use client'
// La hoja de una POSICIÓN del equipo (fase 3 · B4, Equipo-G y H): cuántas personas pide en este servicio (− / +), quién la ocupa y quién falta, y la lista de personas para asignar.
//   · Sin nadie asignado abre directo en la lista «Tienen {posición} en su perfil» (Equipo-H); con gente abre en sus personas, con una fila «Falta {posición} N» y «Asignar» por cada cupo libre (Equipo-G).
//   · Cada persona asignada trae un «⋯»: Ver persona, Cambiar persona y Quitar de la posición.
// No escribe nada: avisa con `onElegir`, `onQuitar` y `onCupos`; es ServicioMovil quien llama a assignBanda y updateSlotsNeeded de la página (las ÚNICAS dos funciones por las que el teléfono toca estas tablas).
import { useId, useState } from 'react'
import { ChevronLeft, Ellipsis, Minus, Plus, Replace, Search, User, UserMinus } from 'lucide-react'
import { filtrarOpciones, type FichaDePersona, type OpcionAsignar, type PosicionDeEquipo } from '@/lib/admin/servicioMovil'
import { TEXTOS_SERVICIO as T, faltaCupo, nadieTienePosicion, posicionN, tienenEnPerfil, yaEstanTodas } from '@/lib/textos/servicio'
import HojaBase from '../admin-movil/HojaBase'
import hoja from '@/app/portal/_components/disponibilidad/hoja.module.css'
import ui from './pantallas.module.css'

const PUNTO: Record<string, string> = { confirmado: ui.puntoOk, rechazo: ui.puntoNo, 'otro-equipo': ui.puntoOtro }

export interface FilaPersonaHoja { slotIndex: number; memberId: string; nombre: string; iniciales: string; ficha: FichaDePersona }

export function HojaPosicion({ posicion, contexto, filas, perfilVacio, opcionesPara, onElegir, onQuitar, onVer, onCupos, onIrAPersonas, onCerrar }: {
  /** La posición con sus datos de ESTE servicio, siempre al día (la hoja se vuelve a dibujar cuando la página actualiza). */
  posicion: PosicionDeEquipo
  /** «Alabanza · dom 25 oct». */
  contexto: string
  filas: FilaPersonaHoja[]
  /** Nadie tiene esta posición en su perfil (distinto de «ya están todas asignadas»). */
  perfilVacio: boolean
  /** Los candidatos para el cupo `slot` (con `actualId` si se está cambiando a esa persona). */
  opcionesPara: (actualId?: string) => OpcionAsignar[]
  onElegir: (slotIndex: number, memberId: string) => void
  onQuitar: (slotIndex: number) => void
  onVer: (memberId: string) => void
  onCupos: (nuevo: number) => void
  onIrAPersonas: () => void
  onCerrar: () => void
}) {
  const id = useId(), [q, setQ] = useState('')
  // Qué se muestra: las personas de la posición, o la lista para llenar un cupo (`slot`, y `actual` si se cambia a alguien).
  const [vista, setVista] = useState<{ tipo: 'personas' } | { tipo: 'lista'; slot: number; actualId?: string }>(posicion.asignadas === 0 ? { tipo: 'lista', slot: posicion.libres[0] ?? 1 } : { tipo: 'personas' })
  const [menu, setMenu] = useState<number | null>(null)
  const irALista = (slot: number, actualId?: string) => { setQ(''); setMenu(null); setVista({ tipo: 'lista', slot, actualId }) }
  const volver = () => { setQ(''); setVista({ tipo: 'personas' }) }
  const slotLista = vista.tipo === 'lista' ? (vista.slot <= posicion.cupos ? vista.slot : (posicion.libres[0] ?? 1)) : 0
  const opciones = vista.tipo === 'lista' ? opcionesPara(vista.actualId) : [], visibles = filtrarOpciones(opciones, q)
  const conAtras = vista.tipo === 'lista' && posicion.asignadas > 0

  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={
      <div className={ui.cabAsignar}>
        {conAtras && <button type="button" className={ui.atrasHoja} onClick={volver} aria-label={T.volverAPosicion}><ChevronLeft size={22} aria-hidden="true" /></button>}
        <h2 id={id} className={hoja.titulo}>{posicion.nombre}</h2><span className={ui.contextoHoja}>{contexto}</span>
      </div>
    }>
      {cerrar => (
        <>
          <div className={ui.bloqueStepper}>
            <div className={ui.bloqueStepperTxt}><span className={ui.bloqueStepperT}>{T.personasEnPosicion}</span><span className={ui.bloqueStepperA}>{T.ayudaStepper}</span></div>
            <span className={ui.stepper}>
              <button type="button" className={ui.stepperBoton} aria-label={`${T.menosCupos}: ${posicion.nombre}`} disabled={posicion.cupos <= posicion.minimo} onClick={() => onCupos(posicion.cupos - 1)}><Minus size={20} aria-hidden="true" /></button>
              <span className={ui.stepperN} aria-live="polite">{posicion.cupos}</span>
              <button type="button" className={ui.stepperBoton} aria-label={`${T.masCupos}: ${posicion.nombre}`} disabled={posicion.cupos >= posicion.maximo} onClick={() => onCupos(posicion.cupos + 1)}><Plus size={20} aria-hidden="true" /></button>
            </span>
          </div>

          {vista.tipo === 'personas' ? (
            <ul className={ui.listaHoja}>
              {filas.map(f => (
                <li key={f.slotIndex} className={ui.filaPosicion}>
                  <div className={ui.filaPosicionCab}>
                    <span className={ui.opcionAv} aria-hidden="true">{f.iniciales}</span>
                    <span className={ui.opcionTxt}><span className={ui.opcionNombre}>{f.nombre}</span><span className={ui.opcionDetalle}>{posicionN(posicion.nombre, f.slotIndex)}</span></span>
                    <span className={ui.estadoPersona}><span className={`${ui.punto} ${PUNTO[f.ficha.estado] ?? ''}`} role="img" aria-label={f.ficha.texto} />{f.ficha.texto}</span>
                    <button type="button" className={ui.masFila} aria-label={`${T.masDeLaPersona}: ${f.nombre}`} aria-expanded={menu === f.slotIndex} onClick={() => setMenu(m => (m === f.slotIndex ? null : f.slotIndex))}><Ellipsis size={18} aria-hidden="true" /></button>
                  </div>
                  {f.ficha.bloqueo && <span className={ui.bloqueo} style={{ marginLeft: '3.25rem' }}>{T.bloqueoFecha}</span>}
                  {menu === f.slotIndex && (
                    <div className={ui.menuFila}>
                      <button type="button" className={ui.menuFilaBoton} onClick={() => cerrar(() => onVer(f.memberId))}><User size={16} aria-hidden="true" />{T.verPersona}</button>
                      <button type="button" className={ui.menuFilaBoton} onClick={() => irALista(f.slotIndex, f.memberId)}><Replace size={16} aria-hidden="true" />{T.cambiarPersona}</button>
                      <button type="button" className={`${ui.menuFilaBoton} ${ui.peligro}`} onClick={() => { setMenu(null); onQuitar(f.slotIndex) }}><UserMinus size={16} aria-hidden="true" />{T.quitarDePosicion}</button>
                    </div>
                  )}
                </li>
              ))}
              {posicion.libres.map(slot => (
                <li key={`libre-${slot}`} className={ui.filaPosicion}>
                  <div className={ui.filaPosicionCab}>
                    <span className={`${ui.opcionAv} ${ui.avatarVacio}`} aria-hidden="true" />
                    <span className={ui.opcionTxt}><span className={`${ui.opcionNombre} ${ui.vacanteFalta}`}>{faltaCupo(posicion.nombre, slot)}</span><span className={ui.opcionDetalle}>{T.sinAsignar}</span></span>
                    <button type="button" className={ui.asignarBoton} onClick={() => irALista(slot)}>{T.asignar}</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : opciones.length === 0 ? (
            <div className={ui.vacio} style={{ boxShadow: 'none' }}>
              <p className={ui.vacioA}>{perfilVacio ? nadieTienePosicion(posicion.nombre) : yaEstanTodas(posicion.nombre)}</p>
              {perfilVacio && <button type="button" className={ui.enlace} onClick={() => cerrar(onIrAPersonas)}>{T.irAPersonas}</button>}
            </div>
          ) : (
            <>
              <label className={ui.buscador}>
                <Search size={18} aria-hidden="true" />
                <input type="search" className={ui.buscadorInput} placeholder={T.buscarPersona} aria-label={T.buscarPersona} value={q} onChange={e => setQ(e.target.value)} />
              </label>
              <p className={ui.subtituloHoja}>{tienenEnPerfil(posicion.nombre)}</p>
              {visibles.length === 0 ? <p className={ui.ayuda} style={{ margin: '0.5rem 0.25rem' }}>{T.sinResultados}</p> : (
                <ul className={ui.listaHoja}>
                  {visibles.map(o => (
                    <li key={o.id}>
                      <button type="button" className={`${ui.opcion} ${!o.disponible ? ui.opcionApagada : ''}`} aria-current={o.esActual ? 'true' : undefined}
                        onClick={() => { if (!o.esActual) onElegir(slotLista, o.id); volver() }}>
                        <span className={ui.opcionAv} aria-hidden="true">{o.iniciales}</span>
                        <span className={ui.opcionTxt}><span className={ui.opcionNombre}>{o.nombre}</span><span className={ui.opcionDetalle}>{o.detalle}</span></span>
                        <span className={`${ui.estadoOpcion} ${o.disponible ? ui.chipOk : ui.chipFalta}`}>{o.disponible ? T.disponible : T.noDisponible}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <button type="button" className={ui.guardar} style={{ marginTop: '0.875rem' }} onClick={() => cerrar()}>{T.listo}</button>
        </>
      )}
    </HojaBase>
  )
}
