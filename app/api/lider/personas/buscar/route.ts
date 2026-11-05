// GET /api/lider/personas/buscar?equipo=…&q=… — el selector de «Agregar persona»: personas que YA existen en la organización, por nombre, que todavía no están en ese equipo. Devuelve SOLO id, nombre y apellido (nunca
// teléfono ni correo), máximo 30. Se exigen al menos 2 letras (con menos devuelve una lista vacía: ninguna ruta entrega la lista completa). El equipo del pedido se valida contra los equipos que lidera (el mismo 403 genérico de siempre).
import { NextRequest, NextResponse } from 'next/server'
import { entrarLectura, equipoDeLaPersona, falloDeBase, NO_STORE, prohibido } from '@/lib/lider/escritura'

export const dynamic = 'force-dynamic'
const MAX_RESULTADOS = 30
const MIN_LETRAS = 2, MAX_LETRAS = 60

export async function GET(req: NextRequest) {
  const e = await entrarLectura(); if ('fallo' in e) return e.fallo
  const { a } = e; const { admin } = a
  const equipo = req.nextUrl.searchParams.get('equipo')
  const ok = await equipoDeLaPersona(a, equipo)
  if (ok === 'error') return falloDeBase()
  if (!ok) return prohibido()
  const q = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, MAX_LETRAS)
  if (q.length < MIN_LETRAS) return NextResponse.json({ personas: [] }, { headers: NO_STORE })
  const patron = `%${q.replace(/[\\%_]/g, c => '\\' + c)}%`
  const [porNombre, porApellido, dentro] = await Promise.all([
    admin.from('members').select('id, nombre, apellido').eq('organization_id', a.organizationId).ilike('nombre', patron).order('nombre').limit(100),
    admin.from('members').select('id, nombre, apellido').eq('organization_id', a.organizationId).ilike('apellido', patron).order('nombre').limit(100),
    admin.from('team_members').select('member_id').eq('team_id', equipo as string).eq('organization_id', a.organizationId),
  ])
  if (porNombre.error || porApellido.error || dentro.error) return falloDeBase()
  const yaEstan = new Set(((dentro.data || []) as any[]).map(x => x.member_id as string))
  const vistos = new Set<string>(), personas: { id: string; nombre: string; apellido: string }[] = []
  for (const m of [...(porNombre.data || []), ...(porApellido.data || [])] as any[]) { if (yaEstan.has(m.id) || vistos.has(m.id)) continue; vistos.add(m.id); personas.push({ id: m.id, nombre: m.nombre || '', apellido: m.apellido || '' }) }
  personas.sort((x, y) => x.nombre.localeCompare(y.nombre, 'es') || x.apellido.localeCompare(y.apellido, 'es'))
  return NextResponse.json({ personas: personas.slice(0, MAX_RESULTADOS) }, { headers: NO_STORE })
}
