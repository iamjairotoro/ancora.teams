'use client'
// Contenido de una fila de persona en TELÉFONO (Personas-E/F): avatar, nombre con su etiqueta (Propietario, Admin, Líder) y línea secundaria. Lo usan la lista de Personas y la de Equipos para que tengan exactamente la misma
// tipografía y medidas (persona-celda.module.css es la única fuente). Los contenedores de fila (botón de Personas, botón de Equipos) añaden `celda.fila`. Escritorio y tablet no lo dibujan: conservan su marcado.
import type { ReactNode } from 'react'
import PersonAvatar from '../PersonAvatar'
import ui from './persona-celda.module.css'

/** Clase que llevan los contenedores de fila de las dos listas: misma altura mínima y mismos rellenos. */
export const claseFilaPersona = ui.fila

export default function PersonaCelda({ avatarUrl, iniciales, nombre, etiqueta, secundaria }: {
  avatarUrl?: string | null
  iniciales: string
  nombre: string
  etiqueta?: string | null
  secundaria?: ReactNode
}) {
  return (
    <>
      <PersonAvatar className={ui.av} url={avatarUrl} initials={iniciales} />
      <span className={ui.quien}>
        <span className={ui.nmFila}>
          <span className={ui.nm}>{nombre}</span>
          {etiqueta && <span className={ui.etiqueta}>{etiqueta}</span>}
        </span>
        {secundaria ? <span className={ui.sub}>{secundaria}</span> : null}
      </span>
    </>
  )
}
