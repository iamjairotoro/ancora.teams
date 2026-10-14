'use client'
/* Subida de archivos de la administración con progreso REAL y cola (punto 55, ajuste de Claudia).
   - useSubidaAdjuntos: la cola (lib/colaSubida.ts) sobre lib/subirAdjunto.ts (URL firmada + XMLHttpRequest). Conserva las validaciones de tipo y
     tamaño, el tipo canónico, el borrado del archivo si falla el registro de la fila y la ruta {organization_id}/{song_id}/… del audio.
     Avisa con beforeunload si se intenta cerrar la página durante una subida.
   - PanelSubida: va DENTRO de la sección Adjuntos, arriba de la lista. Por archivo: nombre, bytes, % y barra (solo si tarda más de ~300 ms),
     «Cancelar»; «2 de 3» si son varios; ✓ «Subido» (se desvanece a los 3 s); error PERSISTENTE con el motivo y «Reintentar»; cancelado.
     role="progressbar" con aria-valuenow y un anuncio aria-live educado (solo al empezar, terminar, fallar o cancelar: sin spam). */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ColaSubida, type ItemSubida } from '@/lib/colaSubida'
import { subirAdjunto, type ClienteSubida } from '@/lib/subirAdjunto'
import type { XhrLike } from '@/lib/subidaConProgreso'
import { bytesDe, porcentaje, tamanoLegible, textoProgreso } from '@/lib/subidaConProgreso'
import ui from './subida-adjuntos.module.css'

export interface ContextoSubida { songId: string }
export type ItemDeSubida = ItemSubida<File, ContextoSubida>

