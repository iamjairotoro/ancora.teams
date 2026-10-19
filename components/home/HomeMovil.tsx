'use client'
// Home en teléfono (Home · D): bajo la cabecera de modo (la pone AppShell), la fecha, el título «Home», el selector «Hoy | Calendario | Equipos» y una de tres vistas. Solo teléfono (≤ 768 px): el Home de escritorio
// (Home.tsx) no cambia. NO trae datos ni calcula nada propio: todo llega ya armado por la página, la misma que alimenta a Home.tsx (y la que recorta por rol).
//   · Hoy: la tarjeta del próximo servicio (administrador: por SERVICIO con una línea por equipo; líder: la de su equipo, con barra) y «Próximos servicios». «Necesita atención» no va aquí.
//   · Calendario: el mes con puntos por equipo, el panel del día («Por persona | Por equipo» con las fechas bloqueadas) y los cumpleaños (solo día y mes).
//   · Equipos: un chip por equipo con la nómina del próximo servicio por posición y el estado de cada persona, «Respuesta por equipo» (porcentaje por equipo, NUNCA por persona) y «Cómo se reparte la carga».
// «Ver los N del equipo» y «Ver las N personas» se despliegan en el lugar (aria-expanded). Estados por FORMA además de color (✓ confirmó · ○ sin responder · ✕ declinó).
import { useId, useState, type ReactNode } from 'react'
import { CheckCircle2, ChevronDown, Circle, MinusCircle, XCircle } from 'lucide-react'
import Segmentado from '@/app/portal/_components/segmentado/Segmentado'
import { TeamMono, teamColorProps } from '../TeamColor'
import { cuandoCumple, nombreCorto, textoServicios } from '@/lib/home/formato'
import { VISTAS_HOME, type VistaHome } from '@/lib/home/vistaMovil'
import type { RsvpStatus, TeamResponse, TeamTab, VolunteerLoad } from './Home'
import VistaHoy, { type VistaHoyProps } from './VistaHoy'
import ui from './home-movil.module.css'

const iniciales = (nombre: string) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toLocaleUpperCase('es') || '?'

export interface FilaNomina { id: string; personName: string | null; positionName: string; status: RsvpStatus | null; note?: string }
export interface CumpleFila { id: string; nombre: string; apellido: string | null; dia: number; mes: number; enDias: number }

export interface HomeMovilProps {
  fechaLabel: string
  vista: VistaHome
  onVista: (v: VistaHome) => void
  loading: boolean
  error: string | null
  onRetry: () => void
  hoy: VistaHoyProps
  calendario: {
    monthLabel: string; grid: ReactNode; onPrev: () => void; onNext: () => void
    selectedDate: string | null
    dia: { titulo: string; noDisponibles: number; servicio: { titulo: string; horario: string; onOpen: () => void } | null; bloqueos: ReactNode; otrosEquipos: string } | null
    onCerrarDia: () => void
  }
  cumples: CumpleFila[]
  equipos: {
    chips: TeamTab[]; activoId: string; onEquipo: (id: string) => void
    nomina: FilaNomina[]
    respuestas: TeamResponse[]
    carga: VolunteerLoad[]
    onPersona: (id: string) => void
  }
}

function Desplegable({ abierto, onAlternar, idPanel, texto, children }: { abierto: boolean; onAlternar: () => void; idPanel: string; texto: string; children?: ReactNode }) {
  return (
    <>
      {children}
      <button type="button" className={ui.filaEnlace} aria-expanded={abierto} aria-controls={idPanel} onClick={onAlternar}>
        <span>{texto}</span><ChevronDown size={16} aria-hidden="true" style={{ transform: abierto ? 'rotate(180deg)' : undefined }} />
      </button>
    </>
  )
}

const ESTADO: Record<RsvpStatus, { texto: string; clase: string; icono: ReactNode }> = {
  confirmed: { texto: 'Confirmó', clase: ui.eOk, icono: <CheckCircle2 size={16} aria-hidden="true" /> },
  pending: { texto: 'Sin responder', clase: '', icono: <Circle size={16} aria-hidden="true" /> },
  declined: { texto: 'Declinó', clase: ui.eNo, icono: <XCircle size={16} aria-hidden="true" /> },
  elsewhere: { texto: 'En otro equipo', clase: '', icono: <MinusCircle size={16} aria-hidden="true" /> },
}

