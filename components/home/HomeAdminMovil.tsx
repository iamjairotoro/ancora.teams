'use client'
// El Home del admin (y del líder) en TELÉFONO (mockup Home-Admin-A). De arriba hacia abajo: organización y «Home»; el calendario compartido (semana o mes) con un punto del color de cada equipo; la ficha grande del próximo servicio con
// su estado, la cobertura por equipo (2/5, con el número escrito) y «Abrir servicio»; tres cifras (Equipos, Voluntarios Citados, Con la app); una tarjeta por equipo; «Después» (los siguientes, como filas de la lista de Servicios) y, si hay
// alguno esa semana, una fila discreta de cumpleaños. Un líder ve todo recortado a sus equipos (citados, cobertura, tarjetas, puntos). Solo conteos: ningún porcentaje de una persona. La lógica es lib/home/* (puras, con pruebas).
import type { ServicioResumen } from '@/lib/admin/resumenServicios'
import { cifrasAdmin, coberturaDe, despues, proximoServicio, tarjetasDeEquipo } from '@/lib/home/cifrasAdmin'
import { marcasDeAdmin, semanaDe } from '@/lib/home/calendario'
import { filasProximas } from '@/lib/admin/listaServicios'
import { cumpleanosDeLaSemana, type Cumple } from '@/lib/portal/cumpleanos'
import { bloqueFecha } from '@/lib/portal/inicio'
import { diasHasta } from '@/lib/portal/fechas'
import { enDiasTexto, abrirFila } from '@/lib/textos/servicio'
import { TEXTOS_HOME_NUEVO as T, conLaAppDe, confirmadosN, proximoCubiertos } from '@/lib/textos/homeNuevo'
import type { Viewer } from '@/lib/teamBlocks'
import ErrorDeCarga from '../ErrorDeCarga'
import EsqueletoLista from '../servicio-movil/EsqueletoLista'
import PuntoActualizando from '../servicio-movil/PuntoActualizando'
import { teamColorProps } from '../TeamColor'
import { Fila } from '../servicio-movil/ListaServicios'
import FichaServicio, { BotonResponder, Chips, FilaInformativa } from '../servicio-movil/FichaServicio'
import CalendarioHome from './CalendarioHome'
import ui from './home-admin-movil.module.css'

export interface HomeAdminMovilProps {
  orgName: string
  hoy: string
  servicios: ServicioResumen[] | null
  cargando: boolean
  actualizando?: boolean
  error: string | null
  onReintentar: () => void
  viewer: Viewer
  equipos: { id: string; name: string; color: string | null }[]
  personasPorEquipo: Record<string, number>
  personas: { instaladaApp: boolean }[]
  cumples: Cumple[]
  /** Los destinos son de /admin: un líder no los tiene (lib/home/cifrasAdmin.ts → puedeAbrirAdministracion). Sin destino, el componente no dibuja el botón, la flecha ni el enlace: la ficha, la fila o la tarjeta quedan solo informativas. */
  onAbrirServicio?: (servicioId: string, teamId?: string | null) => void
  onVerServicios?: () => void
  onVerPersonas?: () => void
  onAbrirEquipo?: (teamId: string) => void
}

