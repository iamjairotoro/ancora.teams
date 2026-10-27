// Las dos acciones del conflicto entre convocatorias (punto 52): «Aceptar aquí en su lugar» y «Quitar mi confirmación». Solo servidor.
// La PERSONA no viaja nunca desde el navegador: la ruta la resuelve (requirePortalIdentity: sesión o enlace) y la pasa aquí. De la petición solo se
// toma el id de la invitación, y la función de la base (migración 037c) vuelve a comprobar que sea de esa persona.
import { MSG } from '@/lib/textos/mensajes'
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TEXTO_CERRADA } from '@/lib/convocatoriaCerrada'
import { TEXTOS_DOBLE } from '@/lib/textos/doble'

export type AccionConflicto = 'aceptar-aqui' | 'quitar-confirmacion'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FUNCION: Record<AccionConflicto, string> = { 'aceptar-aqui': 'aceptar_aqui_en_su_lugar', 'quitar-confirmacion': 'quitar_confirmacion' }

export interface RespuestaAccion { status: number; body: Record<string, unknown> }

export async function ejecutarAccionConflicto(admin: SupabaseClient, accion: AccionConflicto, memberId: string, invitacion: unknown): Promise<RespuestaAccion> {
  if (typeof invitacion !== 'string' || !UUID.test(invitacion)) return { status: 400, body: { error: 'Convocatoria no válida' } }
  const { data, error } = await admin.rpc(FUNCION[accion], { p_member_id: memberId, p_invitacion_id: invitacion })
  if (error || !data || typeof data !== 'object') return { status: 500, body: { error: MSG.noSePudoCompletarLaAccion } }
  const d = data as Record<string, any>
  switch (d.resultado) {
    case 'ok': return { status: 200, body: accion === 'aceptar-aqui'
      ? { ok: true, vacantes: d.vacantes ?? 0, dejo: Array.isArray(d.dejo) ? d.dejo.length : 0, desplazadas: Array.isArray(d.desplazadas) ? d.desplazadas.length : 0 }
      : { ok: true, liberadas: Array.isArray(d.liberadas) ? d.liberadas.length : 0 } }
    case 'ya_confirmada': return { status: 200, body: { ok: true, yaConfirmada: true } }
    case 'no_existe': return { status: 404, body: { error: 'Convocatoria no encontrada' } }
    case 'no_enviada': return { status: 403, body: { error: MSG.convocatoriaNoEnviada } }
    case 'cerrada': return { status: 410, body: { error: TEXTO_CERRADA, codigo: 'cerrada' } }      // pasó el día del servicio (037d)
    case 'sin_equipo': return { status: 400, body: { error: 'Esta convocatoria no tiene equipo' } }
    case 'no_confirmada': return { status: 409, body: { error: 'Esta convocatoria no está confirmada' } }
    default: return { status: 500, body: { error: MSG.noSePudoCompletarLaAccion } }
  }
}

/** «Cambiar» entre dos equipos (migración 038, `cambiar_convocatoria`): la persona sale de la sesión; del navegador solo viajan los dos ids de convocatoria. Una excepción de la base (se deshace todo) o un error → 500 genérico. */
export async function ejecutarCambioConvocatoria(admin: SupabaseClient, memberId: string, desde: unknown, hacia: unknown): Promise<RespuestaAccion> {
  if (typeof desde !== 'string' || !UUID.test(desde) || typeof hacia !== 'string' || !UUID.test(hacia)) return { status: 400, body: { error: 'Convocatoria no válida' } }
  const { data, error } = await admin.rpc('cambiar_convocatoria', { p_member_id: memberId, p_desde_id: desde, p_hacia_id: hacia })
  if (error || !data || typeof data !== 'object') return { status: 500, body: { error: MSG.noSePudoCompletarLaAccion } }
  const d = data as Record<string, any>
  if (d.resultado === 'ok') return { status: 200, body: { ok: true, desplazadas: Array.isArray(d.desplazadas) ? d.desplazadas.length : 0 } }
  const r = typeof d.resultado === 'string' && Object.prototype.hasOwnProperty.call(TEXTOS_DOBLE.cambiarResultado, d.resultado) ? TEXTOS_DOBLE.cambiarResultado[d.resultado] : null
  if (!r) return { status: 500, body: { error: MSG.noSePudoCompletarLaAccion } }
  return { status: r.status, body: d.resultado === 'cerrada' ? { error: r.texto, codigo: 'cerrada' } : { error: r.texto } }
}
