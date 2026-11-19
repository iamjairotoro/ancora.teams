'use client'
// El Inicio del portal en TELÉFONO (mockup Home-Usuario-C). De arriba hacia abajo: «Hola, {nombre}» y «Inicio» con el botón «Modo Admin» / «Modo Líder» a la derecha del título; la tira de días (prototipo docs/mockups/index.html: un punto bajo el número marca
// servicio o fecha bloqueada; al tocar un día aparece su tarjeta con SU servicio y SUS bloqueos; solo SUS convocatorias y ensayos y los días que bloqueó en cualquiera de sus equipos); las fichas de sus equipos (las mismas de «Mis equipos» del Perfil); «Próximos» con la ficha grande
// del más cercano y filas para los siguientes (FichaPortal, la misma de Servicios); «Favoritos» como fichas que se deslizan (solo con acceso a la biblioteca); y, al final y solo si hay alguno esa semana, una fila discreta de cumpleaños (día y mes, nunca el año).
// La lógica sale de lib/home/* y lib/portal/* (puras, con pruebas). El escritorio sigue con Inicio.tsx de siempre.
import { Heart } from 'lucide-react'
import { BotonModo } from '@/components/modo'
import TiraDias from '@/components/home/TiraDias'
import { FilaInformativa } from '@/components/servicio-movil/FichaServicio'
import { botonDelPortal, type AdministracionDeModo } from '@/lib/modo'
import { semanaDe } from '@/lib/home/calendario'
import { diasConBloqueo, entradasVigentesPorDia, puntoDelDia } from '@/lib/home/tira'
import type { FichaFavorita } from '@/lib/home/favoritos'
import { proximosServicios, bloqueFecha } from '@/lib/portal/inicio'
import { filasDeServicios, type FilaPortal } from '@/lib/portal/listaServicios'
import { cumpleanosDeLaSemana, type Cumple } from '@/lib/portal/cumpleanos'
import { hoyEnSantiago } from '@/lib/portal/fechas'
import { TEXTOS_HOME_NUEVO as T } from '@/lib/textos/homeNuevo'
import { TEXTOS_TIRA as TT } from '@/lib/textos/tiraDias'
import FichaPortal from '../servicios/FichaPortal'
import MisEquipos from '../perfil/MisEquipos'
import type { EntradaInicioPortal } from './Inicio'
import { useAhora } from './useAhora'
import PanelDiaUsuario, { type BloqueosDelPortal } from './PanelDiaUsuario'
import ui from './inicio-telefono.module.css'

export interface EquipoDeLaPersona { id: string; name: string; color: string | null }

