// Qué chats PUEDE ver una persona en el portal (punto 49). Solo servidor: lo usa
// /api/portal/chat para devolver únicamente lo que le corresponde.
//
//   · 'team'          el chat general del equipo.
//   · <id de servicio> los servicios FUTUROS donde está asignada y ya recibió la convocatoria
//                      (invitación enviada), más todos los ensayos futuros. Es la misma regla con
//                      que /api/portal/me arma su lista de servicios.
//   · 'dm_<a>_<b>'    sus mensajes directos: solo los hilos donde ella es una de las dos personas.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Forma de un id de persona o de servicio dentro de un chat (uuid en producción). */
export const CHAT_ID_RE = /^[A-Za-z0-9-]{1,64}$/

export const dmChatId = (a: string, b: string) => 'dm_' + [a, b].sort().join('_')

/** Extrae a la otra persona de 'dm_<a>_<b>' si `me` es una de las dos; si no, null. */
export function dmPartnerOf(chatId: string, me: string): string | null {
  if (!chatId.startsWith('dm_')) return null
  const parts = chatId.slice(3).split('_')
  if (parts.length !== 2 || !parts.every(p => CHAT_ID_RE.test(p))) return null
  const [a, b] = parts
  if (a === b) return null
  if (a === me) return b
  if (b === me) return a
  return null
}

export type ChatScope = { serviceIds: string[]; dmPartnerIds: string[]; coMemberIds: string[] }

type Svc = { id: string; fecha: string; hora_fin: string | null; tipo: string | null }
const isFuture = (s: Svc) => new Date(s.hora_fin ? s.fecha + 'T' + s.hora_fin : s.fecha + 'T14:00:00') > new Date()

export async function loadChatScope(admin: SupabaseClient, me: string): Promise<ChatScope> {
  const [svcRes, asgRes, invRes, sentRes, recvRes] = await Promise.all([
    admin.from('services').select('id, fecha, hora_fin, tipo'),
    admin.from('banda_assignments').select('service_id').eq('member_id', me),
    admin.from('invitations').select('service_id, sent_at').eq('member_id', me),
    admin.from('messages').select('recipient_member_id').eq('member_id', me).order('created_at', { ascending: false }).limit(1000),
    admin.from('messages').select('member_id, recipient_member_id').eq('recipient_member_id', me).order('created_at', { ascending: false }).limit(1000),
  ])
  const assigned = new Set((asgRes.data || []).map((r: { service_id: string }) => r.service_id))
  const invited = new Set((invRes.data || []).filter((r: { sent_at: string | null }) => r.sent_at).map((r: { service_id: string }) => r.service_id))
  const serviceIds = ((svcRes.data || []) as Svc[])
    .filter(s => isFuture(s) && (s.tipo === 'ensayo' || (assigned.has(s.id) && invited.has(s.id))))
    .map(s => s.id)

  const partners = new Set<string>()
  for (const r of (sentRes.data || []) as { recipient_member_id: string | null }[]) if (r.recipient_member_id && r.recipient_member_id !== me) partners.add(r.recipient_member_id)
  for (const r of (recvRes.data || []) as { member_id: string; recipient_member_id: string | null }[]) if (r.recipient_member_id === me && r.member_id !== me) partners.add(r.member_id)

  // Quienes comparten un servicio con ella (asignados o convocados a él): solo para poder
  // mostrar nombres y ofrecerlos al iniciar un mensaje directo.
  const co = new Set<string>()
  if (serviceIds.length) {
    const [a, i] = await Promise.all([
      admin.from('banda_assignments').select('member_id').in('service_id', serviceIds),
      admin.from('invitations').select('member_id, sent_at').in('service_id', serviceIds),
    ])
    for (const r of (a.data || []) as { member_id: string | null }[]) if (r.member_id) co.add(r.member_id)
    for (const r of (i.data || []) as { member_id: string; sent_at: string | null }[]) if (r.sent_at) co.add(r.member_id)
  }
  co.delete(me)
  return { serviceIds, dmPartnerIds: Array.from(partners), coMemberIds: Array.from(co) }
}
