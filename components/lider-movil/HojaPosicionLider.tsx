'use client'
// La ventana de una POSICIÓN de SU equipo (teléfono, etapa 4; tableros Servicio-Lider-C y D): arriba cuántas personas pide en este servicio (− / +), debajo quién la ocupa y qué cupos faltan, y la lista para asignar
// («Buscar en tu equipo», «Tienen {posición} en su perfil», avisos «Sin otra asignación» / «Ya asignada en X», y «Bloqueó este día» deshabilitado).
// No escribe nada y no importa lib/lider/cliente: avisa con onCupos, onElegir y onQuitar, y es EquipoPropio quien llama al servidor (que vuelve a autorizar y a validar todo). Que «Bloqueó este día» salga deshabilitado
// es solo de pantalla: /api/lider/asignar no cambia.
import { useId, useState } from 'react'
import { ChevronLeft, Minus, Plus, Trash2 } from 'lucide-react'
import HojaBase from '../admin-movil/HojaBase'
import CampoBusqueda from '../campos/CampoBusqueda'
import hoja from '@/app/portal/_components/disponibilidad/hoja.module.css'
import ui from '../servicio-movil/pantallas.module.css'
import lider from './lider-movil.module.css'
import { filtrarPorNombre, opcionesDeAsignar } from '@/lib/lider/asignarLider'
import type { IntegrantePropio, PosicionPropia } from '@/lib/lider/servicioLider'
import { TEXTOS_LIDER_EDICION as TE } from '@/lib/textos/servicioLider'
import { TEXTOS_LIDER_SERVICIO as TS, asignarPosicion, contextoDeHoja, faltaPosicion, posicionDeCupo, tienenPosicionEnPerfil } from '@/lib/textos/servicioLider'

const MAX_CUPOS = 20
const ESTADO = { 'confirmo': TS.confirmo, 'sin-responder': TS.sinResponder, 'declino': TS.declino } as const
const iniciales = (n: string, a: string) => `${n[0] ?? ''}${a[0] ?? ''}`.toLocaleUpperCase('es')

