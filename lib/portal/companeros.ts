// Quiénes comparten un equipo con una persona (punto 49: directos del chat; punto 54, commit 7: cumpleaños del Inicio). Solo servidor. SOLO dentro de su organización y de sus equipos no archivados: nunca toda la
// organización ni otra. Sin organización conocida no se suma a nadie.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hoyEnSantiago } from '@/lib/portal/fechas'
import { proximosCumpleanos, type Cumple } from '@/lib/portal/cumpleanos'

export async function companerosDeEquipo(admin: SupabaseClient, me: string, orgId: string | null): Promise<string[]> {
  if (!orgId) return []
  const mates = new Set<string>()
  const mine = await admin.from('team_members').select('team_id').eq('member_id', me).eq('organization_id', orgId)
  const teamIds = Array.from(new Set((mine.data || []).map((r: { team_id: string }) => r.team_id)))
  if (teamIds.length) {
    const [teams, tm] = await Promise.all([
      admin.from('teams').select('id').in('id', teamIds).eq('organization_id', orgId).is('archived_at', null),
      admin.from('team_members').select('member_id, team_id').in('team_id', teamIds).eq('organization_id', orgId),
    ])
    const live = new Set((teams.data || []).map((t: { id: string }) => t.id))
    for (const r of (tm.data || []) as { member_id: string; team_id: string }[]) if (live.has(r.team_id)) mates.add(r.member_id)
  }
  mates.delete(me)
  return Array.from(mates)
}

/** Los cumpleaños próximos de quienes comparten equipo con `me`: solo id, nombre, apellido, foto, día y mes (ver lib/portal/cumpleanos.ts). Nunca la fecha completa ni la edad. */
export async function cumpleanosDeEquipos(admin: SupabaseClient, me: string, ahora: Date = new Date()): Promise<Cumple[]> {
  const { data: yo } = await admin.from('members').select('organization_id').eq('id', me).maybeSingle()
  const orgId: string | null = yo?.organization_id ?? null
  const ids = await companerosDeEquipo(admin, me, orgId)
  if (!orgId || !ids.length) return []
  const { data } = await admin.from('members').select('id, nombre, apellido, avatar_url, fecha_nacimiento').in('id', ids).eq('organization_id', orgId)
  return proximosCumpleanos((data || []) as any[], hoyEnSantiago(ahora))
}
