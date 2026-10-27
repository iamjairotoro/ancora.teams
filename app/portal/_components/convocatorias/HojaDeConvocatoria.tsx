'use client'
// La hoja de confirmación de las acciones de convocatoria, con su texto: se monta UNA vez por pantalla junto al controlador (useConvocatorias).
import HojaConfirmacion from './HojaConfirmacion'
import { TEXTOS_DOBLE as TD } from '@/lib/textos/doble'
import type { ControladorConvocatorias } from './useConvocatorias'
import ui from './convocatorias.module.css'

export default function HojaDeConvocatoria({ c }: { c: ControladorConvocatorias }) {
  const h = c.hoja
  const nuevo = h?.entrada.team?.name
  return (
    <>
      <p className={ui.sr} role="status" aria-live="polite">{c.aviso ?? ''}</p>
      <HojaConfirmacion
        abierta={!!h}
        titulo={h?.tipo === 'quitar' ? 'Quitar mi confirmación' : h?.tipo === 'declinar' ? 'Declinar esta convocatoria' : h?.tipo === 'confirmar' ? TD.confirmarTitulo(nuevo ?? 'este equipo') : h?.tipo === 'cambiar' ? TD.cambiarTitulo(nuevo ?? 'este equipo') : 'Aceptar aquí en su lugar'}
        etiquetaConfirmar={h?.tipo === 'quitar' ? 'Sí, quitarla' : h?.tipo === 'declinar' ? 'Sí, no puedo' : h?.tipo === 'confirmar' ? TD.confirmarAccion : h?.tipo === 'cambiar' ? TD.cambiarAccion : 'Sí, aceptar aquí'}
        onConfirmar={c.confirmarHoja} onCancelar={c.cancelarHoja} ocupado={c.ocupado} error={h?.error}
      >
        {h?.tipo === 'confirmar' && (
          <>
            <p>{TD.confirmarTexto(h.declina)}</p>
            {h.cruce && <p>{h.cruce}</p>}
          </>
        )}
        {h?.tipo === 'cambiar' && (
          <>
            <p>{TD.cambiarTexto(h.deja ?? 'el otro equipo', nuevo ?? 'este equipo')}</p>
            {h.cruce && <p>{h.cruce}</p>}
          </>
        )}
        {h?.tipo === 'aceptar-aqui' && (
          <>
            <p>Dejas tu lugar en <b>{h.deja ?? 'el otro equipo'}</b>: sus posiciones quedarán vacantes y su líder verá la vacante.</p>
            <p>Confirmas tu lugar en <b>{nuevo ?? 'este equipo'}</b>{h.entrada.posiciones.length ? ` (${h.entrada.posiciones.join(' · ')})` : ''}.</p>
          </>
        )}
        {h?.tipo === 'quitar' && (
          <>
            <p>Tu confirmación en <b>{nuevo ?? 'este equipo'}</b> se quita y vuelves a «pendiente».</p>
            {h.vuelven.length > 0 && <p>{h.vuelven.length === 1 ? 'La convocatoria' : 'Las convocatorias'} que se habían declinado por esa confirmación {h.vuelven.length === 1 ? 'vuelve' : 'vuelven'} a pendiente: <b>{h.vuelven.join(', ')}</b>.</p>}
          </>
        )}
        {h?.tipo === 'declinar' && (
          <>
            <p>Dices que no puedes en <b>{nuevo ?? 'este equipo'}</b>: tu confirmación se anula y su líder verá que ya no cuenta contigo.</p>
            {h.vuelven.length > 0 && <p>{h.vuelven.length === 1 ? 'La convocatoria' : 'Las convocatorias'} que se habían declinado por esa confirmación {h.vuelven.length === 1 ? 'vuelve' : 'vuelven'} a pendiente: <b>{h.vuelven.join(', ')}</b>.</p>}
          </>
        )}
      </HojaConfirmacion>
    </>
  )
}
