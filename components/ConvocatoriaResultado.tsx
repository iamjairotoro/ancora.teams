'use client'
/* Resultado persistente de una convocatoria por correo (punto 61). No se cierra solo: ni por tiempo ni porque se recarguen
   los datos; solo con «Cerrar». Vive FUERA del bloque que se desmonta cuando ya no quedan personas por notificar.
   «Aceptado por el servidor de correo» NO es «entregado»: un buzón inexistente en un dominio real rebota más tarde. */
import { useEffect, useRef } from 'react'
import type { AvisoConvocatoria, EstadoPush, ResultadoDestinatario } from '@/lib/convocatoriaTypes'
import ui from './convocatoria-resultado.module.css'

const PUSH: Record<EstadoPush, string | null> = {
  'enviado': 'Notificación en la app: enviada.',
  'parcial': 'Notificación en la app: llegó a algunos dispositivos.',
  'sin dispositivo': 'Notificación en la app: no tiene la app instalada con avisos activados.',
  'falló': 'Notificación en la app: falló.',
  'no configurado': 'Notificación en la app: no está configurada en el servidor.',
  'no aplica': null,
}

function Fila({ r }: { r: ResultadoDestinatario }) {
  const clase = r.estado === 'enviado' ? ui.ok : r.estado === 'falló' ? ui.fail : ui.skip
  const simbolo = r.estado === 'enviado' ? '✓' : r.estado === 'falló' ? '✗' : '–'
  const palabra = r.estado === 'enviado' ? 'Aceptado por el servidor de correo' : r.estado === 'falló' ? 'No se envió' : 'Omitido'
  const push = PUSH[r.push]
  return (
    <li className={`${ui.row} ${clase}`}>
      <span className={ui.ico} aria-hidden="true">{simbolo}</span>
      <span>
        <span className={ui.who}>{r.nombre}</span>{r.email && <> <span className={ui.mail}>({r.email})</span></>}
        {' — '}<span className={ui.state}>{palabra}</span>{r.motivo && <>: {r.motivo}</>}
        {r.aviso && <span className={ui.sub}>{r.aviso}</span>}
        {push && <span className={ui.sub}>{push}</span>}
      </span>
    </li>
  )
}

export default function ConvocatoriaResultado({ aviso, onCerrar, titulo = 'Resultado de la convocatoria' }: {
  aviso: AvisoConvocatoria | null
  onCerrar: () => void
  titulo?: string
}) {
  const ref = useRef<HTMLElement>(null)
  // Al aparecer (o cambiar) el resultado se trae a la vista: puede estar fuera de pantalla si la columna es larga.
  useEffect(() => { if (aviso) ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }) }, [aviso])
  if (!aviso) return null

  const hayFallo = aviso.tipo === 'error' || (aviso.tipo === 'resultado' && aviso.resumen.fallaron > 0)
  return (
    <section ref={ref} className={`${ui.panel}${hayFallo ? ` ${ui.panelErr}` : ''}`}
      role={hayFallo ? 'alert' : 'status'} aria-label={titulo}>
      <div className={ui.head}>
        <h3 className={ui.title}>{aviso.tipo === 'error' ? 'No se pudo completar' : titulo}</h3>
        <button type="button" className={ui.close} onClick={onCerrar}>Cerrar</button>
      </div>
      {aviso.tipo === 'resultado' ? (
        <>
          <p className={ui.sum}>{aviso.message}</p>
          {aviso.results.length > 0 && <ul className={ui.list}>{aviso.results.map(r => <Fila key={`${r.memberId}-${r.teamId ?? ''}`} r={r} />)}</ul>}
          {aviso.results.length > 0 && (
            <p className={ui.note}>«Aceptado» significa que el servidor de correo recibió el mensaje; no garantiza que llegue
              (una dirección que no existe puede rebotar más tarde).</p>
          )}
        </>
      ) : (
        <p className={`${ui.msg}${aviso.tipo === 'error' ? ` ${ui.msgErr}` : ''}`}>
          {aviso.tipo === 'error' ? '✗ ' : ''}{aviso.texto}
        </p>
      )}
    </section>
  )
}

/** Estado del último correo de UNA persona (columnas de la migración 035); sin estado guardado no dibuja nada. */
export function EstadoCorreo({ estado, error, intentadoEn, nombre, reintentando, onReintentar }: {
  estado?: 'enviado' | 'falló' | null
  error?: string | null
  intentadoEn?: string | null
  nombre: string
  reintentando: boolean
  onReintentar: () => void
}) {
  if (!estado) return null
  const cuando = intentadoEn
    ? new Date(intentadoEn).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null
  if (estado === 'enviado') {
    return (
      <div className={ui.estado}>
        <span className={`${ui.chip} ${ui.chipOk}`} title="El servidor de correo aceptó el mensaje; no garantiza que llegue.">
          <span className={ui.chipIco} aria-hidden="true">✓</span>Correo aceptado
        </span>
        {cuando && <span className={ui.estadoDetalle}>{cuando}</span>}
      </div>
    )
  }
  return (
    <div className={ui.estado} role="group" aria-label={`Correo a ${nombre}: no se envió`}>
      <span className={`${ui.chip} ${ui.chipFail}`}>
        <span className={ui.chipIco} aria-hidden="true">✗</span>Correo no enviado
      </span>
      {error && <span className={ui.estadoDetalle}>{error}</span>}
      <button type="button" className={ui.retry} disabled={reintentando} onClick={onReintentar}
        aria-label={`Reintentar correo a ${nombre}`}>
        {reintentando ? 'Reintentando…' : 'Reintentar correo'}
      </button>
    </div>
  )
}