const VISIBLES_NOMINA = 4, VISIBLES_CARGA = 3

export default function HomeMovil(p: HomeMovilProps) {
  const base = useId()
  const [nominaAbierta, setNominaAbierta] = useState(false), [cargaAbierta, setCargaAbierta] = useState(false)
  const eq = p.equipos
  const nomina = nominaAbierta ? eq.nomina : eq.nomina.slice(0, VISIBLES_NOMINA)
  const carga = cargaAbierta ? eq.carga : eq.carga.slice(0, VISIBLES_CARGA)

  if (p.error) {
    return (
      <div className={`${ui.tarjeta} ${ui.error}`} role="alert">
        <p>No se pudo cargar Home. {p.error}</p>
        <button type="button" className={ui.boton} onClick={p.onRetry}>Reintentar</button>
      </div>
    )
  }

  return (
    <div className={ui.raiz}>
      <div>
        <p className={ui.fecha}>{p.fechaLabel}</p>
        <h1 className={ui.titulo}>Home</h1>
      </div>
      <Segmentado className={ui.selector} etiqueta="Vista del Home" valor={p.vista} onCambio={p.onVista} opciones={VISTAS_HOME} />

      {p.vista === 'hoy' && <div className={ui.raiz}>{p.loading ? <p className={ui.vacio} role="status">Cargando…</p> : <VistaHoy {...p.hoy} />}</div>}

      {p.vista === 'calendario' && (
        <>
          <div className={`${ui.tarjeta} ${ui.mes}`}>
            <div className={ui.mesCab}>
              <button type="button" className={ui.nav} onClick={p.calendario.onPrev} aria-label="Mes anterior"><ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} aria-hidden="true" /></button>
              <b>{p.calendario.monthLabel}</b>
              <button type="button" className={ui.nav} onClick={p.calendario.onNext} aria-label="Mes siguiente"><ChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true" /></button>
            </div>
            {p.calendario.grid}
          </div>
          {p.calendario.dia ? (
            <section className={`${ui.tarjeta} ${ui.dia2}`} aria-label={p.calendario.dia.titulo}>
              <h2 className={ui.diaTit}>{p.calendario.dia.titulo}</h2>
              <p className={ui.diaSub}>{p.calendario.dia.noDisponibles === 0 ? 'Nadie bloqueó este día' : p.calendario.dia.noDisponibles === 1 ? '1 persona no disponible' : `${p.calendario.dia.noDisponibles} personas no disponibles`}</p>
              {p.calendario.dia.servicio && (
                <button type="button" className={ui.servicio} onClick={p.calendario.dia.servicio.onOpen}>
                  <span className={ui.filaTxt}><span className={ui.filaT}>{p.calendario.dia.servicio.titulo}</span>{p.calendario.dia.servicio.horario && <span className={ui.filaS}>{p.calendario.dia.servicio.horario}</span>}</span>
                  <span className={ui.chev}>Abrir ›</span>
                </button>
              )}
              {p.calendario.dia.bloqueos}
              {p.calendario.dia.otrosEquipos && <p className={ui.otros}>{p.calendario.dia.otrosEquipos}</p>}
            </section>
          ) : <p className={ui.vacio}>Toca un día para ver quién no está disponible.</p>}

          <h2 className={ui.seccion}>Cumpleaños</h2>
          <div className={ui.tarjeta}>
            {p.cumples.length === 0 && <p className={ui.vacio}>Nadie cumple en los próximos 30 días.</p>}
            {p.cumples.map(c => (
              <div key={c.id} className={ui.cumple}>
                <span className={ui.av} aria-hidden="true">{iniciales(`${c.nombre} ${c.apellido ?? ''}`)}</span>
                <span className={ui.cumpleNm}>{nombreCorto(c.nombre, c.apellido)}</span>
                <span className={`${ui.cuando}${c.enDias === 0 ? ` ${ui.hoyCumple}` : ''}`}>{cuandoCumple(c)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {p.vista === 'equipos' && (
        <>
          {eq.chips.length === 0 ? <p className={ui.vacio}>Todavía no hay equipos.</p> : (
            <>
              <h2 className={ui.seccion} id={`${base}-eq`}>Equipo del próximo servicio</h2>
              <div className={ui.chips} role="group" aria-labelledby={`${base}-eq`}>
                {eq.chips.map(t => (
                  <button key={t.id} type="button" className={ui.chip} aria-pressed={t.id === eq.activoId} onClick={() => eq.onEquipo(t.id)}>{t.name}</button>
                ))}
              </div>
              <div className={ui.tarjeta}>
                {eq.nomina.length === 0 && <p className={ui.vacio}>Este equipo no tiene posiciones para el próximo servicio.</p>}
                <div id={`${base}-nomina`}>
                  {nomina.map(f => {
                    const st = f.status ? ESTADO[f.status] : null
                    return (
                      <div key={f.id} className={ui.nom}>
                        <span className={`${ui.av}${f.personName ? '' : ` ${ui.avVacio}`}`} aria-hidden="true">{f.personName ? iniciales(f.personName) : ''}</span>
                        <span className={ui.quien}>
                          <span className={`${ui.quienN}${f.personName ? '' : ` ${ui.libre}`}`}>{f.personName ?? 'Sin asignar'}</span>
                          <span className={ui.quienP}>{f.positionName}</span>
                        </span>
                        {f.personName && (st
                          ? <span className={`${ui.estado} ${st.clase}`}>{st.icono}{f.note || st.texto}</span>
                          : <span className={ui.estado}>Sin convocar</span>)}
                      </div>
                    )
                  })}
                </div>
                {eq.nomina.length > VISIBLES_NOMINA && (
                  <Desplegable abierto={nominaAbierta} onAlternar={() => setNominaAbierta(v => !v)} idPanel={`${base}-nomina`} texto={nominaAbierta ? 'Ver menos' : `Ver los ${eq.nomina.length} del equipo`} />
                )}
              </div>
            </>
          )}

          {eq.respuestas.length > 0 && (
            <>
              <h2 className={ui.seccion}>Respuesta por equipo</h2>
              <div className={ui.tarjeta}>
                <p className={ui.sub}>Respuesta a convocatorias · últimos 3 meses</p>
                {eq.respuestas.map(r => (
                  <div key={r.teamId} className={ui.barra} {...teamColorProps(r.color)}>
                    <span className={ui.barraNm}><TeamMono name={r.teamName} color={r.color} />{r.teamName}</span>
                    <span className={ui.pista} role="img" aria-label={`${r.teamName}: confirmó ${r.confirmedPct} %, no pudo ${r.declinedPct} %, no respondió ${r.noReplyPct} %`}>
                      <span className={ui.relleno} style={{ width: `${r.confirmedPct}%` }} />
                    </span>
                    <span className={ui.valor}>{r.confirmedPct} %</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {eq.carga.length > 0 && (
            <>
              <h2 className={ui.seccion}>Cómo se reparte la carga</h2>
              <div className={ui.tarjeta}>
                <p className={ui.sub}>Servicios confirmados · últimos 3 meses</p>
                <div id={`${base}-carga`}>
                  {carga.map(v => (
                    <button key={v.personId} type="button" className={ui.cargaFila} onClick={() => eq.onPersona(v.personId)}>
                      <span className={ui.av} aria-hidden="true">{v.initials}</span>
                      <span className={ui.barraNm} style={{ flex: '0 0 6rem' }}>{nombreCorto(v.name.split(' ')[0], v.name.split(' ').slice(1).join(' '))}</span>
                      <span className={ui.pista}><span className={ui.relleno} style={{ width: `${Math.round((v.count / Math.max(1, v.maxCount)) * 100)}%` }} /></span>
                      <span className={ui.cargaVal}>{textoServicios(v.count)}</span>
                    </button>
                  ))}
                </div>
                {eq.carga.length > VISIBLES_CARGA && (
                  <Desplegable abierto={cargaAbierta} onAlternar={() => setCargaAbierta(v => !v)} idPanel={`${base}-carga`} texto={cargaAbierta ? 'Ver menos' : `Ver las ${eq.carga.length} personas`} />
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
