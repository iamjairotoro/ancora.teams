'use client'
/* Lo que se muestra de una llamada de convocatoria que no es el resultado por persona (punto 61, ajuste de octubre 2026):
   · `info` (p. ej. «No hay personas por notificar»): una línea discreta que se va SOLA a los pocos segundos.
   · `error` (401, 403, 500, sin conexión): en rojo, y NO se va solo: queda hasta «Cerrar».
   El resultado de los envíos ya no tiene panel: con éxito no se muestra nada y el problema de una persona es su «!» en la nómina (ProblemaCorreo.tsx). */
import { useEffect } from 'react'
import type { AvisoConvocatoria } from '@/lib/convocatoriaTypes'
import ui from './convocatoria-mensaje.module.css'

export const SEGUNDOS_INFO = 6

export default function MensajeConvocatoria({ aviso, onCerrar }: { aviso: AvisoConvocatoria | null; onCerrar: () => void }) {
  const tipo = aviso?.tipo
  useEffect(() => {
    if (tipo !== 'info') return
    const t = setTimeout(onCerrar, SEGUNDOS_INFO * 1000)
    return () => clearTimeout(t)
  }, [aviso]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!aviso) return null
  if (aviso.tipo === 'info') return <p role="status" className={ui.info}>{aviso.texto}</p>
  return (
    <section role="alert" className={ui.error} aria-label="No se pudo completar">
      <p className={ui.texto}>✗ {aviso.texto}</p>
      <button type="button" className={ui.cerrar} onClick={onCerrar}>Cerrar</button>
    </section>
  )
}