export default function HomeAdminMovil(p: HomeAdminMovilProps) {
  const sv = p.servicios ?? []
  const proximo = proximoServicio(sv, p.viewer)
  const fila = proximo ? filasProximas(sv, p.viewer).find(f => f.servicioId === proximo.id) ?? null : null
  const cobertura = proximo ? coberturaDe(proximo, p.viewer) : []
  const cifras = cifrasAdmin({ proximo, v: p.viewer, equipos: p.equipos.filter(e => p.viewer.kind === 'admin' || p.viewer.teamIds.has(e.id)).length, personas: p.personas })
  const tarjetas = tarjetasDeEquipo({ equipos: p.equipos, personasPorEquipo: p.personasPorEquipo, proximo, v: p.viewer })
  const siguientes = despues(sv, p.viewer, proximo)
  const semana = semanaDe(p.hoy).map(d => d.fecha), cumples = cumpleanosDeLaSemana(p.cumples, semana)
  const marcas = marcasDeAdmin(sv, p.viewer)
  const carga = p.error ? <div className={ui.vacio}><ErrorDeCarga compacto titulo="No se pudo cargar el resumen" cuerpo={p.error} onReintentar={p.onReintentar} /></div> : p.cargando || !p.servicios ? <EsqueletoLista filas={2} /> : null
  return (
    <div className={ui.pantalla}>
      <div className={ui.cab}><p className={ui.org}>{p.orgName}</p><h1 className={ui.titulo}>{T.tituloAdmin}{p.actualizando && <PuntoActualizando />}</h1></div>

      <CalendarioHome hoy={p.hoy} marcas={marcas} elegido={proximo?.fecha ?? p.hoy} onAbrir={p.onAbrirServicio ? (id, eq) => p.onAbrirServicio!(id, eq) : undefined} />

      {carga ?? (
        <>
          {proximo && fila ? (
            <ul className={ui.lista}>
              <FichaServicio grande fecha={fila} nombre={fila.nombre} horario={fila.horario} color={fila.equipos[0]?.color ?? null} enDias={enDiasTexto(diasHasta(fila.fecha, p.hoy))}
                ariaLabel={abrirFila(fila.nombre, fila.cuando)} onAbrir={p.onAbrirServicio ? () => p.onAbrirServicio!(proximo.id) : undefined}
                chips={<Chips chips={[{ texto: fila.estado }, ...fila.ambar.map(a => ({ texto: a, ambar: true }))]} />}
                cuadritos={cobertura.length > 0 ? (
                  <ul className={ui.cobertura}>
                    {cobertura.map(c => (
                      <li key={c.teamId} className={`${ui.cob}${c.cubiertos >= c.cupos ? ` ${ui.completo}` : ''}`} {...teamColorProps(c.color)}>
                        <span className={ui.mono} aria-hidden="true">{c.inicial}</span><span className={ui.cobNombre}>{c.nombre}</span>
                        <span className={ui.pista} aria-hidden="true"><span className={ui.relleno} style={{ width: `${c.cupos > 0 ? Math.min(100, Math.round((c.cubiertos / c.cupos) * 100)) : 0}%` }} /></span>
                        <span className={ui.cobN}>{c.cubiertos}/{c.cupos}</span>
                      </li>
                    ))}
                  </ul>
                ) : undefined}
                pie={p.onAbrirServicio ? <BotonResponder texto={T.abrirServicio} onClick={() => p.onAbrirServicio!(proximo.id)} /> : undefined} />
            </ul>
          ) : <p className={ui.vacio}>{T.sinProximoServicio} {T.sinProximoServicioAyuda}</p>}

          <ul className={ui.cifras}>
            <li className={ui.cifra}><span className={ui.cifraN}>{cifras.equipos}</span><span className={ui.cifraT}>{T.equipos}</span></li>
            <li className={ui.cifra}><span className={ui.cifraN}>{cifras.citados}</span><span className={ui.cifraT}>{T.voluntariosCitados}</span></li>
            <li className={ui.cifra}><span className={ui.cifraN}>{cifras.conApp}</span><span className={ui.cifraT}>{T.conLaApp} {conLaAppDe(cifras.deTotal)}</span></li>
          </ul>

          {tarjetas.length > 0 && (
            <>
              <div className={ui.seccionFila}><h2 className={ui.seccion}>{T.equipos}</h2>{p.onVerPersonas && <button type="button" className={ui.enlace} onClick={p.onVerPersonas}>{T.verPersonas}</button>}</div>
              <ul className={ui.equipos}>
                {tarjetas.map(t => (
                  <li key={t.teamId}>
                    {(() => { const dentro = (
                      <>
                        <span className={ui.tarjetaCab}><span className={ui.mono} aria-hidden="true">{t.inicial}</span><span className={ui.tarjetaNombre}>{t.nombre}</span></span>
                        <span className={ui.personas}>{t.personas}<small>{t.personas === 1 ? 'persona' : 'personas'}</small></span>
                        <span className={ui.tarjetaT}>{proximoCubiertos(t.cubiertos, t.cupos)}</span>
                        {t.confirmados !== null && <span className={ui.tarjetaT}>{confirmadosN(t.confirmados)}</span>}
                      </>
                    ); return p.onAbrirEquipo
                      ? <button type="button" className={ui.tarjeta} onClick={() => p.onAbrirEquipo!(t.teamId)} {...teamColorProps(t.color)}>{dentro}</button>
                      : <div className={`${ui.tarjeta} ${ui.estatica}`} {...teamColorProps(t.color)}>{dentro}</div> })()}
                  </li>
                ))}
              </ul>
            </>
          )}

          {siguientes.length > 0 && (
            <>
              <div className={ui.seccionFila}><h2 className={ui.seccion}>{T.despues}</h2>{p.onVerServicios && <button type="button" className={ui.enlace} onClick={p.onVerServicios}>{T.verTodos}</button>}</div>
              <ul className={ui.lista}>{siguientes.map(f => <Fila key={f.servicioId} f={f} onAbrir={p.onAbrirServicio ? id => p.onAbrirServicio!(id) : undefined} />)}</ul>
            </>
          )}

          {cumples.length > 0 && (
            <>
              <h2 className={ui.seccion}>{T.cumpleanos}</h2>
              <ul className={ui.lista}>
                {cumples.map(c => { const f = semana.find(x => +x.slice(5, 7) === c.mes && +x.slice(8, 10) === c.dia) ?? '', b = bloqueFecha(f); return b ? <FilaInformativa key={c.id} fecha={{ diaSemana: b.dow, dia: String(b.dia), mes: b.mes }} titulo={c.nombre} detalle={T.cumpleanosEtiqueta} /> : null })}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}
