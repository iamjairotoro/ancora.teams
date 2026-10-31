// GET /api/lider/servicios — la lista de servicios que ve un LÍDER (Home → Servicios, teléfono). Lo decide el servidor con la llave de servicio: la persona y la organización salen de la SESIÓN (lib/auth/authorize.ts → requireLiderDeLaSesion), nunca de un parámetro.
// Solo lee. Devuelve únicamente id, fecha, título, tipo y horas (lib/lider/servicioLider.ts). Todas las respuestas llevan Cache-Control: no-store.
import { NextResponse } from 'next/server'
import { requireLiderDeLaSesion } from '@/lib/auth/authorize'
import { hoyEnSantiago } from '@/lib/convocatoriaCerrada'
import { servicioDeLista } from '@/lib/lider/servicioLider'
import { MSG } from '@/lib/textos/mensajes'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  const a = await requireLiderDeLaSesion()
  if (!a.ok) return NextResponse.json({ error: MSG.noAutorizado }, { status: a.response.status, headers: NO_STORE })
  const { data, error } = await a.admin.from('services').select('id, fecha, titulo, kind, hora_inicio, hora_fin')
    .eq('organization_id', a.organizationId).gte('fecha', hoyEnSantiago()).order('fecha', { ascending: true }).limit(60)
  if (error) return NextResponse.json({ error: MSG.noSePudoLeer }, { status: 500, headers: NO_STORE })
  return NextResponse.json({ servicios: (data || []).map((s: any) => servicioDeLista(s)) }, { headers: NO_STORE })
}
