// Bloqueos de fecha de LA PERSONA identificada (date_blocks), por EQUIPO (punto 51, versión B).
// Sustituye a /api/date-blocks. El contrato anterior sigue valiendo: GET → { blocks }, POST →
// { block }, DELETE → { ok }; se AGREGA `team_id` a cada fila, `teams` (sus equipos activos) en el GET
// y `teamIds` en el POST:
//   · sin `teamIds` (o null) → vale para TODOS sus equipos (una fila con team_id NULL: así queda
//     cubierto también un equipo al que se sume después);
//   · `teamIds: [...]`      → solo esos equipos (deben ser suyos); si cubre todos, se guarda como «todos»;
//   · `teamIds: []`         → ninguno (borra el bloqueo de esa fecha).
// La escritura es atómica: set_date_blocks() (migración 031) reemplaza las filas de la persona en
// la fecha. Hasta correr la 032 (borrar el índice viejo) falla con 500 (código 23505) un bloqueo que deje
// DOS O MÁS equipos bloqueados pero no todos; «todos» y un solo equipo se guardan igual (una fila por fecha).
// El motivo es uno solo por fecha. La visibilidad hacia líderes y administración (solo los equipos a los
// que aplica) la resuelven las funciones de la base, no esta ruta: acá solo escribe y lee la persona.
import { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'

export const dynamic = 'force-dynamic'

const isDate = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(v + 'T12:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64
const ID_RE = /^[A-Za-z0-9-]{1,64}$/
const MAX_TEAMS = 50

type Team = { id: string; name: string; color: string | null }

/** Equipos ACTIVOS de la persona (los que puede elegir en el calendario). */
async function activeTeams(admin: SupabaseClient, memberId: string): Promise<Team[]> {
  const { data: tm } = await admin.from('team_members').select('team_id').eq('member_id', memberId)
  const ids = Array.from(new Set((tm || []).map((r: { team_id: string }) => r.team_id)))
  if (!ids.length) return []
  const { data } = await admin.from('teams').select('id, name, color, sort_order').in('id', ids).is('archived_at', null).order('sort_order')
  return ((data || []) as (Team & { sort_order?: number })[]).map(t => ({ id: t.id, name: t.name, color: t.color ?? null }))
}

export async function GET(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const me = auth.identity.memberId
  const admin = createAdminSupabase()
  const [{ data, error }, teams] = await Promise.all([
    admin.from('date_blocks').select('*, service:services(fecha, titulo)').eq('member_id', me),
    activeTeams(admin, me),
  ])
  if (error) return portalJson({ error: 'No se pudo leer' }, 500)
  return portalJson({ blocks: data || [], teams })
}

export async function POST(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const me = auth.identity.memberId
  const b = await req.json().catch(() => null)
  if (!b || typeof b !== 'object') return portalJson({ error: 'Datos no válidos' }, 400)

  const blockedDate = b.date || b.startDate
  if (!isDate(blockedDate)) return portalJson({ error: 'Fecha no válida' }, 400)
  const startDate = b.startDate ?? blockedDate
  const endDate = b.endDate ?? blockedDate
  if (!isDate(startDate) || !isDate(endDate) || endDate < startDate) return portalJson({ error: 'Rango de fechas no válido' }, 400)
  if (b.reason != null && (typeof b.reason !== 'string' || b.reason.length > 500)) return portalJson({ error: 'Motivo no válido' }, 400)
  if (b.serviceId != null && !isId(b.serviceId)) return portalJson({ error: 'Servicio no válido' }, 400)
  let teamIds: string[] | null = null // null = todos
  if (b.teamIds != null) {
    if (!Array.isArray(b.teamIds) || b.teamIds.length > MAX_TEAMS || !b.teamIds.every((t: unknown) => typeof t === 'string' && ID_RE.test(t))) {
      return portalJson({ error: 'Equipos no válidos' }, 400)
    }
    teamIds = Array.from(new Set<string>(b.teamIds))
  }

  const admin = createAdminSupabase()
  // Si no viene un serviceId explícito, se busca si esa fecha coincide con un servicio (solo
  // como referencia informativa; no es obligatorio que exista). Igual que antes.
  let resolvedServiceId: string | null = b.serviceId || null
  if (!resolvedServiceId) {
    const { data: svc } = await admin.from('services').select('id').eq('fecha', blockedDate).maybeSingle()
    resolvedServiceId = svc?.id || null
  }

  const { error } = await admin.rpc('set_date_blocks', {
    p_member_id: me, p_date: blockedDate, p_team_ids: teamIds, p_reason: b.reason || null,
    p_start_date: startDate, p_end_date: endDate, p_service_id: resolvedServiceId,
  })
  if (error) {
    // 'un equipo no pertenece a la persona' lo lanza la función: es un dato inválido, no una falla.
    if (/no pertenece/i.test(error.message || '')) return portalJson({ error: 'Equipos no válidos' }, 400)
    // `code` = código SQLSTATE de la base (p. ej. 23505 = índice único): no es un dato sensible y permite diagnosticar.
    return portalJson({ error: 'No se pudo guardar', code: error.code || null }, 500)
  }
  const { data: rows } = await admin.from('date_blocks').select('*').eq('member_id', me).eq('blocked_date', blockedDate)
  return portalJson({ block: (rows || [])[0] ?? null, blocks: rows || [] })
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const me = auth.identity.memberId
  const b = await req.json().catch(() => null)
  const date = b?.date, serviceId = b?.serviceId, teamId = b?.teamId
  if (date != null ? !isDate(date) : !isId(serviceId)) return portalJson({ error: 'date o serviceId requerido' }, 400)
  if (teamId != null && (date == null || typeof teamId !== 'string' || !ID_RE.test(teamId))) return portalJson({ error: 'Equipo no válido' }, 400)
  const admin = createAdminSupabase()

  // Quitar el bloqueo SOLO de un equipo (una fila «todos» se expande a los demás equipos).
  if (teamId != null) {
    const [{ data: rows }, teams] = await Promise.all([
      admin.from('date_blocks').select('*').eq('member_id', me).eq('blocked_date', date),
      activeTeams(admin, me),
    ])
    if (!rows?.length) return portalJson({ ok: true })
    const all = (rows as { team_id: string | null }[]).some(r => r.team_id === null)
    const current = all ? teams.map(t => t.id) : (rows as { team_id: string }[]).map(r => r.team_id)
    const remaining = current.filter(t => t !== teamId)
    const first = rows[0] as { reason: string | null; start_date: string | null; end_date: string | null; service_id: string | null }
    const { error } = await admin.rpc('set_date_blocks', {
      p_member_id: me, p_date: date, p_team_ids: remaining, p_reason: first.reason,
      p_start_date: first.start_date, p_end_date: first.end_date, p_service_id: first.service_id,
    })
    if (error) return portalJson({ error: 'No se pudo guardar', code: error.code || null }, 500)
    return portalJson({ ok: true })
  }

  let query = admin.from('date_blocks').delete().eq('member_id', me)
  query = date != null ? query.eq('blocked_date', date) : query.eq('service_id', serviceId)
  const { error } = await query
  if (error) return portalJson({ error: 'No se pudo guardar' }, 500)
  return portalJson({ ok: true })
}