export function useSubidaAdjuntos(o: {
  songId: string
  memberId: string | null
  organizationId: string
  cliente: ClienteSubida
  /** Cabeceras públicas (apikey) para el XHR. */
  headers?: Record<string, string>
  /** Cuando un archivo quedó subido y registrado: la pantalla recarga su lista. */
  alTerminarUno?: () => void
  crearXhr?: () => XhrLike
}) {
  // Lo último que llegó por props, sin recrear la cola.
  const ultimo = useRef(o); ultimo.current = o
  const cola = useMemo(() => new ColaSubida<File, ContextoSubida>(
    (archivo, ctx, ctl) => subirAdjunto(ultimo.current.cliente, {
      archivo, songId: ctx.songId, memberId: ultimo.current.memberId, organizationId: ultimo.current.organizationId,
      headers: ultimo.current.headers, senal: ctl.senal, onProgreso: ctl.onProgreso, onRegistrando: ctl.onRegistrando, crearXhr: ultimo.current.crearXhr,
    }),
    { alTerminarUno: () => ultimo.current.alTerminarUno?.() },
  ), [])
  const items = useSyncExternalStore(cola.suscribir, cola.obtener, cola.obtener)
  const ocupado = items.some(i => i.estado === 'cola' || i.estado === 'subiendo' || i.estado === 'registrando')

  // Cerrar o recargar la página con una subida en curso la perdería: el navegador pregunta antes.
  useEffect(() => {
    if (!ocupado) return
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [ocupado])
  useEffect(() => () => cola.destruir(), [cola])

  return {
    items, ocupado,
    agregar: (archivos: File[]) => cola.agregar(archivos, { songId: ultimo.current.songId }),
    cancelar: (id: number) => cola.cancelar(id),
    reintentar: (id: number) => cola.reintentar(id),
    descartar: (id: number) => cola.descartar(id),
  }
}

/** Frase para el lector de pantalla: SOLO cuando un archivo cambia de estado (no por cada punto de progreso). Si en un mismo render cambian
 *  varios (uno termina y arranca el siguiente), se anuncian TODOS juntos: el último no pisa al anterior. */
function useAnuncio(items: readonly ItemDeSubida[]): string {
  const previos = useRef(new Map<number, string>())
  const [anuncio, setAnuncio] = useState('')
  useEffect(() => {
    const frases: string[] = []
    for (const it of items) {
      if (previos.current.get(it.id) === it.estado) continue
      previos.current.set(it.id, it.estado)
      const tanda = it.de > 1 ? ` (${it.n} de ${it.de})` : ''
      if (it.estado === 'subiendo') frases.push(`Subiendo ${it.archivo.name}${tanda}`)
      else if (it.estado === 'ok') frases.push(`Subido ${it.archivo.name}`)
      else if (it.estado === 'error') frases.push(`No se pudo subir ${it.archivo.name}. ${it.mensaje ?? ''}`)
      else if (it.estado === 'cancelado') frases.push(`Subida cancelada: ${it.archivo.name}`)
    }
    if (frases.length) setAnuncio(frases.join('. '))
    const vivos = new Set(items.map(i => i.id))
    previos.current.forEach((_, id) => { if (!vivos.has(id)) previos.current.delete(id) })
  }, [items])
  return anuncio
}

export function PanelSubida({ items, onCancelar, onReintentar, onDescartar }: {
  items: readonly ItemDeSubida[]
  onCancelar: (id: number) => void
  onReintentar: (id: number) => void
  onDescartar: (id: number) => void
}) {
  const anuncio = useAnuncio(items)
  return (
    <div className={ui.panel} aria-label="Subida de archivos">
      <p className={ui.sr} role="status" aria-live="polite">{anuncio}</p>
      {items.map(it => {
        const nombre = it.archivo.name
        const tanda = it.de > 1 ? <small>{it.n} de {it.de}</small> : null
        if (it.estado === 'cola')
          return (
            <div key={it.id} className={`${ui.fila} ${ui.cola}`}>
              <div className={ui.cabeza}>
                <div className={ui.texto}>En cola: {nombre}{tanda}</div>
                <button type="button" className={ui.btn} onClick={() => onCancelar(it.id)} aria-label={`Quitar de la cola ${nombre}`}>Cancelar</button>
              </div>
            </div>
          )
        if (it.estado === 'subiendo' || it.estado === 'registrando') {
          const pct = porcentaje(it.bytes, it.total)
          const registrando = it.estado === 'registrando'
          return (
            <div key={it.id} className={ui.fila}>
              <div className={ui.cabeza}>
                <div className={ui.texto}>
                  {registrando ? `Guardando ${nombre} · ${tamanoLegible(it.total)}` : textoProgreso(nombre, it.bytes, it.total)}
                  {tanda}
                </div>
                <button type="button" className={ui.btn} onClick={() => onCancelar(it.id)} disabled={registrando} aria-label={`Cancelar la subida de ${nombre}`}>Cancelar</button>
              </div>
              {(it.verBarra || registrando) && (
                <div className={`${ui.barra}${registrando ? ` ${ui.registrando}` : ''}`} role="progressbar" aria-label={`Subiendo ${nombre}`} aria-valuemin={0} aria-valuemax={100}
                  aria-valuenow={pct} aria-valuetext={`${pct} %, ${bytesDe(it.bytes, it.total)}`}>
                  <i style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          )
        }
        if (it.estado === 'ok')
          return <div key={it.id} className={`${ui.fila} ${ui.ok}`}><div className={ui.texto}><span className={`${ui.ico} ${ui.okc}`} aria-hidden="true">✓</span>Subido · {nombre}{tanda}</div></div>
        if (it.estado === 'error')
          return (
            <div key={it.id} className={`${ui.fila} ${ui.mal}`} role="alert">
              <div className={ui.texto}><span className={`${ui.ico} ${ui.malc}`} aria-hidden="true">✗</span>No se pudo subir {nombre}{tanda}<small>{it.mensaje}</small></div>
              <div className={ui.acciones}>
                {it.reintentable && <button type="button" className={`${ui.btn} ${ui.btnP}`} onClick={() => onReintentar(it.id)} aria-label={`Reintentar la subida de ${nombre}`}>Reintentar</button>}
                <button type="button" className={ui.btn} onClick={() => onDescartar(it.id)} aria-label={`Descartar el aviso de ${nombre}`}>Descartar</button>
              </div>
            </div>
          )
        return <div key={it.id} className={ui.fila}><div className={ui.texto}>Cancelado · {nombre}{tanda}</div></div>
      })}
    </div>
  )
}
