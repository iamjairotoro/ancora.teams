'use client'
// La pantalla Inicio del portal (punto 54, commit 7, diseño B de Claudia). De arriba hacia abajo: «Hola, {nombre}» y «Tu agenda»; la tira de la semana (los días con servicio abren ese servicio); si hay convocatorias por responder,
// una línea que lleva a Servicios; la tarjeta destacada «Tu próximo servicio» (el siguiente que AÚN NO TERMINÓ, con la hora de Chile; una caja por equipo); «Lo que viene» (los dos siguientes, con «Acepto» / «No puedo»
// dentro si hay una convocatoria pendiente); y «Cumpleaños de tus equipos» (solo quienes comparten equipo contigo; día y mes, nunca el año). Favoritos y «Bloquear fecha» ya no están aquí (viven en Canciones y en
// Servicios → Disponibilidad). Toda la lógica de fechas es pura: lib/portal/inicio.ts.
import { ChevronRight } from 'lucide-react'
import { TeamMono, teamColorProps } from '@/components/TeamColor'
import { IndicadorEstado, vistaDeEntrada, type ControladorConvocatorias, type EntradaConvocatoria, type VistaEstado } from '../convocatorias'
import { bloqueFecha, porResponder, proximosServicios, puntosPorFecha, semanaActual, textoCumple, type GrupoServicio } from '@/lib/portal/inicio'
import { diasHasta, fechaConDia, hoyEnSantiago, textoRelativo } from '@/lib/portal/fechas'
import { horarioTexto } from '@/lib/portal/agruparServicios'
import type { Cumple } from '@/lib/portal/cumpleanos'
import { BotonModo } from '@/components/modo'
import { botonDelPortal, type AdministracionDeModo } from '@/lib/modo'
import { useAhora } from './useAhora'
import InicioTelefono, { type EquipoDeLaPersona } from './InicioTelefono'
import { useTelefonoYa } from '@/lib/useTelefonoYa'
import type { FichaFavorita } from '@/lib/home/favoritos'
import ui from './inicio.module.css'

export type EntradaInicioPortal = EntradaConvocatoria & { service: EntradaConvocatoria['service'] & { lugar?: string } }

const CLASE_PUNTO: Partial<Record<VistaEstado, string>> = { confirmado: ui.ppOk, pendiente: ui.ppPe, 'cambio-de-rol': ui.ppRol }
const textoEstado = (v: VistaEstado | null) => (v === 'confirmado' ? 'Confirmado' : v === 'cambio-de-rol' ? 'Tu rol cambió' : 'Sin responder')
const iniciales = (c: { nombre?: string | null; apellido?: string | null }) => `${c.nombre?.[0] ?? ''}${c.apellido?.[0] ?? ''}`.toLocaleUpperCase('es') || '?'

