'use client'
// El calendario de los dos Home en teléfono (mockups Home-Usuario-A y Home-Admin-A). Vista Semana o Mes, botón «Hoy», hoy con anillo, el día elegido relleno y bajo cada día sus marcas (punto = servicio,
// anillo = ensayo, raya = bloqueado). SIN tarjeta de detalle: tocar un día con servicio abre ese servicio; un día vacío no hace nada. Las fechas y las marcas las arma lib/home/calendario.ts (puras, con
// pruebas); este componente solo dibuja y navega entre semanas y meses (en Semana también se desliza el dedo). El color de equipo es identidad: la forma de la marca dice si es servicio, ensayo o bloqueo.
import { useRef, useState } from 'react'
import { LETRAS_SEMANA, marcasVisibles, mesDe, moverMes, semanaDe, servicioDelDia, sumarDias, tituloMes, type DiaCal, type MarcaDia } from '@/lib/home/calendario'
import { TEXTOS_HOME_NUEVO as T, marcasDelDia } from '@/lib/textos/homeNuevo'
import { teamColorProps } from '../TeamColor'
import ui from './calendario-home.module.css'

type Vista = 'semana' | 'mes'
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const etiquetaDe = (fecha: string, esHoy: boolean, n: number): string => { const [a, m, d] = fecha.split('-').map(Number); return `${DIAS[new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay()]} ${d}${esHoy ? ', hoy' : ''}${n ? `, ${marcasDelDia(n)}` : ''}` }

function Marcas({ marcas }: { marcas: MarcaDia[] }) {
  return (
    <span className={ui.marcas} aria-hidden="true">
      {marcas.map((m, i) => m.tipo === 'bloqueado'
        ? <span key={i} className={ui.raya} />
        : <span key={i} className={`${ui.punto}${m.tipo === 'ensayo' ? ` ${ui.ensayo}` : ''}${m.color ? '' : ` ${ui.neutro}`}`} {...(m.color ? teamColorProps(m.color) : {})} />)}
    </span>
  )
}

export default function CalendarioHome({ hoy, marcas, elegido, onAbrir, leyenda = false }: {
  /** El día de hoy en Chile (AAAA-MM-DD). */
  hoy: string
  marcas: Map<string, MarcaDia[]>
  /** El día que va relleno (por defecto, el del próximo servicio que pase quien llama; si no, hoy). */
  elegido?: string | null
  /** Tocar un día con servicio o ensayo. */
  onAbrir?: (servicioId: string, equipoId: string | null) => void
  /** La leyenda «Servicio · Ensayo · Bloqueado» (Home de usuario). */
  leyenda?: boolean
}) {
  const [vista, setVista] = useState<Vista>('semana')
  const [ref, setRef] = useState(hoy)               // el día que fija la semana y el mes mostrados
  const [tocado, setTocado] = useState<string | null>(null)
  const x0 = useRef<number | null>(null)
  const fijo = tocado ?? elegido ?? hoy
  const mes = { anio: +ref.slice(0, 4), mes: +ref.slice(5, 7) }
  const filas: DiaCal[][] = vista === 'semana' ? [semanaDe(ref, hoy)] : mesDe(mes.anio, mes.mes, hoy)
  const moverSemana = (n: number) => setRef(r => sumarDias(r, 7 * n))
  const mover = (n: number) => (vista === 'semana' ? moverSemana(n) : setRef(() => { const m = moverMes(mes, n); return `${m.anio}-${String(m.mes).padStart(2, '0')}-01` }))
  const volverAHoy = () => { setRef(hoy); setTocado(null) }
  const titulo = tituloMes(mes.anio, mes.mes)
  return (
    <section className={ui.raiz} aria-label={titulo}>
      <div className={ui.cab}>
        {vista === 'mes' && <button type="button" className={ui.nav} onClick={() => mover(-1)} aria-label={T.mesAnterior}>‹</button>}
        <h2 className={ui.titulo}>{titulo}</h2>
        {vista === 'mes' && <button type="button" className={ui.nav} onClick={() => mover(1)} aria-label={T.mesSiguiente}>›</button>}
        <button type="button" className={ui.hoy} onClick={volverAHoy}>{T.hoy}</button>
        <div className={ui.vista} role="group" aria-label={T.vistaCalendario}>
          <button type="button" aria-pressed={vista === 'semana'} onClick={() => { setVista('semana'); setRef(r => (r.slice(0, 7) === hoy.slice(0, 7) ? hoy : r)) }}>{T.semana}</button>
          <button type="button" aria-pressed={vista === 'mes'} onClick={() => setVista('mes')}>{T.mes}</button>
        </div>
      </div>
      {vista === 'semana' && <><button type="button" className={ui.sr} onClick={() => mover(-1)}>{T.semanaAnterior}</button><button type="button" className={ui.sr} onClick={() => mover(1)}>{T.semanaSiguiente}</button></>}
      <div className={ui.rejilla} role="group" aria-label={titulo}
        onTouchStart={e => { x0.current = e.touches[0].clientX }}
        onTouchEnd={e => { if (vista !== 'semana' || x0.current === null) return; const dx = e.changedTouches[0].clientX - x0.current; x0.current = null; if (Math.abs(dx) > 48) moverSemana(dx < 0 ? 1 : -1) }}>
        {LETRAS_SEMANA.map((l, i) => <span key={i} className={ui.letra} aria-hidden="true">{l}</span>)}
        {filas.flat().map(d => {
          const ms = marcasVisibles(marcas.get(d.fecha)), destino = onAbrir ? servicioDelDia(marcas.get(d.fecha)) : null, nSrv = (marcas.get(d.fecha) ?? []).filter(m => m.servicioId).length
          const clase = `${ui.celda}${d.esHoy ? ` ${ui.esHoy}` : ''}${d.fecha === fijo ? ` ${ui.elegido}` : ''}${d.delMes ? '' : ` ${ui.fuera}`}`
          const interior = <><span className={ui.dia}>{d.numero}</span><Marcas marcas={ms} /></>
          return destino
            ? <button key={d.fecha} type="button" className={clase} aria-label={etiquetaDe(d.fecha, d.esHoy, nSrv)} aria-current={d.esHoy ? 'date' : undefined} onClick={() => { setTocado(d.fecha); onAbrir?.(destino.servicioId, destino.equipoId) }}>{interior}</button>
            : <div key={d.fecha} role="group" className={clase} aria-label={etiquetaDe(d.fecha, d.esHoy, onAbrir ? 0 : nSrv)} aria-current={d.esHoy ? 'date' : undefined}>{interior}</div>
        })}
      </div>
      {leyenda && (
        <ul className={ui.leyenda}>
          <li><span className={ui.punto} style={{ ['--anc-team-a' as string]: 'var(--anc-ink-3)' }} aria-hidden="true" />{T.leyendaServicio}</li>
          <li><span className={`${ui.punto} ${ui.ensayo}`} style={{ ['--anc-team-a' as string]: 'var(--anc-ink-3)' }} aria-hidden="true" />{T.leyendaEnsayo}</li>
          <li><span className={ui.raya} aria-hidden="true" />{T.leyendaBloqueado}</li>
        </ul>
      )}
    </section>
  )
}
