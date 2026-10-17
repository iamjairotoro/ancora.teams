'use client'
// El Equipo del servicio (punto 54, commit 5): una tarjeta por equipo, con sus secciones (Voces, Banda…) y una fila por persona: avatar de 34 px, nombre, la posición debajo cuando el grupo mezcla posiciones y el estado a la
// derecha (círculo lleno con ✓ = «Confirmó»; círculo vacío = «Sin confirmar»). La propia persona: fila con un tono más claro, una marca de 3 px a la izquierda y la píldora «Tú» (nunca un bloque blanco). Una vacante:
// avatar de borde punteado y «Falta batería», sin números. NUNCA se muestra quién rechazó (el servidor ya no lo manda). La agrupación es lógica pura: lib/portal/equipoServicio.ts.
import { TeamMono, teamColorProps } from '@/components/TeamColor'
import type { EquipoAgrupado, FilaPersona } from '@/lib/portal/equipoServicio'
import ui from './servicio.module.css'

const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toLocaleUpperCase('es') || '?'

function Persona({ f, mostrarPosicion }: { f: FilaPersona; mostrarPosicion: boolean }) {
  const confirmo = f.estado === 'confirmo'
  return (
    <li className={`${ui.persona}${f.esYo ? ` ${ui.yo}` : ''}`}>
      <span className={ui.avatar} aria-hidden="true">{f.avatarUrl ? <img src={f.avatarUrl} alt="" /> : iniciales(f.nombre)}</span>
      <span className={ui.txt}>
        <span className={ui.nombre}><span>{f.nombre}</span>{f.esYo && <span className={ui.tu}>Tú</span>}</span>
        {mostrarPosicion && f.posiciones.length > 0 && <span className={ui.sub}>{f.posiciones.join(' · ')}</span>}
      </span>
      <span className={`${ui.punto2} ${confirmo ? ui.p2Ok : ui.p2Pe}`} role="img" aria-label={confirmo ? 'Confirmó' : 'Sin confirmar'}>{confirmo ? '✓' : ''}</span>
    </li>
  )
}

export default function EquipoServicio({ equipos }: { equipos: EquipoAgrupado[] }) {
  if (equipos.length === 0) return <div className={ui.tarjeta}><p className={ui.vacio}>Todavía no hay equipo asignado a este servicio.</p></div>
  return (
    <>
      {equipos.map(eq => (
        <section key={eq.team.id} className={`${ui.tarjeta} ${ui.equipo}`} aria-label={eq.team.name} {...teamColorProps(eq.team.color)}>
          <div className={ui.equipoCab}><TeamMono name={eq.team.name} color={eq.team.color} /><b>{eq.team.name}</b></div>
          {eq.grupos.map((g, gi) => (
            <div key={gi}>
              {g.titulo && <h3 className={ui.grupoTit}>{g.titulo}</h3>}
              <ul className={ui.lista}>
                {g.filas.map((f, i) => f.tipo === 'persona'
                  ? <Persona key={`${f.memberId}-${i}`} f={f} mostrarPosicion={g.mezcla} />
                  : (
                    <li key={`v-${f.posicion}-${i}`} className={ui.vacante}>
                      <span className={`${ui.avatar} ${ui.avatarVacante}`} aria-hidden="true" />
                      <span>Falta {f.posicion.toLocaleLowerCase('es')}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
      <p className={ui.leyenda} aria-hidden="true">
        <span><i className={`${ui.punto2} ${ui.p2Ok}`}>✓</i>Confirmó</span>
        <span><i className={`${ui.punto2} ${ui.p2Pe}`} />Sin confirmar</span>
      </p>
    </>
  )
}
