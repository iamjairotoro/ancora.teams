// Chat del portal, SOLO LECTURA (punto 49, commit 3). El navegador ya no consulta `messages` ni
// `members` con la llave pública: este endpoint devuelve únicamente lo que la persona identificada
// puede ver (ver lib/portal/chatScope.ts); nunca mensajes de chats ajenos.
//
//   GET /api/portal/chat            → resumen: sus chats, el último mensaje de cada uno y las
//                                     personas necesarias para mostrar nombres.
//   GET /api/portal/chat?chat=<id>  → hilo de UN chat (los últimos 100 mensajes, en orden), solo
//                                     si el chat es suyo; si no, 403.
// El envío y la presencia siguen como estaban hasta el commit 4. Sin sondeos propios: el
// navegador consulta cada ~5 s el hilo abierto y cada 30-60 s el resumen, solo con la pestaña visible.
import { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'
import { CHAT_ID_RE, dmChatId, dmPartnerOf, loadChatScope } from '@/lib/portal/chatScope'

export const dynamic = 'force-dynamic'

const THREAD_LIMIT = 100
const SELECT = '*, member:members!member_id(nombre, avatar_url)'
type Msg = { created_at: string; member_id: string; content: string; member?: { nombre?: string; avatar_url?: string | null } | null }

const newest = (rows: Msg[], n: number) =>
  rows.slice().sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0)).slice(-n)

/** Últimos `n` mensajes de UN chat, en orden ascendente. `chat` ya está autorizado. */
async function thread(admin: SupabaseClient, me: string, chat: string, n: number): Promise<Msg[]> {
  const base = () => admin.from('messages').select(SELECT).order('created_at', { ascending: false }).limit(n)
  if (chat === 'team') {
    const { data } = await base().is('service_id', null).is('recipient_member_id', null)
    return newest((data || []) as Msg[], n)
  }
  const partner = dmPartnerOf(chat, me)
  if (partner) {
    const [a, b] = await Promise.all([
      base().eq('member_id', me).eq('recipient_member_id', partner),
      base().eq('member_id', partner).eq('recipient_member_id', me),
    ])
    return newest([...(a.data || []), ...(b.data || [])] as Msg[], n)
  }
  const { data } = await base().eq('service_id', chat).is('recipient_member_id', null)
  return newest((data || []) as Msg[], n)
}

export async function GET(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const me = auth.identity.memberId
  const admin = createAdminSupabase()
  const chat = req.nextUrl.searchParams.get('chat')

  if (chat) {
    if (chat !== 'team' && !chat.startsWith('dm_') && !CHAT_ID_RE.test(chat)) return portalJson({ error: 'Chat no válido' }, 400)
    if (chat.startsWith('dm_')) {
      if (!dmPartnerOf(chat, me)) return portalJson({ error: 'No autorizado' }, 403) // no es un hilo suyo
    } else if (chat !== 'team') {
      const scope = await loadChatScope(admin, me)
      if (!scope.serviceIds.includes(chat)) return portalJson({ error: 'No autorizado' }, 403)
    }
    return portalJson({ messages: await thread(admin, me, chat, THREAD_LIMIT) })
  }

  const scope = await loadChatScope(admin, me)
  const ids = ['team', ...scope.serviceIds, ...scope.dmPartnerIds.map(p => dmChatId(me, p))]
  const lasts = await Promise.all(ids.map(id => thread(admin, me, id, 1)))
  const chats = ids.map((id, i) => {
    const m = lasts[i][0]
    return {
      id,
      kind: id === 'team' ? 'team' : id.startsWith('dm_') ? 'dm' : 'service',
      partnerId: id.startsWith('dm_') ? dmPartnerOf(id, me) : null,
      last: m ? { content: m.content, created_at: m.created_at, memberId: m.member_id, memberName: m.member?.nombre || '' } : null,
    }
  })

  // Solo lo necesario para mostrar nombres y elegir con quién escribir: sus interlocutores
  // directos y quienes comparten un servicio con ella. Sin correo, teléfono ni nada más.
  const peopleIds = Array.from(new Set([...scope.dmPartnerIds, ...scope.coMemberIds])).filter(id => id !== me)
  let people: { id: string; nombre: string; apellido: string | null; avatar_url: string | null }[] = []
  if (peopleIds.length) {
    const { data } = await admin.from('members').select('id, nombre, apellido, avatar_url').in('id', peopleIds).order('nombre')
    people = (data || []).map((m: { id: string; nombre: string; apellido: string | null; avatar_url: string | null }) =>
      ({ id: m.id, nombre: m.nombre, apellido: m.apellido, avatar_url: m.avatar_url }))
  }
  return portalJson({ chats, people })
}
