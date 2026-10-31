'use client'
// «Servicios» del LÍDER en teléfono (etapa 1; tablero Servicio-Lider-A): la lista de servicios, el detalle (su equipo con «Tu equipo» y los demás plegados, «Solo lectura») y el checklist de su equipo.
// SOLO LEE: todo viene de /api/lider/servicios y /api/lider/servicio, que recortan los datos en el servidor. Este componente no recibe ni importa ninguna función que escriba; el checklist escribe por su propia ruta,
// que autoriza al líder del equipo del recurso (requireTeamAccess). No hay «Asignar personas»: es una etapa posterior, con su propia ruta.
import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import ErrorDeCarga from '../ErrorDeCarga'
import { TeamMono } from '../TeamColor'
import ChecklistLider from '../servicio-movil/ChecklistLider'
import { fechaLarga } from '@/lib/home/hoy'
import { fechaCorta } from '@/lib/admin/servicioMovil'
import type { EquipoLider, ServicioDeLista } from '@/lib/lider/servicioLider'
import { TEXTOS_LIDER as T, ocultarEquipoN, personasN, verEquipoN } from '@/lib/textos/servicioLider'
import ui from './lider-movil.module.css'

export interface DestinoLider { servicio?: string | null; herramienta?: string | null }
type Carga<D> = { estado: 'cargando' } | { estado: 'ok'; datos: D } | { estado: 'error' } | { estado: 'prohibido' }

function useCarga<D>(url: string): [Carga<D>, () => void] {
  const [c, setC] = useState<Carga<D>>({ estado: 'cargando' })
  const [n, setN] = useState(0)
  useEffect(() => {
    let vigente = true
    setC({ estado: 'cargando' })
    fetch(url, { cache: 'no-store' }).then(async r => {
      if (!vigente) return
      if (r.status === 401 || r.status === 403) return setC({ estado: 'prohibido' })
      if (!r.ok) return setC({ estado: 'error' })
      setC({ estado: 'ok', datos: await r.json() as D })
    }).catch(() => { if (vigente) setC({ estado: 'error' }) })
    return () => { vigente = false }
  }, [url, n])
  return [c, useCallback(() => setN(x => x + 1), [])]
}

function Falla({ c, onReintentar }: { c: Carga<unknown>; onReintentar: () => void }) {
  if (c.estado === 'cargando') return <p className={ui.mensaje} role="status">{T.cargando}</p>
  if (c.estado === 'prohibido') return <p className={ui.mensaje}>{T.sinAcceso}</p>
  return <ErrorDeCarga compacto titulo={T.noSePudoCargar} cuerpo={T.noSePudoCargarCuerpo} onReintentar={onReintentar} />
}

