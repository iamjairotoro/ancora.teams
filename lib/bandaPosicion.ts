// La posición de una asignación (banda_assignments) se guarda por ID (migración 037a, punto 52): team_position_id → team_positions.
// El NOMBRE y el EQUIPO se resuelven con un join, así que renombrar una posición no rompe nada. `posicion` (texto) ya no se escribe:
// solo queda en las filas heredadas (códigos viejos), que no tienen id y se van con la limpieza de los datos de prueba (punto 35).
// Sin acceso a datos ni a servidor: lo usan las rutas del portal, los correos y las pantallas de administración.

/** Lo que se pide junto a cada asignación para saber su posición y su equipo (una sola consulta, sin mapas por nombre). */
export const BANDA_POSICION_EMBED = 'team_position:team_positions(name, team_id, teams(name))'

type Uno<T> = T | T[] | null | undefined
export interface PosicionEmbebida { name?: string | null; team_id?: string | null; teams?: Uno<{ name?: string | null }> }
export interface FilaConPosicion { posicion?: string | null; team_position?: Uno<PosicionEmbebida> }

const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null))

/** El nombre ACTUAL de la posición; en una fila heredada (sin id), el texto que tenía. */
export function etiquetaDePosicion(b: FilaConPosicion): string {
  return uno(b.team_position)?.name || b.posicion || '—'
}

/** El equipo de la posición, o undefined si la fila es heredada (sin id) o la consulta no lo trajo. */
export function equipoDePosicion(b: FilaConPosicion): { teamId: string; teamName: string } | undefined {
  const tp = uno(b.team_position)
  if (!tp?.team_id) return undefined
  return { teamId: tp.team_id, teamName: uno(tp.teams)?.name || '' }
}

/** Una fila de banda como la recibe el portal: `posicion` es el nombre actual y viene el equipo; no viaja el id ni el join. */
export function bandaParaPortal<T extends FilaConPosicion & { team_position_id?: unknown }>(b: T) {
  const { team_position: _tp, team_position_id: _id, ...resto } = b as T & { team_position?: unknown }
  return { ...resto, posicion: etiquetaDePosicion(b), ...equipoDePosicion(b) }
}
