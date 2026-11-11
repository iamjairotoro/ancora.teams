// La hoja de letra de UNA canción para el portal (punto 55). Exige identidad del portal (cookie o cabecera x-portal-token) CON
// ACCESO A LA BIBLIOTECA (punto 59: equipo con library_access u owner/admin; si no, 403) o sesión de administración. Devuelve SOLO
// lo que dibuja la hoja (SONG_LYRIC_COLUMNS) y la lista de adjuntos PDF (sin rutas ni URLs: se firman al pulsar, en ./firmar); la letra
// no viaja en el catálogo. La llave de servicio no sale de este archivo.
import { MSG } from '@/lib/textos/mensajes'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireLibraryAccess } from '@/lib/auth/libraryAccess'
import { SONG_LYRIC_COLUMNS } from '@/lib/portal/songColumns'
import { SONG_ATTACHMENT_COLUMNS, soloAudios, soloPdfs } from '@/lib/portal/adjuntos'
import { armarHojaAcordes } from '@/lib/portal/acordesCancion'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
  const admin = createAdminSupabase()
  const auth = await requireLibraryAccess(req, admin)
  if (!auth.ok) return auth.response

  const id = new URL(req.url).searchParams.get('id') || ''
  if (!UUID.test(id)) return NextResponse.json({ error: MSG.cancionNoValida }, { status: 400, headers: NO_STORE })

  // Solo publicadas (migración 056): un borrador responde «no encontrada». Si la columna aún no existe, se repite sin el filtro.
  let { data, error } = await admin.from('songs').select(SONG_LYRIC_COLUMNS).eq('id', id).eq('publicada', true).maybeSingle()
  if (error) ({ data, error } = await admin.from('songs').select(SONG_LYRIC_COLUMNS).eq('id', id).maybeSingle())
  if (error) return NextResponse.json({ error: MSG.noSePudoLeer }, { status: 500, headers: NO_STORE })
  if (!data) return NextResponse.json({ error: 'Canción no encontrada' }, { status: 404, headers: NO_STORE })

  // Adjuntos: PDF (sección «Adjuntos») y audios propios (sección «Audio»). Si esta lectura falla, la letra se entrega igual y se avisa para que la pantalla lo diga.
  const adj = await admin.from('song_attachments').select(SONG_ATTACHMENT_COLUMNS).eq('song_id', id).order('created_at')
  // Acordes (etapa C1): solo si TODAS las variantes que se usarían están en formato 2 y la canción tiene tono; si no, o si esta lectura falla, `acordes` es null y la hoja es de solo letra, igual que antes.
  let acordes = null
  try {
    const sec = await admin.from('song_sections').select('id, code, name, sort_order').eq('song_id', id).order('sort_order')
    if (!sec.error && sec.data && sec.data.length) {
      const [vars, cab] = [
        await admin.from('song_section_variants').select('section_id, label, lines, is_default, formato').in('section_id', sec.data.map((x: any) => x.id)),
        await admin.from('songs').select('tono_original, default_arrangement').eq('id', id).maybeSingle(),
      ]
      if (!vars.error && !cab.error && cab.data) acordes = armarHojaAcordes({ tono: cab.data.tono_original, arreglo: cab.data.default_arrangement, secciones: sec.data as any[], variantes: (vars.data || []) as any[] })
    }
  } catch { acordes = null }
  return NextResponse.json({ song: data, adjuntos: adj.error ? [] : soloPdfs(adj.data as any[]), audios: adj.error ? [] : soloAudios(adj.data as any[]), adjuntosError: !!adj.error, acordes }, { headers: NO_STORE })
}