function Destacado({ g, ahora, onAbrir }: { g: GrupoServicio<EntradaInicioPortal>; ahora: Date; onAbrir: (servicioId: string, equipoId?: string | null) => void }) {
  const s = g.service, esEnsayo = s.tipo === 'ensayo'
  const rel = textoRelativo(diasHasta(s.fecha, hoyEnSantiago(ahora)))
  const horario = [horarioTexto(s.hora_inicio, s.hora_fin), s.lugar || null].filter(Boolean).join(' · ')
  const varias = g.entradas.length > 1
  return (
    <section className={ui.hero} aria-labelledby="inicio-proximo">
      <div className={ui.heroArriba}><h2 id="inicio-proximo" className={ui.heroEt}>{esEnsayo ? 'Tu próximo ensayo' : 'Tu próximo servicio'}</h2>{rel && <span className={ui.rel}>{rel}</span>}</div>
      <p className={ui.fecha}>{fechaConDia(s.fecha)}</p>
      {horario && <p className={ui.horario}>{horario}</p>}
      <div className={ui.cajas}>
        {g.entradas.map(e => {
          const v = vistaDeEntrada(e), pos = e.posiciones.join(' · ')
          return (
            <div key={e.team?.id ?? 'sin'} className={ui.caja} {...(e.team ? teamColorProps(e.team.color) : {})}>
              <div className={ui.cajaFila}>
                {e.team && <TeamMono name={e.team.name} color={e.team.color} />}
                <span className={ui.cajaTxt}><b>{e.team?.name ?? (esEnsayo ? 'Ensayo' : s.titulo || 'Servicio')}</b>{pos && <span>{pos}</span>}</span>
                <span className={ui.estado}><span className={`${ui.pp} ${(v && CLASE_PUNTO[v]) || ''}`} aria-hidden="true">{v === 'confirmado' ? '✓' : v === 'cambio-de-rol' ? '!' : ''}</span>{textoEstado(v)}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className={ui.heroBotones}>
        {g.entradas.map(e => (
          <button key={e.team?.id ?? 'sin'} type="button" className={ui.boton} onClick={() => onAbrir(s.id, e.team?.id)}>{varias && e.team ? `Ver servicio de ${e.team.name} ›` : 'Ver servicio ›'}</button>
        ))}
      </div>
    </section>
  )
}

function Siguiente({ g, conv, onAbrir, onIrServicios }: { g: GrupoServicio<EntradaInicioPortal>; conv: ControladorConvocatorias; onAbrir: (servicioId: string, equipoId?: string | null) => void; onIrServicios: () => void }) {
  const s = g.service, b = bloqueFecha(s.fecha), varias = g.entradas.length > 1, e = g.entradas[0]
  const v = vistaDeEntrada(e), pendiente = !varias && v === 'pendiente' && !e.cerrada
  const titulo = varias ? g.entradas.map(x => x.team?.name).filter(Boolean).join(' · ') : (e.team?.name ?? (s.tipo === 'ensayo' ? 'Ensayo' : s.titulo || 'Servicio'))
  const pos = varias ? `${g.entradas.length} equipos` : e.posiciones.join(' · ')
  const horario = [horarioTexto(s.hora_inicio, s.hora_fin), s.lugar || null].filter(Boolean).join(' · ')
  const estado = varias ? (g.entradas.some(x => vistaDeEntrada(x) === 'pendiente') ? 'Hay convocatorias sin responder' : 'Confirmado') : textoEstado(v)
  const abrir = () => (varias ? onIrServicios() : onAbrir(s.id, e.team?.id))
  return (
    <li className={ui.item} {...(!varias && e.team ? teamColorProps(e.team.color) : {})}>
      <button type="button" className={ui.fila} onClick={abrir} aria-label={`${fechaConDia(s.fecha)}, ${titulo}: ${estado}`}>
        {b && <span className={ui.bloque} aria-hidden="true"><span>{b.dow}</span><b>{b.dia}</b><span>{b.mes}</span></span>}
        <span className={ui.txt}>
          <b>{titulo}</b>
          {pos && <span>{pos}</span>}
          {horario && <span>{horario}</span>}
          <span className={ui.estadoTxt}>{v && !varias && <IndicadorEstado vista={v} />}{estado}</span>
        </span>
        <ChevronRight size={18} aria-hidden="true" className={ui.flecha} />
      </button>
      {pendiente && (
        <>
          <div className={ui.acciones}>
            <button type="button" className={ui.acepto} disabled={conv.ocupado} onClick={() => conv.responder(e, 'si')} aria-label={`Acepto${e.team ? ' en ' + e.team.name : ''}`}>Acepto</button>
            <button type="button" className={ui.noPuedo} disabled={conv.ocupado} onClick={() => conv.responder(e, 'no')} aria-label={`No puedo${e.team ? ' en ' + e.team.name : ''}`}>No puedo</button>
          </div>
          {conv.errorRespuesta && <p role="alert" className={ui.errorAcc}>{conv.errorRespuesta}</p>}
        </>
      )}
    </li>
  )
}

export default function Inicio({ nombre, administracion, entradas, conv, cumpleanos, onAbrirServicio, onIrServicios, equipos = [], favoritas = null, diasBloqueados, onAbrirCancion, onVerFavoritas }: {
  nombre: string
  /** Solo con sesión de Google y con rol (lo calcula el servidor): el botón «Modo Admin» / «Modo Líder» a la derecha del saludo, en teléfono. En escritorio vive en la píldora superior. */
  administracion?: AdministracionDeModo | null
  /** Mis tarjetas (convocatorias y ensayos), como las entrega /api/portal/me; las vacías («No convocado») no cuentan. */
  entradas: EntradaInicioPortal[]
  conv: ControladorConvocatorias
  cumpleanos: Cumple[]
  onAbrirServicio: (servicioId: string, equipoId?: string | null) => void
  /** Lleva a Servicios → Convocatorias. */
  onIrServicios: () => void
  /** Solo teléfono (Inicio nuevo): los equipos de la persona, sus favoritas (null = sin biblioteca), sus días bloqueados y a dónde llevan las favoritas. */
  equipos?: EquipoDeLaPersona[]
  favoritas?: FichaFavorita[] | null
  diasBloqueados?: ReadonlySet<string>
  onAbrirCancion?: (id: string) => void
  onVerFavoritas?: () => void
}) {
  const telefono = useTelefonoYa()
  const ahora = useAhora(), hoy = hoyEnSantiago(ahora)
  const { destacado, siguientes } = proximosServicios(entradas, ahora)
  const sinResponder = porResponder(entradas, ahora)
  const puntos = puntosPorFecha(entradas)
  if (telefono) return <InicioTelefono nombre={nombre} administracion={administracion} entradas={entradas} cumpleanos={cumpleanos} equipos={equipos} favoritas={favoritas} diasBloqueados={diasBloqueados ?? new Set()} onAbrirServicio={onAbrirServicio} onIrServicios={onIrServicios} onAbrirCancion={onAbrirCancion ?? (() => {})} onVerFavoritas={onVerFavoritas ?? (() => {})} />
  return (
    <div className={ui.pantalla}>
      <div className={ui.cab}>
        <div className={ui.saludoFila}>
          <p className={ui.saludo}>Hola, {nombre}</p>
          <BotonModo modo={botonDelPortal(administracion)} className={ui.modo} />
        </div>
        <h1 className={ui.titulo}>Tu agenda</h1>
      </div>

      <div className={ui.semana} role="group" aria-label="Esta semana">
        {semanaActual(hoy).map(d => {
          const ps = puntos.get(d.fecha) ?? [], clase = `${ui.dia}${d.pasado ? ` ${ui.pasado}` : ''}${d.esHoy ? ` ${ui.hoy}` : ''}`
          const interior = (
            <>
              <span className={ui.letra} aria-hidden="true">{d.letra}</span>
              <span className={ui.numero}>{d.numero}</span>
              <span className={ui.puntos} aria-hidden="true">{ps.map((p, i) => <span key={i} className={`${ui.punto}${p.color ? '' : ` ${ui.puntoNeutro}`}`} {...(p.color ? teamColorProps(p.color) : {})} />)}</span>
            </>
          )
          const etiqueta = `${fechaConDia(d.fecha)}${d.esHoy ? ', hoy' : ''}${ps.length ? `, ${ps.length === 1 ? 'tienes un servicio' : `tienes ${ps.length} servicios`}` : ''}`
          return ps.length
            ? <button key={d.fecha} type="button" className={clase} aria-label={etiqueta} aria-current={d.esHoy ? 'date' : undefined} onClick={() => onAbrirServicio(ps[0].servicioId, ps[0].equipoId)}>{interior}</button>
            : <div key={d.fecha} className={clase} aria-label={etiqueta} aria-current={d.esHoy ? 'date' : undefined} role="group">{interior}</div>
        })}
      </div>

      {sinResponder > 0 && (
        <button type="button" className={ui.aviso} onClick={onIrServicios}>
          <span>Tienes <b>{sinResponder} {sinResponder === 1 ? 'convocatoria' : 'convocatorias'}</b> por responder</span><ChevronRight size={18} aria-hidden="true" />
        </button>
      )}

      {destacado
        ? <Destacado g={destacado} ahora={ahora} onAbrir={onAbrirServicio} />
        : <p className={ui.vacio}>Cuando te convoquen a un servicio o a un ensayo, tu próxima cita aparecerá aquí.</p>}

      {siguientes.length > 0 && (
        <>
          <h2 className={ui.seccion}>Lo que viene</h2>
          <ul className={ui.lista}>{siguientes.map(g => <Siguiente key={g.service.id} g={g} conv={conv} onAbrir={onAbrirServicio} onIrServicios={onIrServicios} />)}</ul>
        </>
      )}

      {cumpleanos.length > 0 && (
        <>
          <h2 className={ui.seccion}>Cumpleaños de tus equipos</h2>
          <ul className={ui.cumples}>
            {cumpleanos.slice(0, 4).map(c => (
              <li key={c.id} className={`${ui.cumple}${c.enDias === 0 ? ` ${ui.cumpleHoy}` : ''}`}>
                <span className={ui.cumpleAv} aria-hidden="true">{c.avatar_url ? <img src={c.avatar_url} alt="" /> : iniciales(c)}</span>
                <span className={ui.cumpleNombre}>{c.nombre}</span>
                <span className={ui.cumpleDia}>{textoCumple(c)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
