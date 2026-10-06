// «Hacer líder» / «Quitar liderazgo»: team_members.is_leader de UNA persona en UN
// equipo. Un update que la política (RLS) deja en 0 filas NO es un éxito: se
// pide la fila de vuelta y se avisa. Sin confirmación (se deshace con el mismo botón).
import { supabase } from './supabase'
import { dbErrorText } from './addToTeam'

export type SetLeaderResult = { ok: true } | { ok: false; message: string }

export async function setTeamLeader(memberId: string, teamId: string, leader: boolean): Promise<SetLeaderResult> {
  const { data, error } = await supabase.from('team_members').update({ is_leader: leader })
    .eq('member_id', memberId).eq('team_id', teamId).select('id')
  if (error) return { ok: false, message: dbErrorText(error, 'No se pudo cambiar el liderazgo.') }
  if (!data || data.length === 0) return { ok: false, message: 'No se modificó ninguna fila — revisá permisos o que la persona siga en el equipo.' }
  return { ok: true }
}
