'use client'
// El Equipo del servicio en TELÉFONO (mockup Portal-Equipo-A): primero tu equipo, abierto; los demás, cerrados con «N personas» y una flecha. Dentro, Banda, Voces y Otros, sin posiciones vacías. Tu fila destaca (franja de 6 con
// el color del equipo, fondo con tinte, avatar de 52 con aro, nombre 18/700, «TÚ» y el check grande con «Confirmado»). Nunca se muestra quién rechazó (el servidor ya no lo manda) ni porcentajes. La lógica: lib/portal/equipoTelefono.ts.
import { useState } from 'react'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { TeamMono, teamColorProps } from '@/components/TeamColor'
import type { EquipoAgrupado, FilaPersona } from '@/lib/portal/equipoServicio'
import { vistaEquipoTelefono, type EquipoTelefono } from '@/lib/portal/equipoTelefono'
import { TEXTOS_EQUIPO_PORTAL as T, abrirEquipo, personasDelEquipo } from '@/lib/textos/equipoPortal'
import ui from './equipo-telefono.module.css'

const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toLocaleUpperCase('es') || '?'

function Persona({ f, mostrarPosicion }: { f: FilaPersona; mostrarPosicion: boolean }) {
  const confirmo = f.estado === 'confirmo'
  const estado = confirmo ? T.confirmado : T.sinConfirmar
  return (
    <li className={`${ui.persona}${f.esYo ? ` ${ui.yo}` : ''}`}>
      <span className={ui.avatar} aria-hidden="true">{f.avatarUrl ? <img src={f.avatarUrl} alt="" /> : iniciales(f.nombre)}</span>
      <span className={ui.txt}>
        <span className={ui.nombre}><span>{f.nombre}</span>{f.esYo && <span className={ui.tu}>{T.tu}</span>}</span>
        {mostrarPosicion && f.posiciones.length > 0 && <span className={ui.sub}>{f.posiciones.join(' · ')}</span>}
      </span>
      <span className={ui.estado}>
        <span className={`${ui.check} ${confirmo ? ui.ok : ui.pe}`} role="img" aria-label={estado}>{confirmo && <Check size={f.esYo ? 20 : 15} strokeWidth={3} aria-hidden="true" />}</span>
        {f.esYo && <span className={`${ui.estadoTxt} ${confirmo ? ui.estadoOk : ui.estadoPe}`}>{estado}</span>}
      </span>
    </li>
  )
}

function Equipo({ e, abierto, onAlternar }: { e: EquipoTelefono; abierto: boolean; onAlternar: () => void }) {
  const id = `eq-${e.team.id}`
  return (
    <section className={ui.equipo} aria-label={e.team.name} {...teamColorProps(e.team.color)}>
      <button type="button" className={ui.cab} aria-expanded={abierto} aria-controls={id} aria-label={abrirEquipo(e.team.name, abierto)} onClick={onAlternar}>
        <TeamMono name={e.team.name} color={e.team.color} /><b>{e.team.name}</b>
        {!abierto && <span className={ui.cuenta}>{personasDelEquipo(e.personas)}</span>}
        {abierto ? <ChevronDown size={20} aria-hidden="true" className={ui.flecha} /> : <ChevronRight size={20} aria-hidden="true" className={ui.flecha} />}
      </button>
      {abierto && (
        <div id={id} className={ui.cuerpo}>
          {e.grupos.map((g, gi) => (
            <div key={gi}>
              {g.titulo && <h3 className={ui.grupoTit}>{g.titulo}</h3>}
              <ul className={ui.lista}>{g.filas.map((f, i) => <Persona key={`${f.memberId}-${i}`} f={f} mostrarPosicion={g.mezcla} />)}</ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function EquipoServicioTelefono({ equipos }: { equipos: EquipoAgrupado[] }) {
  const vista = vistaEquipoTelefono(equipos)
  const [alternados, setAlternados] = useState<Record<string, boolean>>({})
  if (vista.length === 0) return <div className={ui.vacioCaja}><p className={ui.vacio}>{T.vacio}</p></div>
  const primerOtro = vista.findIndex(e => !e.esMio && !e.abierto)
  const abierto = (e: EquipoTelefono) => alternados[e.team.id] ?? e.abierto
  return (
    <>
      {vista.map((e, i) => (
        <div key={e.team.id}>
          {i === primerOtro && primerOtro > 0 && <h2 className={ui.otros}>{T.otrosEquipos}</h2>}
          <Equipo e={e} abierto={abierto(e)} onAlternar={() => setAlternados(a => ({ ...a, [e.team.id]: !abierto(e) }))} />
        </div>
      ))}
      <p className={ui.leyenda} aria-hidden="true">
        <span><i className={`${ui.check} ${ui.ok} ${ui.chico}`}><Check size={11} strokeWidth={3} /></i>{T.leyendaConfirmo}</span>
        <span><i className={`${ui.check} ${ui.pe} ${ui.chico}`} />{T.leyendaSinConfirmar}</span>
      </p>
    </>
  )
}
