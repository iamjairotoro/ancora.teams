'use client'
// La pestaña Servicios del portal (punto 54, commit 3). Referencia: docs/mockup-musico-v2.html (Servicios · Convocatorias). Título «Servicios», el selector Convocatorias · Disponibilidad y la lista
// AGRUPADA POR DÍA: encabezado («Domingo, 4 de octubre»), su horario, una nota cuando varios equipos se cruzan («3 equipos te convocaron… solo puedes servir en uno») y una tarjeta por equipo
// (TarjetaConvocatoria, con sus acciones). Los ensayos y los servicios sin convocatoria usan la misma tarjeta común (TarjetaOtra). Un día bloqueado para todos los equipos lo dice y lleva a
// Disponibilidad. Disponibilidad (commit 4) es su propio componente, ../disponibilidad. La agrupación y la nota son lógica pura (lib/portal/agruparServicios.ts, con pruebas).
import type { ReactNode } from 'react'
import Segmentado from '../segmentado/Segmentado'
import TarjetaConvocatoria from '../convocatorias/TarjetaConvocatoria'
import { agruparPorDia, horarioTexto, type GrupoDia, type NotaDia } from '@/lib/portal/agruparServicios'
import { fechaConDia } from '@/lib/portal/fechas'
import type { EntradaConvocatoria } from '../convocatorias/tipos'
import type { ControladorConvocatorias } from '../convocatorias/useConvocatorias'
import TarjetaOtra from './TarjetaOtra'
import ui from './servicios.module.css'

export type EntradaServicioPortal = EntradaConvocatoria & { service: EntradaConvocatoria['service'] & { lugar?: string }; nominaSent?: boolean }
export type SegmentoServicios = 'convocatorias' | 'disponibilidad'

const OPCIONES: { valor: SegmentoServicios; texto: string }[] = [{ valor: 'convocatorias', texto: 'Convocatorias' }, { valor: 'disponibilidad', texto: 'Disponibilidad' }]

const diaDeSemana = (fecha: string) => fechaConDia(fecha).split(',')[0].toLocaleLowerCase('es')

function Nota({ nota, fecha }: { nota: NotaDia; fecha: string }) {
  return (
    <p className={ui.nota}>
      {nota.tipo === 'elegir' ? <><b>{nota.n} equipos</b> te convocaron para el {diaDeSemana(fecha)}. Solo puedes servir en uno: al aceptar, los otros quedan declinados.</>
        : nota.tipo === 'aceptaste' ? <>Aceptaste en <b>{nota.equipo}</b>. Los demás equipos quedaron declinados automáticamente y no cuentan como un «No pudo».</>
        : <>Ya aceptaste en <b>{nota.equipo}</b>. Solo puedes servir en un equipo a la vez: si aceptas en otro, dejas {nota.equipo}.</>}
    </p>
  )
}

function Dia({ g, c, onAbrir, onCambiarBloqueo }: { g: GrupoDia<EntradaServicioPortal>; c: ControladorConvocatorias; onAbrir: (e: EntradaServicioPortal) => void; onCambiarBloqueo: () => void }) {
  const titulo = fechaConDia(g.fecha)
  // Bloqueado y sin ninguna convocatoria de equipo: el día se resume en su aviso (no hay nada que responder; «Nominación pendiente» / «No convocado» no aportan). Con convocatorias, el aviso las acompaña.
  const soloAviso = g.bloqueado && g.tarjetas.length === 0 && !g.otros.some(e => e.invitation)
  return (
    <section className={ui.dia} aria-label={titulo}>
      <h2 className={ui.diaTitulo}>{titulo}</h2>
      {g.horario && !soloAviso && <p className={ui.horario}>{g.horario}</p>}
      {g.bloqueado && (
        <div className={ui.bloqueo}>
          <span className={ui.bloqueoTxt}><b>Bloqueaste este día</b><span>{soloAviso ? 'No recibes convocatorias' : 'Aun así tienes convocatorias'}</span></span>
          <button type="button" className={ui.cambiar} onClick={onCambiarBloqueo}>Cambiar ›</button>
        </div>
      )}
      {!soloAviso && (
        <>
          {g.nota && <Nota nota={g.nota} fecha={g.fecha} />}
          {g.tarjetas.map(e => (
            <TarjetaConvocatoria key={`${e.service.id}-${e.team!.id}`} entrada={e} c={c} onAbrir={() => onAbrir(e)}
              cabecera={g.horaPorTarjeta ? horarioTexto(e.service.hora_inicio, e.service.hora_fin) : null} />
          ))}
          {g.otros.map(e => <TarjetaOtra key={`${e.service.id}-${e.invitation?.id ?? 'sin'}`} entrada={e} conHora={g.horaPorTarjeta} onAbrir={() => onAbrir(e)} />)}
        </>
      )}
    </section>
  )
}

export default function Servicios({ entradas, conv, bloqueados, segmento, onSegmento, onAbrir, disponibilidad }: {
  /** Una por tarjeta, más una vacía por cada servicio sin convocatoria para la persona (así las arma /api/portal/me). */
  entradas: EntradaServicioPortal[]
  conv: ControladorConvocatorias
  /** Fechas que la persona bloqueó para todos sus equipos. */
  bloqueados: ReadonlySet<string>
  onAbrir: (e: EntradaServicioPortal) => void
  /** El selector vive en PortalApp: el Inicio y el enlace viejo de disponibilidad abren directo la pestaña Disponibilidad. */
  segmento: SegmentoServicios
  onSegmento: (s: SegmentoServicios) => void
  /** El contenido de la pestaña Disponibilidad (commit 4); solo se monta al abrirla. */
  disponibilidad: ReactNode
}) {
  const grupos = agruparPorDia(entradas, bloqueados)
  return (
    <div className={ui.pantalla}>
      <h1 className={ui.titulo}>Servicios</h1>
      <Segmentado opciones={OPCIONES} valor={segmento} onCambio={onSegmento} etiqueta="Ver en Servicios" />
      {segmento === 'disponibilidad' ? (
        <section aria-label="Disponibilidad">{disponibilidad}</section>
      ) : grupos.length === 0 ? (
        <p className={ui.vacio}>No hay servicios programados próximamente.</p>
      ) : (
        grupos.map(g => <Dia key={g.fecha} g={g} c={conv} onAbrir={onAbrir} onCambiarBloqueo={() => onSegmento('disponibilidad')} />)
      )}
    </div>
  )
}
