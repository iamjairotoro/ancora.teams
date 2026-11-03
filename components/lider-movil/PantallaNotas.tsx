'use client'
// Las notas de SU equipo en un servicio (teléfono). Lee y guarda por /api/lider/notas; guarda al pulsar «Guardar notas» (no hay guardado automático).
import { useEffect, useState } from 'react'
import ErrorDeCarga from '../ErrorDeCarga'
import { enviar } from '@/lib/lider/cliente'
import { TEXTOS_LIDER as T, TEXTOS_LIDER_EDICION as TE } from '@/lib/textos/servicioLider'
import { useCarga } from './useCarga'
import ui from './lider-movil.module.css'

export default function PantallaNotas({ servicioId, herramientaId }: { servicioId: string; herramientaId: string }) {
  const [c, recargar] = useCarga<{ cerrado: boolean; texto: string }>(`/api/lider/notas?servicio=${encodeURIComponent(servicioId)}&herramienta=${encodeURIComponent(herramientaId)}`)
  const [texto, setTexto] = useState(''), [estado, setEstado] = useState<'quieto' | 'guardando' | 'guardado'>('quieto'), [error, setError] = useState<string | null>(null)
  useEffect(() => { if (c.estado === 'ok') setTexto(c.datos.texto) }, [c])
  if (c.estado === 'cargando') return <p className={ui.mensaje} role="status">{T.cargando}</p>
  if (c.estado === 'prohibido') return <p className={ui.mensaje}>{T.sinAcceso}</p>
  if (c.estado === 'error') return <ErrorDeCarga compacto titulo={T.noSePudoCargar} cuerpo={T.noSePudoCargarCuerpo} onReintentar={recargar} />
  const cerrado = c.datos.cerrado
  const guardar = async () => { setEstado('guardando'); setError(null); const r = await enviar('notas', { servicio: servicioId, herramienta: herramientaId, texto }); if (r.ok) setEstado('guardado'); else { setEstado('quieto'); setError(r.error) } }
  return (
    <div className={ui.pagina}>
      <h1 className={ui.titulo}>{TE.notas}</h1>
      {cerrado && <p className={ui.avisoCerrado}>{TE.cerrado}</p>}
      <textarea className={`${ui.campo} ${ui.campoArea}`} value={texto} onChange={e => { setTexto(e.target.value); setEstado('quieto') }} placeholder={TE.notasPlaceholder} aria-label={TE.notas} maxLength={5000} disabled={cerrado} />
      {!cerrado && <button type="button" className={ui.boton} disabled={estado === 'guardando'} onClick={guardar}>{estado === 'guardando' ? TE.guardando : estado === 'guardado' ? TE.guardado : TE.guardarNotas}</button>}
      {error && <p className={ui.error} role="alert">{error}</p>}
    </div>
  )
}
