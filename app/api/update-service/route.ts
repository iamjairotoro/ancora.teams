import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireOrgAdmin } from '@/lib/auth/authorize'
import { ES_UUID } from '@/lib/auth/pertenencia'
import { soloPermitidos } from '@/lib/auth/camposPermitidos'
import { CAMPOS_SERVICIO_EDITABLES } from '@/lib/auth/camposServicio'

// Columnas que las pantallas REALES cambian por esta ruta: AdminServiceView manda {id, hora_inicio} y {id, hora_fin}. Cualquier otra se rechaza con 400
// (antes el cuerpo entero iba al update: se podía cambiar organization_id, fecha, tipo, etc.). Si una pantalla nueva necesita otra columna, se agrega aquí A PROPÓSITO.
const HORA = /^\d{2}:\d{2}(:\d{2})?$/

// Punto 50, paso 0a: llave de servicio; la seguridad la da `requireOrgAdmin` (administrador/owner de la organización del servicio) antes de escribir.
export async function POST(req: NextRequest) {
  const supabase = createAdminSupabase()
  const cuerpo = await req.json().catch(() => null)
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  const { id, ...updates } = cuerpo as Record<string, unknown>
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  if (typeof id !== 'string' || !ES_UUID.test(id)) return NextResponse.json({ error: 'id no válido' }, { status: 400 })

  const { data: existing } = await supabase.from('services').select('organization_id').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  const auth = await requireOrgAdmin(existing.organization_id)
  if (!auth.ok) return auth.response

  const { datos, rechazados } = soloPermitidos(updates, CAMPOS_SERVICIO_EDITABLES)
  if (rechazados.length) return NextResponse.json({ error: `Campos no permitidos: ${rechazados.join(', ')}` }, { status: 400 })
  if (!Object.keys(datos).length) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  for (const [k, v] of Object.entries(datos)) if (v !== null && !(typeof v === 'string' && HORA.test(v))) return NextResponse.json({ error: `Valor no válido en ${k}` }, { status: 400 })

  const { data, error } = await supabase.from('services').update(datos).eq('id', id).eq('organization_id', existing.organization_id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service: data })
}
