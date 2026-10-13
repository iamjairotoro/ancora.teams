'use client'
/* Sección «Adjuntos» de la pantalla de canción (punto 55, commit 3): ENTRE la letra y el audio. Hoy solo PDFs.
   - La lista trae solo metadatos (nombre, tamaño, quién y cuándo); NUNCA rutas ni URLs. El enlace se firma AL PULSAR «Ver» (regla 14)
     con POST /api/portal/cancion/firmar (acceso a la biblioteca, el adjunto tiene que ser de esta canción, vence en 5 minutos).
   - «Ver» abre el visor de PDF dentro de la app (VisorPdf.tsx, cargado solo al abrir). Un PDF de más de 30 MB no se abre en la app:
     solo ↗ «Abrir en el visor del teléfono».
   - ↗ abre la ventana EN el toque (si no, iOS bloquea la ventana que se abre tras una espera) y le pone la URL firmada al llegar. */
import { useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import { firmarAdjunto } from './firmarAdjunto'
import { pesaDemasiado } from '@/lib/pdfVisor'
import type { AdjuntoPublico } from '@/lib/portal/adjuntos'
import ui from './adjuntos-cancion.module.css'

// El visor y pdf.js NO están en el JS inicial del portal: se descargan al pulsar «Ver» por primera vez.
const VisorPdf = dynamic(() => import('./VisorPdf'), { ssr: false })

function fmtTamano(b: number | null) {
  if (b === null) return null
  return b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`
}
function fmtFecha(f: string | null) {
  if (!f) return null
  const d = new Date(f)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export default function AdjuntosCancion({ token, songId, adjuntos, errorLista }: {
  token: string | null
  songId: string
  adjuntos: AdjuntoPublico[]
  errorLista?: boolean
}) {
  const [abierto, setAbierto] = useState<AdjuntoPublico | null>(null)
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null)
  const [enlaceListo, setEnlaceListo] = useState<{ url: string; nombre: string } | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  /** Pide una URL firmada NUEVA (5 min). Lanza con un mensaje claro si no se pudo. */
  const firmar = useCallback(async (adjuntoId: string): Promise<string> => (await firmarAdjunto(token, songId, adjuntoId)).url, [token, songId])

  /** ↗ «Abrir en el visor del teléfono»: la ventana se abre YA (en el gesto) y recibe la URL firmada cuando llega. */
  const abrirEnTelefono = useCallback(async (a: AdjuntoPublico) => {
    setAviso(null); setEnlaceListo(null); setOcupado(a.id)
    const ventana = window.open('', '_blank')
    try {
      const url = await firmar(a.id)
      if (ventana) { ventana.opener = null; ventana.location.href = url }
      else setEnlaceListo({ url, nombre: a.nombre })            // el navegador bloqueó la ventana: se ofrece un enlace para tocar
    } catch (e) {
      ventana?.close()
      setAviso({ texto: `${(e as Error).message}. Inténtalo de nuevo.`, error: true })
    } finally { setOcupado(null) }
  }, [firmar])

  if (!adjuntos.length && !errorLista) return null

  return (
    <section className={ui.card} aria-label="Adjuntos">
      <div className={ui.head}>
        <h3 className={ui.title}>Adjuntos</h3>
        <span className={ui.sub}>ACORDES Y PARTITURAS</span>
      </div>

      {errorLista && !adjuntos.length && <p className={ui.cargando} role="alert">No se pudieron cargar los adjuntos. Vuelve a abrir la canción.</p>}
      {aviso && <p className={`${ui.aviso}${aviso.error ? ` ${ui.avisoErr}` : ''}`} role={aviso.error ? 'alert' : 'status'}>{aviso.texto}</p>}
      {enlaceListo && (
        <p className={ui.aviso} role="status">
          El navegador bloqueó la ventana. <a className={`${ui.btn} ${ui.btn2}`} href={enlaceListo.url} target="_blank" rel="noopener noreferrer">Abrir {enlaceListo.nombre}</a>
        </p>
      )}

      {adjuntos.map(a => {
        const grande = pesaDemasiado(a.tamano)
        const detalle = [fmtTamano(a.tamano), a.subidoPor ? `subido por ${a.subidoPor}` : null, fmtFecha(a.fecha)].filter(Boolean).join(' · ')
        return (
          <div key={a.id} className={ui.fila}>
            <span className={ui.ic} aria-hidden="true">PDF</span>
            <span className={ui.que}>
              <b>{a.nombre}</b>
              <span>{grande ? `${detalle} · pesa más de 30 MB: solo en el visor del teléfono` : detalle}</span>
            </span>
            {grande ? (
              <button type="button" className={ui.btn} disabled={ocupado === a.id} onClick={() => abrirEnTelefono(a)} aria-label={`Abrir ${a.nombre} en el visor del teléfono`}>
                {ocupado === a.id ? 'Abriendo…' : 'Abrir ↗'}
              </button>
            ) : (
              <button type="button" className={ui.btn} onClick={() => { setAviso(null); setEnlaceListo(null); setAbierto(a) }} aria-label={`Ver ${a.nombre}`}>Ver ›</button>
            )}
          </div>
        )
      })}

      {abierto && (
        <VisorPdf nombre={abierto.nombre} firmar={() => firmar(abierto.id)} onAbrirTelefono={() => abrirEnTelefono(abierto)} onCerrar={() => setAbierto(null)} />
      )}
    </section>
  )
}
