// Las dos acciones del conflicto entre convocatorias (punto 52): «Aceptar aquí en su lugar» y «Quitar mi confirmación». Solo servidor.
// La PERSONA no viaja nunca desde el navegador: la ruta la resuelve (requirePortalIdentity: sesión o enlace) y la pasa aquí. De la petición solo se
// toma el id de la invitación, y la función de la base (migración 037c) vuelve a comprobar que sea de esa persona.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AccionConflicto = 'aceptar-aqui' | 'quitar-confirmacion'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FUNCION: Record<AccionConflicto, string> = { 'aceptar-aqui': 'aceptar_aqui_en_su_lugar', 'quitar-confirmacion': 'quitar_confirmacion' }

export interface RespuestaAccion { status: number; body: Record<string, unknown> }

export async function ejecutarAccionConflicto(admin: SupabaseClient, accion: AccionConflicto, memberId: string, invitacion: unknown): Promise<RespuestaAccion> {
  if (typeof invitacion !== 'string' || !UUID.test(invitacion)) return { status: 400, body: { error: 'Convocatoria no válida' } }
  const { data, error } = await admin.rpc(FUNCION[accion], { p_member_id: memberId, p_invitacion_id: invitacion })
  if (error || !data || typeof data !== 'object') return { status: 500, body: { error: 'No se pudo completar la acción. Intenta de nuevo.' } }
  const d = data as Record<string, any>
  switch (d.resultado) {
    case 'ok': return { status: 200, body: accion === 'aceptar-aqui'
      ? { ok: true, vacantes: d.vacantes ?? 0, dejo: Array.isArray(d.dejo) ? d.dejo.length : 0, desplazadas: Array.isArray(d.desplazadas) ? d.desplazadas.length : 0 }
      : { ok: true, liberadas: Array.isArray(d.liberadas) ? d.liberadas.length : 0 } }
    case 'ya_confirmada': return { status: 200, body: { ok: true, yaConfirmada: true } }
    case 'no_existe': return { status: 404, body: { error: 'Convocatoria no encontrada' } }
    case 'no_enviada': return { status: 403, body: { error: 'Esta convocatoria aún no ha sido enviada' } }
    case 'sin_equipo': return { status: 400, body: { error: 'Esta convocatoria no tiene equipo' } }
    case 'no_confirmada': return { status: 409, body: { error: 'Esta convocatoria no está confirmada' } }
    default: return { status: 500, body: { error: 'No se pudo completar la acción. Intenta de nuevo.' } }
  }
}
