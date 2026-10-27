'use client'
// Los botones que corresponden al estado de una convocatoria (punto 52): pendiente → Confirmo / No puedo · confirmada → Quitar mi confirmación ·
// declinada por conflicto → Aceptar aquí en su lugar · «no puedo» → Confirmo (cambió de idea) · cerrada (pasó el día del servicio) → solo el aviso.
// `sobreHero` = para fondos oscuros del portal.
import { AvisoCerrada, vistaDeEntrada } from './estado'
import type { EntradaConvocatoria } from './tipos'
import type { ControladorConvocatorias } from './useConvocatorias'
import ui from './convocatorias.module.css'

export default function AccionesConvocatoria({ entrada, c, sobreHero = false, soloConflicto = false }: {
  entrada: EntradaConvocatoria
  c: ControladorConvocatorias
  sobreHero?: boolean
  /** Solo las acciones del conflicto (quitar / aceptar aquí): para pantallas que ya tienen su propio Confirmo / No puedo. */
  soloConflicto?: boolean
}) {
  const vista = vistaDeEntrada(entrada)
  if (!vista || !entrada.invitation) return null
  if (entrada.cerrada) return <AvisoCerrada sobreHero={sobreHero} />      // pasó el día del servicio: ningún botón
  const eq = entrada.team?.name
  const de = eq ? ` en ${eq}` : ''
  const clase = `${ui.acciones}${sobreHero ? ` ${ui.enHero}` : ''}`
  if (vista === 'confirmado') return (
    <div className={clase}>
      <button type="button" className={`${ui.btn} ${ui.btnQ}`} disabled={c.ocupado} onClick={() => c.pedirQuitar(entrada)} aria-label={`Quitar mi confirmación${de}`}>Quitar mi confirmación</button>
    </div>
  )
  if (vista === 'otro-equipo') return (
    <div className={clase}>
      <button type="button" className={`${ui.btn} ${ui.btnQ}`} disabled={c.ocupado} onClick={() => c.pedirAceptarAqui(entrada)} aria-label={`Aceptar aquí${de} en su lugar`}>Aceptar aquí en su lugar</button>
    </div>
  )
  if (soloConflicto) return null
  if (vista === 'pendiente') return (
    <div className={clase}>
      <button type="button" className={`${ui.btn} ${ui.btnA}`} disabled={c.ocupado} onClick={() => c.pedirConfirmar(entrada)} aria-label={`Confirmo${de}`}>✓ Confirmo</button>
      <button type="button" className={`${ui.btn} ${ui.btnQ}`} disabled={c.ocupado} onClick={() => c.responder(entrada, 'no')} aria-label={`No puedo${de}`}>✗ No puedo</button>
    </div>
  )
  if (vista === 'rechazo') return (
    <div className={clase}>
      <button type="button" className={`${ui.btn} ${ui.btnA}`} disabled={c.ocupado} onClick={() => c.pedirConfirmar(entrada)} aria-label={`Confirmo${de}`}>✓ Confirmo</button>
    </div>
  )
  return null
}
