'use client'
// Una ficha de servicio del portal en teléfono (mockup Lista-Usuario), para la lista de Servicios y para «Próximos» del Inicio: la primera es la grande (borde con el color de TU equipo, «en N días», estado,
// «Tu posición: …» y «Responder», que ABRE el servicio —ahí están Confirmo y No puedo—); las demás, filas con cuadritos de equipo y tu estado. Las filas salen de lib/portal/listaServicios.ts.
import FichaServicio, { BotonResponder, Chips, Cuadritos, PosicionDe } from '@/components/servicio-movil/FichaServicio'
import { cuadritosVisibles } from '@/lib/admin/listaServicios'
import type { FilaPortal } from '@/lib/portal/listaServicios'
import { diasHasta } from '@/lib/portal/fechas'
import { enDiasTexto } from '@/lib/textos/servicio'
import { TEXTOS_SERVICIOS_PORTAL as T, abrirServicioPortal } from '@/lib/textos/serviciosPortal'
import type { ReactNode } from 'react'

export default function FichaPortal({ f, grande, onAbrir, despues }: { f: FilaPortal; grande: boolean; onAbrir: (f: FilaPortal) => void; despues?: ReactNode }) {
  const { items, mas } = cuadritosVisibles(f.equipos)
  const abrir = () => onAbrir(f)
  return (
    <FichaServicio grande={grande} fecha={f} nombre={f.nombre} horario={f.horario} color={f.color} enDias={grande ? enDiasTexto(diasHasta(f.fecha)) : null}
      ariaLabel={abrirServicioPortal(f.nombre, f.cuando, f.estado)} onAbrir={abrir}
      cuadritos={<Cuadritos items={items} mas={mas} />} chips={<Chips chips={[{ texto: f.estado, ambar: f.ambar }]} />}
      pie={grande && (f.posicion || f.responder) ? <>{f.posicion && <PosicionDe texto={T.tuPosicion} valor={f.posicion} />}{f.responder && <BotonResponder texto={T.responder} onClick={abrir} />}</> : undefined}
      despues={despues} />
  )
}
