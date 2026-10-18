// ¿Los ids que llegan en una petición son de la ORGANIZACIÓN del llamante? (punto 50, paso 0a.) Las rutas que pasan a la llave de servicio no pueden fiarse de los ids del cuerpo: se comprueba, con la llave de servicio,
// que cada id exista y tenga ese `organization_id`. Un id desconocido o de otra organización hace fallar TODA la comprobación (la ruta responde 404 o 403 genérico, sin decir cuál). Sin enviar ni escribir nada antes.
import type { SupabaseClient } from '@supabase/supabase-js'

export type TablaConOrganizacion = 'members' | 'teams' | 'services' | 'songs'
export const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Todos los ids (los vacíos se ignoran) existen en `tabla` y son de `orgId`. Un id que no tenga forma de uuid falla sin consultar. */
export async function sonDeLaOrganizacion(admin: SupabaseClient, tabla: TablaConOrganizacion, orgId: string, ids: (string | null | undefined)[]): Promise<boolean> {
  const unicos = Array.from(new Set(ids.filter((x): x is string => typeof x === 'string' && x.length > 0)))
  if (unicos.length === 0) return true
  if (!ES_UUID.test(orgId) || !unicos.every(id => ES_UUID.test(id))) return false
  const { data, error } = await admin.from(tabla).select('id').in('id', unicos).eq('organization_id', orgId)
  return !error && (data || []).length === unicos.length
}

export interface IdsDelCuerpo { members?: (string | null | undefined)[]; teams?: (string | null | undefined)[]; services?: (string | null | undefined)[]; songs?: (string | null | undefined)[] }

/** Varias tablas a la vez: true solo si TODAS las comprobaciones pasan. */
export async function todosSonDeLaOrganizacion(admin: SupabaseClient, orgId: string, ids: IdsDelCuerpo): Promise<boolean> {
  const pruebas = (Object.keys(ids) as TablaConOrganizacion[]).filter(t => ids[t]).map(t => sonDeLaOrganizacion(admin, t, orgId, ids[t]!))
  return (await Promise.all(pruebas)).every(Boolean)
}
