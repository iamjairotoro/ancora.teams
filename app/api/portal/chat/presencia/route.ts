// Presencia del chat: qué chat está mirando la persona AHORA (chat_presence). chat-notify no manda
// push de un chat a quien lo está viendo (presencia de hace menos de 10 s). La escribe el servidor
// con la IDENTIDAD: el navegador no manda ningún id de persona. `chat: null` = ya no mira ninguno.
// El `chat_id` solo afecta a la fila de esta misma persona, así que basta con que tenga forma de
// chat válida (no hace falta consultar sus servicios cada 5 s).
import { NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'
import { CHAT_ID_RE, dmPartnerOf } from '@/lib/portal/chatScope'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const me = auth.identity.memberId
  const b = await req.json().catch(() => null)
  const chat = b?.chat ?? null
  const valid = chat === null || chat === 'team' || (typeof chat === 'string' && (chat.startsWith('dm_') ? !!dmPartnerOf(chat, me) : CHAT_ID_RE.test(chat)))
  if (!valid) return portalJson({ error: 'Chat no válido' }, 400)
  const { error } = await createAdminSupabase().from('chat_presence')
    .upsert({ member_id: me, chat_id: chat, updated_at: new Date().toISOString() }, { onConflict: 'member_id' })
  if (error) return portalJson({ error: 'No se pudo guardar' }, 500)
  return portalJson({ ok: true })
}
