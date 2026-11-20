'use client'
// La hoja «Bloquear {día}» de la tira de días (prototipo docs/mockups/index.html): motivos rápidos (Trabajo, Familia, Viaje, Estudios) más un campo de texto, con el aviso «Tu motivo lo ven los líderes de tu equipo».
// Bloquea UN día para todos los equipos de la persona (los rangos y los equipos sueltos siguen en Disponibilidad). El motivo escrito pesa más que el chip. Si guardar falla, la hoja sigue abierta con lo escrito y un aviso.
import { useState } from 'react'
import { MOTIVOS_RAPIDOS, MOTIVO_MAXIMO, motivoFinal, tituloDelDia } from '@/lib/home/tira'
import { TEXTOS_TIRA as T } from '@/lib/textos/tiraDias'
import HojaInferior from './HojaInferior'
import ui from './tira-dias.module.css'

type Props = { fecha: string; onGuardar: (motivo: string) => Promise<boolean>; onCerrar: () => void }

// La hoja siempre está en el árbol con `abierta`; el formulario vive en ContenidoBloqueo, que nace de nuevo en cada apertura (motivo y aviso de error vacíos).
export default function HojaBloqueo({ abierta, ...props }: Props & { abierta: boolean }) {
  return <HojaInferior abierta={abierta} etiqueta={T.hojaBloqueoTitulo(tituloDelDia(props.fecha).toLowerCase())} onCerrar={props.onCerrar}><ContenidoBloqueo {...props} /></HojaInferior>
}

function ContenidoBloqueo({ fecha, onGuardar, onCerrar }: Props) {
  const [chip, setChip] = useState(''), [texto, setTexto] = useState(''), [guardando, setGuardando] = useState(false), [fallo, setFallo] = useState(false)
  const guardar = async () => {
    if (guardando) return
    setGuardando(true); setFallo(false)
    const ok = await onGuardar(motivoFinal(chip, texto))
    setGuardando(false)
    if (!ok) setFallo(true)
  }
  return (
    <>
      <h3 className={ui.hojaTitulo}>{T.hojaBloqueoTitulo(tituloDelDia(fecha).toLowerCase())}</h3>
      <p className={ui.hojaAviso}>{T.hojaBloqueoAviso}</p>
      <div className={ui.chips} role="group" aria-label={T.motivos}>
        {MOTIVOS_RAPIDOS.map(m => <button key={m} type="button" className={ui.chip} aria-pressed={chip === m} onClick={() => { setChip(m); setTexto('') }}>{m}</button>)}
      </div>
      <input className={ui.campo} type="text" value={texto} maxLength={MOTIVO_MAXIMO} placeholder={T.otroMotivo} aria-label={T.otroMotivo} autoComplete="off" onChange={e => { setTexto(e.target.value); if (e.target.value.trim()) setChip('') }} />
      {fallo && <p className={ui.error} role="alert">{T.noSePudoBloquear}</p>}
      <div className={ui.fila2}>
        <button type="button" className={`${ui.btn} ${ui.secundario}`} onClick={onCerrar} disabled={guardando}>{T.cancelar}</button>
        <button type="button" className={`${ui.btn} ${ui.principal}`} onClick={guardar} disabled={guardando}>{guardando ? T.guardando : T.bloquear}</button>
      </div>
    </>
  )
}
