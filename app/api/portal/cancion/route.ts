// La hoja de letra de UNA canción para el portal (punto 55). Exige identidad del portal (cookie o cabecera x-portal-token) CON
// ACCESO A LA BIBLIOTECA (punto 59: equipo con library_access u owner/admin; si no, 403) o sesión de administración. Devuelve SOLO
// lo que dibuja la hoja (SONG_LYRIC_COLUMNS) y la lista de adjuntos PDF (sin rutas ni URLs: se firman al pulsar, en ./firmar); la letra
// no viaja en el catálogo. La llave de servicio no sale de este archivo.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireLibraryAccess } from '@/lib/auth/libraryAccess'
import { SONG_LYRIC_COLUMNS } from '@/lib/portal/songColumns'
import { SONG_ATTACHMENT_COLUMNS, soloAudios, soloPdfs } from '@/lib/portal/adjuntos'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
  const admin = createAdminSupabase()
  const auth = await requireLibraryAccess(req, admin)
  if (!auth.ok) return auth.response

  const id = new URL(req.url).searchParams.get('id') || ''
  if (!UUID.test(id)) return NextResponse.json({ error: 'Canción no válida' }, { status: 400, headers: NO_STORE })

  const { data, error } = await admin.from('songs').select(SONG_LYRIC_COLUMNS).eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: 'No se pudo leer' }, { status: 500, headers: NO_STORE })
  if (!data) return NextResponse.json({ error: 'Canción no encontrada' }, { status: 404, headers: NO_STORE })

  // Adjuntos: PDF (sección «Adjuntos») y audios propios (sección «Audio»). Si esta lectura falla, la letra se entrega igual y se avisa para que la pantalla lo diga.
  const adj = await admin.from('song_attachments').select(SONG_ATTACHMENT_COLUMNS).eq('song_id', id).order('created_at')
  return NextResponse.json({ song: data, adjuntos: adj.error ? [] : soloPdfs(adj.data as any[]), audios: adj.error ? [] : soloAudios(adj.data as any[]), adjuntosError: !!adj.error }, { headers: NO_STORE })
}
