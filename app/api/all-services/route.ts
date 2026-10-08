// Servicios (fecha, título, horario, lugar) para el portal. Exige identidad del portal (cookie o
// cabecera x-portal-token) o sesión de administración; usa el cliente de servicio.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requirePortalOrAdmin } from '@/lib/auth/requirePortalOrAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requirePortalOrAdmin(req)
  if (!auth.ok) return auth.response
  const { data, error } = await createAdminSupabase()
    .from('services')
    .select('id,fecha,titulo,tipo,hora_inicio,hora_fin,lugar')
    .order('fecha', { ascending: true })
  if (error) return NextResponse.json({ error: 'No se pudo leer' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json({ services: data || [] }, { headers: { 'Cache-Control': 'no-store' } })
}
