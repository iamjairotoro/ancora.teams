// Agregar a una persona a un equipo: LA función que usan la ficha, la vista de
// perfil y (más adelante) el pop-up de edición y «Agregar integrante».
//
// - UN solo insert en team_members (sin posiciones, salvo que se pida una).
// - Un duplicado (23505) NO es un error: «ya estaba en el equipo».
// - Cualquier otro error, o un insert que no afecta ninguna fila, se devuelve con
//   el texto de la base y, si parece un tema de permisos (RLS), la pista
//   «revisá permisos». Nada se ignora en silencio.

import { supabase } from './supabase'
import { DEFAULT_ORGANIZATION_ID } from './constants'

export type AddToTeamResult =
  | { status: 'ok'; teamMemberId: string }
  | { status: 'already'; teamMemberId: string | null } // ya era integrante: refrescar, sin error
  | { status: 'error'; message: string }

const looksLikeRls = (code?: string | null, message?: string | null) =>
  code === '42501' || /row-level security|permission denied|not authorized|violates .*polic/i.test(message || '')

/** Texto para mostrar: el de la base y, si parece RLS, «revisá permisos». */
export function dbErrorText(error: { code?: string | null; message?: string | null } | null, fallback: string): string {
  const text = (error?.message || fallback).trim()
  return looksLikeRls(error?.code, error?.message) ? `${text} — revisá permisos.` : text
}

export async function addToTeam(
  memberId: string,
  teamId: string,
  opts?: { positionId?: string; existingTeamMemberId?: string | null },
): Promise<AddToTeamResult> {
  let teamMemberId = opts?.existingTeamMemberId ?? null
  let already = !!teamMemberId

  if (!teamMemberId) {
    const { data, error } = await supabase.from('team_members')
      .insert({ member_id: memberId, team_id: teamId, organization_id: DEFAULT_ORGANIZATION_ID })
      .select('id')
    if (error?.code === '23505') {
      already = true
      const { data: row } = await supabase.from('team_members').select('id')
        .eq('member_id', memberId).eq('team_id', teamId).maybeSingle()
      teamMemberId = row?.id ?? null
    } else if (error) {
      return { status: 'error', message: dbErrorText(error, 'No se pudo agregar al equipo.') }
    } else if (!data || data.length === 0) {
      return { status: 'error', message: 'No se agregó ninguna fila (la base no devolvió la persona) — revisá permisos.' }
    } else {
      teamMemberId = (data[0] as { id: string }).id
    }
  }

  if (opts?.positionId && teamMemberId) {
    const { error } = await supabase.from('team_member_positions')
      .insert({ team_member_id: teamMemberId, team_position_id: opts.positionId })
    if (error && error.code !== '23505') {
      return { status: 'error', message: `Se agregó al equipo, pero no la posición: ${dbErrorText(error, 'error desconocido')}` }
    }
  }

  return already ? { status: 'already', teamMemberId } : { status: 'ok', teamMemberId: teamMemberId as string }
}
