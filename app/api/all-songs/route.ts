// Catálogo de canciones para el portal. Exige identidad del portal (cookie o cabecera x-portal-token) CON ACCESO
// A LA BIBLIOTECA (punto 59: equipo con library_access u owner/admin; si no, 403) o sesión de administración, y devuelve SOLO las columnas que el portal usa (antes: select *).
import { MSG } from '@/lib/textos/mensajes'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireLibraryAccess } from '@/lib/auth/libraryAccess'
import { SONG_CATALOG_COLUMNS } from '@/lib/portal/songColumns'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const admin = createAdminSupabase()
  const auth = await requireLibraryAccess(req, admin)
  if (!auth.ok) return auth.response
  const { data, error } = await admin.from('songs').select(SONG_CATALOG_COLUMNS).order('nombre')
  if (error) return NextResponse.json({ error: MSG.noSePudoLeer }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json({ songs: data || [] }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
}
