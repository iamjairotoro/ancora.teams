// Canciones favoritas de LA PERSONA identificada (song_favorites). El cliente nunca manda el
// member_id: sale de requirePortalIdentity. GET lista los ids; PUT {songId} agrega (idempotente);
// DELETE {songId} quita.
import { NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'

export const dynamic = 'force-dynamic'

const songIdOf = async (req: NextRequest): Promise<string | null> => {
  const b = await req.json().catch(() => null)
  const id = b?.songId
  return typeof id === 'string' && id.length > 0 && id.length <= 64 ? id : null
}

export async function GET(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const { data, error } = await createAdminSupabase().from('song_favorites').select('song_id').eq('member_id', auth.identity.memberId)
  if (error) return portalJson({ error: 'No se pudo leer' }, 500)
  return portalJson({ songIds: (data || []).map((r: { song_id: string }) => r.song_id) })
}

export async function PUT(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const songId = await songIdOf(req)
  if (!songId) return portalJson({ error: 'Canción no válida' }, 400)
  const { error } = await createAdminSupabase().from('song_favorites')
    .upsert({ member_id: auth.identity.memberId, song_id: songId }, { onConflict: 'member_id,song_id' })
  if (error) return portalJson({ error: 'No se pudo guardar' }, error.code === '23503' ? 404 : 500) // 23503: la canción no existe
  return portalJson({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const songId = await songIdOf(req)
  if (!songId) return portalJson({ error: 'Canción no válida' }, 400)
  const { error } = await createAdminSupabase().from('song_favorites').delete()
    .eq('member_id', auth.identity.memberId).eq('song_id', songId)
  if (error) return portalJson({ error: 'No se pudo guardar' }, 500)
  return portalJson({ ok: true })
}