export default function HojaPosicionLider({ posicion, equipo, fecha, integrantes, cerrado, ocupado, onCupos, onElegir, onQuitar, onCerrar }: {
  /** La posición con los datos de ESTE servicio, siempre al día (la hoja se vuelve a dibujar cuando la pantalla recarga). */
  posicion: PosicionPropia
  equipo: string
  /** «8 nov». */
  fecha: string
  integrantes: readonly IntegrantePropio[]
  cerrado: boolean
  ocupado: boolean
  onCupos: (nuevo: number) => void
  onElegir: (slot: number, personaId: string) => void
  onQuitar: (slot: number) => void
  onCerrar: () => void
}) {
  const id = useId()
  const [lista, setLista] = useState<{ slot: number; actualId: string | null } | null>(null), [q, setQ] = useState('')
  const minimo = Math.max(1, ...posicion.slots.filter(s => s.persona).map(s => s.slot))
  const abrirLista = (slot: number, actualId: string | null) => { setQ(''); setLista({ slot, actualId }) }
  const volver = () => { setQ(''); setLista(null) }
  const opciones = lista ? opcionesDeAsignar({ integrantes, posicionId: posicion.id, actualId: lista.actualId }) : []
  const visibles = filtrarPorNombre(opciones, q), conPerfil = visibles.filter(o => o.conPerfil), otras = visibles.filter(o => !o.conPerfil)
  const fila = (o: (typeof opciones)[number], cerrar: (d?: () => void) => void) => (
    <li key={o.id}>
      <button type="button" className={`${ui.opcion}${!o.disponible ? ` ${ui.opcionApagada}` : ''}`} aria-current={o.esActual ? 'true' : undefined} disabled={!o.disponible && !o.esActual || ocupado}
        onClick={() => { if (!o.esActual && lista) onElegir(lista.slot, o.id); volver() }}>
        <span className={ui.opcionAv} aria-hidden="true">{o.iniciales}</span>
        <span className={ui.opcionTxt}><span className={ui.opcionNombre}>{o.nombre}</span><span className={ui.opcionDetalle}>{o.detalle}</span></span>
        <span className={`${ui.estadoOpcion} ${o.disponible ? ui.chipOk : ui.chipFalta}`}>{o.disponible ? TS.disponible : TS.noDisponible}</span>
      </button>
    </li>
  )

  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={
      <div className={ui.cabAsignar}>
        {lista && <button type="button" className={ui.atrasHoja} onClick={volver} aria-label={TS.volverALaPosicion}><ChevronLeft size={22} aria-hidden="true" /></button>}
        <h2 id={id} className={hoja.titulo}>{lista ? asignarPosicion(posicion.nombre) : posicion.nombre}</h2><span className={ui.contextoHoja}>{contextoDeHoja(equipo, fecha)}</span>
      </div>
    }>
      {cerrar => (
        <>
          {!lista && (
            <>
              <div className={ui.bloqueStepper}>
                <div className={ui.bloqueStepperTxt}><span className={ui.bloqueStepperT}>{TS.personasEnPosicion}</span><span className={ui.bloqueStepperA}>{TS.ayudaCupos}</span></div>
                <span className={ui.stepper}>
                  <button type="button" className={ui.stepperBoton} aria-label={`${TE.menosCupos}: ${posicion.nombre}`} disabled={cerrado || ocupado || posicion.cupos <= minimo} onClick={() => onCupos(posicion.cupos - 1)}><Minus size={20} aria-hidden="true" /></button>
                  <span className={ui.stepperN} aria-live="polite">{posicion.cupos}</span>
                  <button type="button" className={ui.stepperBoton} aria-label={`${TE.masCupos}: ${posicion.nombre}`} disabled={cerrado || ocupado || posicion.cupos >= MAX_CUPOS} onClick={() => onCupos(posicion.cupos + 1)}><Plus size={20} aria-hidden="true" /></button>
                </span>
              </div>
              {cerrado && <p className={ui.ayuda} style={{ margin: '0 0.25rem 0.5rem' }}>{TS.cerradoSoloVer}</p>}
              <ul className={ui.listaHoja}>
                {posicion.slots.map(s => (
                  <li key={s.slot} className={ui.filaPosicion}>
                    <div className={ui.filaPosicionCab}>
                      {s.persona ? (
                        <>
                          <span className={ui.opcionAv} aria-hidden="true">{iniciales(s.persona.nombre, s.persona.apellido)}</span>
                          <span className={ui.opcionTxt}><span className={ui.opcionNombre}>{`${s.persona.nombre} ${s.persona.apellido}`.trim()}</span><span className={ui.opcionDetalle}>{posicionDeCupo(posicion.nombre, s.slot, posicion.cupos)} · {ESTADO[s.persona.estado]}</span></span>
                          <button type="button" className={lider.cambiarBoton} disabled={cerrado || ocupado} onClick={() => abrirLista(s.slot, s.persona!.id)} aria-label={`${TE.cambiar}: ${s.persona.nombre} ${s.persona.apellido}`.trim()}>{TE.cambiar}</button>
                          <button type="button" className={ui.masFila} disabled={cerrado || ocupado} onClick={() => onQuitar(s.slot)} aria-label={`${TE.quitarPersona}: ${s.persona.nombre} ${s.persona.apellido}`.trim()}><Trash2 size={18} aria-hidden="true" /></button>
                        </>
                      ) : (
                        <>
                          <span className={`${ui.opcionAv} ${ui.avatarVacio}`} aria-hidden="true" />
                          <span className={ui.opcionTxt}><span className={`${ui.opcionNombre} ${ui.vacanteFalta}`}>{faltaPosicion(posicion.nombre, s.slot, posicion.cupos)}</span><span className={ui.opcionDetalle}>{TE.sinAsignar}</span></span>
                          <button type="button" className={ui.asignarBoton} disabled={cerrado || ocupado} onClick={() => abrirLista(s.slot, null)}>{TE.asignar}</button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          {lista && (integrantes.length === 0 ? <p className={ui.ayuda} style={{ margin: '0.5rem 0.25rem' }}>{TS.sinIntegrantes}</p> : (
            <>
              <CampoBusqueda valor={q} onCambio={setQ} placeholder={TS.buscarEnTuEquipo} etiqueta={TS.buscarEnTuEquipo} />
              {visibles.length === 0 ? <p className={ui.ayuda} style={{ margin: '0.5rem 0.25rem' }}>{TS.sinResultados}</p> : (
                <>
                  {conPerfil.length > 0 && <><p className={ui.subtituloHoja}>{tienenPosicionEnPerfil(posicion.nombre)}</p><ul className={ui.listaHoja}>{conPerfil.map(o => fila(o, cerrar))}</ul></>}
                  {otras.length > 0 && <><p className={ui.subtituloHoja}>{TS.otrasPersonas}</p><ul className={ui.listaHoja}>{otras.map(o => fila(o, cerrar))}</ul></>}
                </>
              )}
            </>
          ))}
          <button type="button" className={ui.guardar} style={{ marginTop: '0.875rem' }} onClick={() => cerrar()}>{TS.listo}</button>
        </>
      )}
    </HojaBase>
  )
}
