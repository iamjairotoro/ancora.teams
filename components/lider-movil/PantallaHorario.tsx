'use client'
// El horario de SU equipo en un servicio (teléfono). Lee y escribe por /api/lider/horario: el servidor deriva el equipo de la herramienta y rechaza lo que no sea de un equipo que lidera.
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import ErrorDeCarga from '../ErrorDeCarga'
import { enviar } from '@/lib/lider/cliente'
import { TEXTOS_LIDER as T, TEXTOS_LIDER_EDICION as TE } from '@/lib/textos/servicioLider'
import { useCarga } from './useCarga'
import ui from './lider-movil.module.css'

interface Fila { id: string; hora: string | null; texto: string; orden: number }

export default function PantallaHorario({ servicioId, herramientaId }: { servicioId: string; herramientaId: string }) {
  const [c, recargar] = useCarga<{ cerrado: boolean; filas: Fila[] }>(`/api/lider/horario?servicio=${encodeURIComponent(servicioId)}&herramienta=${encodeURIComponent(herramientaId)}`)
  const [hora, setHora] = useState(''), [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false)
  if (c.estado === 'cargando') return <p className={ui.mensaje} role="status">{T.cargando}</p>
  if (c.estado === 'prohibido') return <p className={ui.mensaje}>{T.sinAcceso}</p>
  if (c.estado === 'error') return <ErrorDeCarga compacto titulo={T.noSePudoCargar} cuerpo={T.noSePudoCargarCuerpo} onReintentar={recargar} />
  const { cerrado, filas } = c.datos
  const hacer = async (cuerpo: Record<string, unknown>) => { setOcupado(true); setError(null); const r = await enviar('horario', { servicio: servicioId, herramienta: herramientaId, ...cuerpo }); setOcupado(false); if (!r.ok) setError(r.error); recargar(); return r.ok }
  return (
    <div className={ui.pagina}>
      <h1 className={ui.titulo}>{TE.horario}</h1>
      {cerrado && <p className={ui.avisoCerrado}>{TE.cerrado}</p>}
      {filas.length === 0 ? <p className={ui.mensaje}>{TE.sinFilas}</p> : (
        <ul className={ui.lista}>
          {filas.map(f => (
            <li key={f.id} className={ui.itemFila}>
              <input className={`${ui.campo} ${ui.horaCampo}`} defaultValue={f.hora ?? ''} aria-label={`${TE.hora}: ${f.texto}`} disabled={cerrado || ocupado} maxLength={20} onBlur={e => { if (e.target.value.trim() !== (f.hora ?? '')) hacer({ accion: 'editar', fila: f.id, hora: e.target.value.trim() }) }} />
              <input className={ui.campo} defaultValue={f.texto} aria-label={TE.queSucede} disabled={cerrado || ocupado} maxLength={200} onBlur={e => { const v = e.target.value.trim(); if (v && v !== f.texto) hacer({ accion: 'editar', fila: f.id, texto: v }) }} />
              <button type="button" className={ui.pasoBtn} aria-label={`${TE.eliminar}: ${f.texto}`} disabled={cerrado || ocupado} onClick={() => hacer({ accion: 'eliminar', fila: f.id })}><Trash2 size={18} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      )}
      {!cerrado && (
        <form className={ui.fila2} onSubmit={async e => { e.preventDefault(); if (!texto.trim()) return; if (await hacer({ accion: 'crear', hora: hora.trim() || null, texto: texto.trim() })) { setHora(''); setTexto('') } }}>
          <input className={`${ui.campo} ${ui.horaCampo}`} value={hora} onChange={e => setHora(e.target.value)} placeholder={TE.hora} aria-label={TE.hora} maxLength={20} />
          <input className={ui.campo} value={texto} onChange={e => setTexto(e.target.value)} placeholder={TE.queSucede} aria-label={TE.queSucede} maxLength={200} />
          <button type="submit" className={ui.boton} style={{ flex: '0 0 auto' }} disabled={ocupado || !texto.trim()}>{TE.agregarFila}</button>
        </form>
      )}
      {error && <p className={ui.error} role="alert">{error}</p>}
    </div>
  )
}
