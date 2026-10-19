import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireOrgAdmin } from '@/lib/auth/authorize'
import { ES_UUID, todosSonDeLaOrganizacion } from '@/lib/auth/pertenencia'
import { soloPermitidos } from '@/lib/auth/camposPermitidos'
import { CAMPOS_BLOQUE_EDITABLES, CAMPOS_BLOQUE_NUEVO } from '@/lib/auth/camposServicio'

// Punto 50, paso 0a: llave de servicio; la seguridad la da `requireOrgAdmin` (administrador/owner de la organización DEL SERVICIO) antes de leer o escribir.
//
// Listas blancas, sacadas de leer los llamadores reales (AdminServiceView: addBlock, updateBlock, EditPanel.save, el arrastrar para reordenar). Cualquier otra columna → 400
// con su nombre (antes el cuerpo entero iba al insert/update: se podía mover un bloque a otro servicio o cambiar cualquier columna).
//   · POST  (addBlock):   service_id, orden, tipo, titulo, duracion_min
//   · PATCH (updateBlock, EditPanel, reordenar): tipo, titulo, song_id, tono, lead_id, duracion_min, notas, orden   — service_id NO: un bloque no cambia de servicio

const texto = (v: unknown) => v === null || typeof v === 'string'
const numero = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v))
const entero = (v: unknown) => typeof v === 'number' && Number.isInteger(v)
const uuidONulo = (v: unknown) => v === null || (typeof v === 'string' && ES_UUID.test(v))
const VALIDAR: Record<string, (v: unknown) => boolean> = {
  service_id: v => typeof v === 'string' && ES_UUID.test(v), orden: entero, tipo: v => v === 'cancion' || v === 'bloque', titulo: texto, duracion_min: numero,
  song_id: uuidONulo, lead_id: uuidONulo, tono: texto, notas: texto,
}
const invalidos = (datos: Record<string, unknown>) => Object.entries(datos).filter(([k, v]) => !VALIDAR[k](v)).map(([k]) => k)
const error400 = (msg: string) => NextResponse.json({ error: msg }, { status: 400 })

async function requireOrgAdminForService(supabase: ReturnType<typeof createAdminSupabase>, serviceId: unknown) {
  if (typeof serviceId !== 'string' || !ES_UUID.test(serviceId)) return { ok: false as const, response: error400('serviceId no válido') }
  const { data: service } = await supabase.from('services').select('organization_id').eq('id', serviceId).single()
  if (!service) return { ok: false as const, response: NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 }) }
  const auth = await requireOrgAdmin(service.organization_id)
  return auth.ok ? { ok: true as const, organizationId: service.organization_id as string, email: auth.email } : auth
}

async function requireOrgAdminForBlock(supabase: ReturnType<typeof createAdminSupabase>, blockId: unknown) {
  if (typeof blockId !== 'string' || !ES_UUID.test(blockId)) return { ok: false as const, response: error400('id no válido') }
  const { data: block } = await supabase.from('service_blocks').select('service_id').eq('id', blockId).single()
  if (!block) return { ok: false as const, response: NextResponse.json({ error: 'No encontrado' }, { status: 404 }) }
  return requireOrgAdminForService(supabase, block.service_id)
}

async function leerCuerpo(req: NextRequest): Promise<Record<string, unknown> | null> {
  const c = await req.json().catch(() => null)
  return c && typeof c === 'object' && !Array.isArray(c) ? (c as Record<string, unknown>) : null
}

export async function GET(req: NextRequest) {
  const supabase = createAdminSupabase()
  const serviceId = req.nextUrl.searchParams.get('serviceId')
  if (!serviceId) return NextResponse.json({ blocks: [] })
  // Punto 59: antes no pedía NINGUNA identidad y devolvía songs(*) completo. Ahora, como POST/PATCH/DELETE,
  // exige administración de la organización del servicio.
  const auth = await requireOrgAdminForService(supabase, serviceId)
  if (!auth.ok) return auth.response
  const { data } = await supabase
    .from('service_blocks')
    .select('*, song:songs(*), lead:members(nombre)')
    .eq('service_id', serviceId)
    .order('orden')
  return NextResponse.json({ blocks: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = createAdminSupabase()
  const body = await leerCuerpo(req)
  if (!body) return error400('Petición inválida')
  if (!body.service_id) return error400('service_id requerido')

  const auth = await requireOrgAdminForService(supabase, body.service_id)
  if (!auth.ok) return auth.response

  const { datos, rechazados } = soloPermitidos(body, CAMPOS_BLOQUE_NUEVO)
  if (rechazados.length) return error400(`Campos no permitidos: ${rechazados.join(', ')}`)
  const mal = invalidos(datos); if (mal.length) return error400(`Valor no válido en ${mal.join(', ')}`)

  const { data, error } = await supabase.from('service_blocks').insert(datos).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ block: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = createAdminSupabase()
  const body = await leerCuerpo(req)
  if (!body) return error400('Petición inválida')
  const { id, ...updates } = body

  const auth = await requireOrgAdminForBlock(supabase, id)
  if (!auth.ok) return auth.response

  const { datos, rechazados } = soloPermitidos(updates, CAMPOS_BLOQUE_EDITABLES)
  if (rechazados.length) return error400(`Campos no permitidos: ${rechazados.join(', ')}`)
  if (!Object.keys(datos).length) return error400('Nada que actualizar')
  const mal = invalidos(datos); if (mal.length) return error400(`Valor no válido en ${mal.join(', ')}`)
  // la canción y quien dirige tienen que ser de la organización del servicio (no se enlaza a la canción o a la persona de otra organización)
  if (!(await todosSonDeLaOrganizacion(supabase, auth.organizationId, { songs: [datos.song_id as string | null], members: [datos.lead_id as string | null] }))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { error } = await supabase.from('service_blocks').update(datos).eq('id', id as string)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = createAdminSupabase()
  const body = await leerCuerpo(req)
  if (!body) return error400('Petición inválida')
  const { id } = body

  const auth = await requireOrgAdminForBlock(supabase, id)
  if (!auth.ok) return auth.response

  const { error } = await supabase.from('service_blocks').delete().eq('id', id as string)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
