'use client'
// La ficha de un servicio de las listas de Servicios en teléfono (admin y portal; mockups Lista-Admin y Lista-Usuario). `grande` es el servicio más cercano: bloque de fecha de 68, título 19/700, borde izquierdo
// de 6 con el color del equipo, «en N días» en azul encima del título y los chips y cuadritos debajo, a todo el ancho. La fila es una por servicio: fecha, nombre, horario, cuadritos de los equipos y chips de estado.
// Toda la ficha abre el servicio (`onAbrir`); `pie` (fuera del botón) lleva lo que tiene su propio botón, como «Responder».
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { masEquiposEtiqueta, masEquiposN } from '@/lib/textos/servicio'
import { teamColorProps } from '../TeamColor'
import ui from './ficha.module.css'

export interface CuadritoDeEquipo { teamId: string; nombre: string; color: string | null; inicial: string }
export interface Chip { texto: string; ambar?: boolean }

/** Los cuadritos de los equipos (máximo `maximo`; el resto va en «+N»). */
export function Cuadritos({ items, mas }: { items: CuadritoDeEquipo[]; mas: number }) {
  if (!items.length) return null
  return (
    <span className={ui.cuadritos}>
      {items.map(e => <span key={e.teamId} className={ui.cuadrito} role="img" aria-label={e.nombre} {...teamColorProps(e.color)}><span aria-hidden="true">{e.inicial}</span></span>)}
      {mas > 0 && <span className={ui.masEquipos} role="img" aria-label={masEquiposEtiqueta(mas)}><span aria-hidden="true">{masEquiposN(mas)}</span></span>}
    </span>
  )
}

export function Chips({ chips }: { chips: Chip[] }) {
  if (!chips.length) return null
  return <span className={ui.etiquetas}>{chips.map(c => <span key={c.texto} className={`${ui.chip}${c.ambar ? ` ${ui.chipAmbar}` : ''}`}>{c.texto}</span>)}</span>
}

export function PosicionDe({ texto, valor }: { texto: string; valor: string }) { return <p className={ui.posicion}>{texto} <b>{valor}</b></p> }
export function BotonResponder({ texto, onClick }: { texto: string; onClick: () => void }) { return <button type="button" className={ui.responder} onClick={onClick}>{texto}</button> }

export default function FichaServicio({ grande = false, fecha, nombre, horario, enDias, color, cuadritos, chips, pie, despues, terminado = false, ariaLabel, onAbrir }: {
  grande?: boolean
  fecha: { diaSemana: string; dia: string; mes: string }
  nombre: string
  horario?: string
  /** «en 4 días» (solo la ficha grande). */
  enDias?: string | null
  /** Color del equipo para el borde de la ficha grande (identidad: nunca lleva texto). */
  color?: string | null
  cuadritos?: ReactNode
  chips?: ReactNode
  pie?: ReactNode
  /** Lo que va debajo de la ficha, dentro del mismo elemento de lista (notas del día, aviso de día bloqueado). */
  despues?: ReactNode
  terminado?: boolean
  ariaLabel: string
  onAbrir: () => void
}) {
  const extras = grande ? <>{chips}{cuadritos}</> : <>{cuadritos}{chips}</>
  return (
    <li>
      <div className={`${ui.ficha}${grande ? ` ${ui.grande}` : ''}${terminado ? ` ${ui.terminada}` : ''}`} {...(grande ? teamColorProps(color) : {})}>
        <button type="button" className={ui.abrir} onClick={onAbrir} aria-label={ariaLabel}>
          <span className={ui.superior}>
            <span className={ui.dia} aria-hidden="true"><span>{fecha.diaSemana}</span><b>{fecha.dia}</b><span>{fecha.mes}</span></span>
            <span className={ui.cuerpo}>
              {grande && enDias && <span className={ui.enDias}>{enDias}</span>}
              <span className={ui.nombre}>{nombre}</span>
              {horario && <span className={ui.horario}>{horario}</span>}
              {!grande && extras}
            </span>
            {!grande && <ChevronRight size={16} className={ui.chev} aria-hidden="true" />}
          </span>
          {grande && <span className={ui.extras}>{extras}</span>}
        </button>
        {pie && <div className={ui.pie}>{pie}</div>}
      </div>
      {despues}
    </li>
  )
}