export default function InicioTelefono({ nombre, administracion, entradas, cumpleanos, equipos, favoritas, bloqueos, token, onFilasBloqueos, onRecargarBloqueos, onAbrirServicio, onIrServicios, onAbrirCancion, onVerFavoritas }: {
  nombre: string
  administracion?: AdministracionDeModo | null
  entradas: EntradaInicioPortal[]
  cumpleanos: Cumple[]
  /** Los equipos activos de la persona (chips arriba a la derecha). */
  equipos: EquipoDeLaPersona[]
  /** Las fichas de favoritas; null = sin acceso a la biblioteca (no hay sección). */
  favoritas: FichaFavorita[] | null
  /** Sus bloqueos de fecha (las filas de /api/portal/bloqueos, que viven en PortalApp) y cómo guardarlas. */
  bloqueos: BloqueosDelPortal
  token: string | null
  onFilasBloqueos: (f: (prev: any[]) => any[]) => void
  onRecargarBloqueos: () => Promise<unknown> | void
  onAbrirServicio: (servicioId: string, equipoId?: string | null) => void
  onIrServicios: () => void
  onAbrirCancion: (id: string) => void
  onVerFavoritas: () => void
}) {
  const ahora = useAhora(), hoy = hoyEnSantiago(ahora)
  const { destacado, siguientes } = proximosServicios(entradas, ahora)
  const ids = new Set([destacado, ...siguientes].filter(Boolean).map(g => g!.service.id))
  const filas = filasDeServicios(entradas.filter(e => ids.has(e.service.id))) as FilaPortal[]
  const porDia = entradasVigentesPorDia(entradas), bloqueados = bloqueos.estado === 'ok' ? diasConBloqueo(bloqueos.filas) : new Set<string>()      // sin bloqueos cargados no se marca ninguno
  const semana = semanaDe(hoy).map(d => d.fecha)
  const cumples = cumpleanosDeLaSemana(cumpleanos, semana)
  const boton = botonDelPortal(administracion)
  return (
    <div className={ui.pantalla}>
      <div className={ui.cab}>
        <div className={ui.cabTxt}>
          <p className={ui.saludo}>{T.hola(nombre)}</p>
          <h1 className={ui.titulo}>{T.tituloUsuario}</h1>
        </div>
        {boton && <BotonModo modo={boton} className={ui.modoBtn} />}
      </div>

      <TiraDias hoy={hoy} titulo={TT.tituloUsuario} ayuda={TT.ayudaUsuario}
        punto={f => puntoDelDia({ servicio: porDia.has(f), bloqueado: bloqueados.has(f), prioridad: 'bloqueo' })}
        clavePanel={f => (bloqueados.has(f) ? 'bloqueado' : 'libre')}
        panel={f => <PanelDiaUsuario fecha={f} hoy={hoy} entradas={porDia.get(f) ?? []} token={token} bloqueos={bloqueos} onFilas={onFilasBloqueos} onRecargar={onRecargarBloqueos} onAbrirServicio={onAbrirServicio} />} />

      {equipos.length > 0 && <MisEquipos equipos={equipos.map(e => ({ ...e, posiciones: [] }))} sinTitulo etiqueta={T.tusEquipos} />}

      <div className={ui.seccionFila}><h2 className={ui.seccion}>{T.proximos}</h2><button type="button" className={ui.enlace} onClick={onIrServicios}>{T.verTodos}</button></div>
      {filas.length === 0 ? <p className={ui.vacio}>{T.sinProximos}</p> : (
        <ul className={ui.lista}>{filas.map((f, i) => <FichaPortal key={f.servicioId} f={f} grande={i === 0} onAbrir={x => onAbrirServicio(x.servicioId, x.equipoId)} />)}</ul>
      )}

      {favoritas && (
        <>
          <div className={ui.seccionFila}><h2 className={ui.seccion}>{T.favoritos}</h2><button type="button" className={ui.enlace} onClick={onVerFavoritas}>{T.verTodas}</button></div>
          {favoritas.length === 0 ? <p className={ui.vacio}>{T.sinFavoritos}</p> : (
            <ul className={ui.favoritas}>
              {favoritas.map(c => (
                <li key={c.id}>
                  <button type="button" className={ui.fav} onClick={() => onAbrirCancion(c.id)} aria-label={`${c.nombre}${c.detalle ? `, ${c.detalle}` : ''}`}>
                    <span className={ui.favTop}><span className={ui.favNombre}>{c.nombre}</span><Heart size="1rem" className={ui.corazon} fill="currentColor" aria-hidden="true" /></span>
                    {c.detalle && <span className={ui.favDetalle}>{c.detalle}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {cumples.length > 0 && (
        <>
          <h2 className={ui.seccion}>{T.cumpleanos}</h2>
          <ul className={ui.lista}>
            {cumples.map(c => {
              const f = semana.find(x => +x.slice(5, 7) === c.mes && +x.slice(8, 10) === c.dia) ?? '', b = bloqueFecha(f)
              return b ? <FilaInformativa key={c.id} fecha={{ diaSemana: b.dow, dia: String(b.dia), mes: b.mes }} titulo={c.nombre} detalle={T.cumpleanosEtiqueta} /> : null
            })}
          </ul>
        </>
      )}
    </div>
  )
}
