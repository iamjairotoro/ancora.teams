// Catálogo de canciones para el portal. Exige identidad del portal (cookie o cabecera x-portal-token)
// o sesión de administración, y devuelve SOLO las columnas que el portal usa (antes: select *).
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requirePortalOrAdmin } from '@/lib/auth/requirePortalOrAdmin'
import { SONG_CATALOG_COLUMNS } from '@/lib/portal/songColumns'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const auth = await requirePortalOrAdmin(req)
  if (!auth.ok) return auth.response
  const { data, error } = await createAdminSupabase().from('songs').select(SONG_CATALOG_COLUMNS).order('nombre')
  if (error) return NextResponse.json({ error: 'No se pudo leer' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json({ songs: data || [] }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
}
