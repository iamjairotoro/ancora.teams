// Interruptor «Este equipo accede a la biblioteca de canciones y a sus recursos» (punto 59): teams.library_access.
// Lo cambia SOLO owner/admin y se guarda aquí, en el servidor: la pantalla nunca hace supabase.from('teams').update
// por esta columna (con RLS abierto hasta el punto 50, cualquiera con la llave pública podría abrirse la biblioteca).
// El equipo tiene que ser de la organización de quien pide; si no existe o es de otra, 404 (no se distingue).
import { MSG } from '@/lib/textos/mensajes'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireOrgAdmin } from '@/lib/auth/authorize'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function PUT(req: NextRequest) {
  const auth = await requireOrgAdmin(DEFAULT_ORGANIZATION_ID)
  if (!auth.ok) return auth.response

  const b = await req.json().catch(() => null)
  const teamId = b?.teamId
  const enabled = b?.enabled
  if (typeof teamId !== 'string' || teamId.length === 0 || teamId.length > 64 || typeof enabled !== 'boolean') {
    return json({ error: MSG.datosNoValidos }, 400)
  }

  let admin
  try { admin = createAdminSupabase() } catch { return json({ error: MSG.servicioNoDisponible }, 503) }

  // El filtro por organización va DENTRO del update: un equipo de otra organización no se toca nunca.
  const { data, error } = await admin.from('teams')
    .update({ library_access: enabled })
    .eq('id', teamId).eq('organization_id', DEFAULT_ORGANIZATION_ID)
    .select('id, library_access')
  if (error) return json({ error: MSG.noSePudoGuardar }, 500)
  if (!data || data.length === 0) return json({ error: 'Equipo no encontrado' }, 404)
  return json({ ok: true, teamId, libraryAccess: data[0].library_access === true })
}
