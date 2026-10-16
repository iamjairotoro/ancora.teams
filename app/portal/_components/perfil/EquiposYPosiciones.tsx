'use client'
// «Mis equipos y posiciones» (punto 54, commit 1): cada equipo con su monograma y sus posiciones (nunca instrumentos). El color de equipo es identidad: lleva el punto de la
// etiqueta y el monograma; el nombre del equipo va en tinta neutra (regla 10).
import { TeamMono, teamChipClass, teamColorProps } from '@/components/TeamColor'
import type { EquipoPerfil } from './tipos'
import ui from './perfil.module.css'

export default function EquiposYPosiciones({ equipos }: { equipos: EquipoPerfil[] }) {
  return (
    <section className={ui.tarjeta} aria-labelledby="perfil-equipos">
      <div className={ui.tCab}><h2 className={ui.tTit} id="perfil-equipos">Mis equipos y posiciones</h2></div>
      {equipos.length === 0 ? (
        <p className={ui.vacio}>Todavía no estás en ningún equipo.</p>
      ) : (
        <ul className={ui.equipos}>
          {equipos.map(e => (
            <li key={e.id} className={ui.equipo} {...teamColorProps(e.color)}>
              <span className={ui.eNombre}><TeamMono name={e.name} color={e.color} />{e.name}</span>
              <span className={ui.chips}>
                {e.posiciones.length === 0
                  ? <span className={ui.sinPos}>Sin posiciones asignadas</span>
                  : e.posiciones.map(p => <span key={p} className={teamChipClass}>{p}</span>)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