const iniciales = (nombre: string, apellido: string) => `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toLocaleUpperCase('es')
const ETIQUETA = { 'confirmo': T.confirmo, 'sin-responder': T.sinResponder, 'declino': T.declino } as const

function Personas({ equipo }: { equipo: EquipoLider }) {
  if (equipo.personas.length === 0) return <p className={ui.vacioEquipo}>{T.nadieAsignado}</p>
  return (
    <ul className={ui.personas}>
      {equipo.personas.map((p, i) => (
        <li key={i} className={ui.persona}>
          <span className={ui.avatar} aria-hidden="true">{iniciales(p.nombre, p.apellido)}</span>
          <span className={ui.personaTxt}><span className={ui.personaNombre}>{`${p.nombre} ${p.apellido}`.trim()}</span><span className={ui.personaPos}>{p.posicion}</span></span>
          <span className={`${ui.estado}${p.estado === 'confirmo' ? ` ${ui.estadoOk}` : ''}`}>{ETIQUETA[p.estado]}</span>
        </li>
      ))}
    </ul>
  )
}

function ListaServicios({ irA }: { irA: (d: DestinoLider) => void }) {
  const [c, recargar] = useCarga<{ servicios: ServicioDeLista[] }>('/api/lider/servicios')
  return (
    <div className={ui.pagina}>
      <h1 className={ui.titulo}>{T.servicios}</h1>
      <p className={ui.ayuda}>{T.ayuda}</p>
      {c.estado !== 'ok' ? <Falla c={c} onReintentar={recargar} />
        : c.datos.servicios.length === 0 ? <p className={ui.mensaje}>{T.sinServicios}</p>
        : (
          <ul className={ui.lista}>
            {c.datos.servicios.map(s => {
              const dia = Number(s.fecha.split('-')[2])
              return (
                <li key={s.id}>
                  <button type="button" className={ui.fila} onClick={() => irA({ servicio: s.id })} aria-label={`${s.titulo}, ${fechaCorta(s.fecha)}, ${s.horas}`}>
                    <span className={ui.fecha} aria-hidden="true">{fechaCorta(s.fecha).split(' ')[0]}<span className={ui.fechaDia}>{dia}</span></span>
                    <span className={ui.filaTxt}><span className={ui.filaTit}>{s.titulo}</span><span className={ui.filaSub}>{s.horas}</span></span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
    </div>
  )
}

function DetalleServicio({ id, herramientaId, irA }: { id: string; herramientaId: string | null; irA: (d: DestinoLider) => void }) {
  const [c, recargar] = useCarga<{ servicio: ServicioDeLista; equipos: EquipoLider[] }>(`/api/lider/servicio?id=${encodeURIComponent(id)}`)
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const atras = (al: DestinoLider, etiqueta: string) => <button type="button" className={ui.atras} onClick={() => irA(al)} aria-label={etiqueta}><ChevronLeft size={22} aria-hidden="true" /><span>{T.servicios}</span></button>
  if (c.estado !== 'ok') return <div className={ui.pagina}>{atras({}, T.volverAServicios)}<Falla c={c} onReintentar={recargar} /></div>
  const { servicio, equipos } = c.datos
  const checklist = herramientaId ? equipos.flatMap(e => e.tuEquipo ? e.checklists : []).find(h => h.id === herramientaId) : undefined
  if (herramientaId) {
    return (
      <div className={ui.pagina}>
        {atras({ servicio: id }, T.volverAServicios)}
        {checklist ? <ChecklistLider servicioId={id} herramientaId={checklist.id} nombre={checklist.nombre} /> : <p className={ui.mensaje}>{T.sinAcceso}</p>}
      </div>
    )
  }
  return (
    <div className={ui.pagina}>
      {atras({}, T.volverAServicios)}
      <header>
        <h1 className={ui.titulo}>{fechaLarga(servicio.fecha)}</h1>
        <p className={ui.sub}>{servicio.horas} · {servicio.titulo}</p>
      </header>
      <p className={ui.ayuda}>{T.ayuda}</p>
      {equipos.map(e => e.tuEquipo ? (
        <section key={e.id} className={`${ui.tarjeta} ${ui.propia}`} aria-label={`${e.nombre}. ${T.tuEquipo}`}>
          <div className={ui.cab}><TeamMono name={e.nombre} color={e.color} /><span className={ui.cabNombre}>{e.nombre}</span><span className={ui.etiqueta}>{T.tuEquipo}</span><span className={ui.cuenta}>{personasN(e.personas.length)}</span></div>
          <Personas equipo={e} />
          {e.checklists.length > 0 && (
            <div className={ui.acciones}>
              {e.checklists.map(h => <button key={h.id} type="button" className={ui.boton} onClick={() => irA({ servicio: id, herramienta: h.id })}>{e.checklists.length === 1 ? T.checklist : h.nombre}</button>)}
            </div>
          )}
        </section>
      ) : (
        <section key={e.id} className={ui.tarjeta}>
          <button type="button" className={ui.cab} aria-expanded={abiertos.has(e.id)} aria-label={abiertos.has(e.id) ? ocultarEquipoN(e.nombre) : verEquipoN(e.nombre)}
            onClick={() => setAbiertos(a => { const n = new Set(a); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n })}>
            <TeamMono name={e.nombre} color={e.color} /><span className={ui.cabNombre}>{e.nombre}</span>
            <span className={ui.lectura}><Lock size={14} aria-hidden="true" />{T.soloLectura}</span><span className={ui.cuenta}>{e.personas.length}</span>
            <ChevronDown size={18} aria-hidden="true" style={{ transform: abiertos.has(e.id) ? 'rotate(180deg)' : undefined }} />
          </button>
          {abiertos.has(e.id) && <Personas equipo={e} />}
        </section>
      ))}
    </div>
  )
}

export default function ServiciosLider({ servicioId, herramientaId, irA }: { servicioId: string | null; herramientaId: string | null; irA: (d: DestinoLider) => void }) {
  return servicioId ? <DetalleServicio key={servicioId} id={servicioId} herramientaId={herramientaId} irA={irA} /> : <ListaServicios irA={irA} />
}
