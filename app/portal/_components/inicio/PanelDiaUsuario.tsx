'use client'
// La tarjeta del día del Home de usuario (tira de días): SU servicio de ese día (solo convocatorias enviadas y en pie, con el estado de siempre) y SUS bloqueos. Bloquear y quitar usan lo que ya existe, /api/portal/bloqueos
// (set_date_blocks: por equipo, motivo visible para los líderes de ese equipo): bloquear desde aquí es de UN día y para todos sus equipos; los rangos y los equipos sueltos siguen en Disponibilidad. Las filas viven en PortalApp, así
// Servicios y Disponibilidad ven lo mismo sin volver a pedirlas. Si los bloqueos no cargaron, no se ofrece bloquear ni quitar (no se sabe si el día está libre) y se dice, con «Reintentar».
import { useState } from 'react'
import PanelDia, { AvisoReintentar, type EventoDia } from '@/components/home/PanelDia'
import HojaBloqueo from '@/components/home/HojaBloqueo'
import { accionesDelDia, bloqueoDeLaFecha, cuerpoDeBloqueo, cuerpoDeQuitar, reemplazarFecha, type FilaBloqueo } from '@/lib/home/tira'
import { filasDeServicios, type FilaPortal } from '@/lib/portal/listaServicios'
import { portalFetch } from '@/lib/portal/portalFetch'
import type { EstadoBloqueos } from '@/lib/portal/bloqueosCarga'
import { avisar } from '@/lib/ventanas/ventanas'
import { TEXTOS_TIRA as T } from '@/lib/textos/tiraDias'
import type { EntradaInicioPortal } from './Inicio'

export interface BloqueosDelPortal { filas: any[]; equipos: { id: string; name: string; color: string | null }[]; estado: EstadoBloqueos }

const aEvento = (f: FilaPortal): EventoDia => ({
  servicioId: f.servicioId, equipoId: f.equipoId, nombre: f.nombre, estado: f.estado, estadoAmbar: f.ambar, extras: [],
  detalle: [f.horario, f.equipos.length > 0 ? T.tuEquipo(f.equipos.map(e => e.nombre).join(', ')) : ''].filter(Boolean).join(' · '),
})

export default function PanelDiaUsuario({ fecha, hoy, entradas, token, bloqueos, onFilas, onRecargar, onAbrirServicio }: {
  fecha: string
  hoy: string
  /** Sus convocatorias y ensayos de ese día (ya filtradas a las vigentes). */
  entradas: EntradaInicioPortal[]
  token: string | null
  bloqueos: BloqueosDelPortal
  onFilas: (f: (prev: any[]) => any[]) => void
  onRecargar: () => Promise<unknown> | void
  onAbrirServicio: (servicioId: string, equipoId?: string | null) => void
}) {
  const [hoja, setHoja] = useState(false), [ocupado, setOcupado] = useState(false), [reintentando, setReintentando] = useState(false)
  const pasado = fecha < hoy, cargados = bloqueos.estado === 'ok'
  const eventos = (filasDeServicios(entradas) as FilaPortal[]).map(aEvento)
  const b = cargados ? bloqueoDeLaFecha(bloqueos.filas as FilaBloqueo[], fecha, bloqueos.equipos.length) : null
  const acciones = accionesDelDia({ hayServicio: eventos.length > 0, pasado, bloqueado: !!b, esPropio: cargados, hayDestino: true })
  const nombresEquipos = b?.parcial ? bloqueos.equipos.filter(e => b.equipoIds!.includes(e.id)).map(e => e.name).join(', ') : null

  const aplicar = (rows: any[] | null) => { if (rows) onFilas(prev => reemplazarFecha(prev, fecha, rows)); else onRecargar() }
  const guardar = async (motivo: string): Promise<boolean> => {
    const res = await portalFetch(token, '/api/portal/bloqueos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpoDeBloqueo(fecha, motivo)) }).catch(() => null)
    const cuerpo = res ? await res.json().catch(() => null) : null
    if (!res?.ok) { console.error('[bloqueos]', res?.status ?? 'sin respuesta', cuerpo); return false }
    aplicar(Array.isArray(cuerpo?.blocks) ? cuerpo.blocks : null); setHoja(false); return true
  }
  const quitar = async () => {
    if (ocupado) return
    setOcupado(true)
    const res = await portalFetch(token, '/api/portal/bloqueos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpoDeQuitar(fecha)) }).catch(() => null)
    if (res?.ok) onFilas(prev => reemplazarFecha(prev, fecha, []))
    else await avisar(T.noSePudoQuitar)
    setOcupado(false)
  }

  return (
    <>
      <PanelDia fecha={fecha} esHoy={fecha === hoy} pasado={pasado} eventos={eventos} acciones={acciones} ocupado={ocupado}
        bloqueo={b ? { motivo: b.motivo, soloEquipos: nombresEquipos } : null}
        onAbrir={e => onAbrirServicio(e.servicioId, e.equipoId)} onBloquear={() => setHoja(true)} onQuitar={quitar} />
      {bloqueos.estado === 'error' && <AvisoReintentar reintentando={reintentando} onReintentar={async () => { setReintentando(true); await onRecargar(); setReintentando(false) }} />}
      <HojaBloqueo abierta={hoja} fecha={fecha} onGuardar={guardar} onCerrar={() => setHoja(false)} />
    </>
  )
}
