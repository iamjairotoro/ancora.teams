'use client'
// «Mis equipos» (punto 54, commit 1, rediseño): SOLO el nombre del equipo, sin posiciones. Tarjetas en dos columnas de ALTO FIJO (108 px) con una franja de 5 px arriba del color del equipo,
// el monograma de 36 px (también del color del equipo) y el nombre abajo en una línea («…» si no cabe). El color es identidad y NUNCA lleva texto (regla 10): el nombre y la letra del
// monograma van en tinta neutra. Con un número impar de equipos la última tarjeta ocupa una celda y no se estira.
import { teamColorProps, teamInitial } from '@/components/TeamColor'
import type { EquipoPerfil } from './tipos'
import ui from './perfil.module.css'

export default function MisEquipos({ equipos, sinTitulo = false, etiqueta }: { equipos: EquipoPerfil[]; /** Sin el título «Mis equipos» (el Inicio del teléfono usa las mismas fichas, sin título; `etiqueta` las nombra). */ sinTitulo?: boolean; etiqueta?: string }) {
  return (
    <section aria-labelledby={sinTitulo ? undefined : 'perfil-equipos'} aria-label={sinTitulo ? etiqueta : undefined}>
      {!sinTitulo && <h2 className={ui.seccion} id="perfil-equipos">Mis equipos</h2>}
      {equipos.length === 0 ? (
        <p className={ui.vacio}>Todavía no estás en ningún equipo.</p>
      ) : (
        <ul className={ui.rejilla}>
          {equipos.map(e => (
            <li key={e.id} className={ui.equipo} {...teamColorProps(e.color)}>
              <span className={ui.mono} aria-hidden="true">{teamInitial(e.name)}</span>
              <span className={ui.eNombre} title={e.name}>{e.name}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
