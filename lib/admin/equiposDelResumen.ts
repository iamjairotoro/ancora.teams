// Qué equipos de un servicio (del resumen) ve cada visitante: el administrador, todos; un líder, solo los que lidera. (La misma regla de lib/home/hoy.ts, para la lista de Servicios.)
import type { EquipoDeServicio } from '@/lib/admin/resumenServicios'
import type { Viewer } from '@/lib/teamBlocks'

export const equiposVisiblesDelResumen = (equipos: EquipoDeServicio[], v: Viewer): EquipoDeServicio[] => (v.kind === 'admin' ? equipos : equipos.filter(e => v.teamIds.has(e.teamId)))
