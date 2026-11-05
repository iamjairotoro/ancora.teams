// /api/lider/equipo — la composición de SU equipo: quién está y con qué posiciones. GET lee (solo de un equipo que lidera); POST agrega o quita a una persona EXISTENTE o cambia sus posiciones.
// El equipo sale de la fila del integrante (team_members.team_id); solo en «agregar», donde el recurso es el propio equipo, viene en el pedido y se valida contra los equipos que lidera.
// Escribe SOLO team_members (member_id, team_id, organization_id, is_leader SIEMPRE false) y team_member_positions. NUNCA toca is_leader (ni lo acepta), roles, team_admins ni datos de la persona; crear personas nuevas o cambiar correos
// es de quien administra. No se puede quitar a un líder ni quitarse a uno mismo, ni a quien tenga asignaciones o convocatorias en servicios próximos de ese equipo (409 con el detalle; limpiar eso es de quien administra).
import { NextRequest, NextResponse } from 'next/server'
import { entrar, entrarLectura, equipoDeLaPersona, esId, falloDeBase, listo, NO_STORE, prohibido, puedeEnEquipo, rechazo, registrar } from '@/lib/lider/escritura'
import { mensajeProximos, proximosDe } from '@/lib/lider/proximos'
import { ERRORES_LIDER as E } from '@/lib/textos/servicioLider'

export const dynamic = 'force-dynamic'
const CAMPOS = ['accion', 'equipo', 'persona', 'integrante', 'posiciones'] as const
const ACCIONES = ['agregar', 'quitar', 'posiciones']

export async function GET(req: NextRequest) {
  const e = await entrarLectura(); if ('fallo' in e) return e.fallo
  const { a } = e; const { admin } = a
  const equipo = req.nextUrl.searchParams.get('equipo')
  const ok = await equipoDeLaPersona(a, equipo)
  if (ok === 'error') return falloDeBase()
  if (!ok) return prohibido()
  const [tm, pos] = await Promise.all([
    admin.from('team_members').select('id, member_id, is_leader').eq('team_id', equipo).eq('organization_id', a.organizationId),
    admin.from('team_positions').select('id, name, sort_order').eq('team_id', equipo).eq('organization_id', a.organizationId).is('archived_at', null).order('sort_order'),
  ])
  if (tm.error || pos.error) return falloDeBase()
  const filas = (tm.data || []) as any[]
  const enlaces = filas.length ? await admin.from('team_member_positions').select('team_member_id, team_position_id').in('team_member_id', filas.map(x => x.id)) : { data: [] as any[], error: null }
  if (enlaces.error) return falloDeBase()
  const personas = filas.length ? await admin.from('members').select('id, nombre, apellido').in('id', filas.map(x => x.member_id)).eq('organization_id', a.organizationId) : { data: [] as any[], error: null }
  if (personas.error) return falloDeBase()
  const nombre = new Map(((personas.data || []) as any[]).map(m => [m.id, m]))
  return NextResponse.json({
    posiciones: ((pos.data || []) as any[]).map(p => ({ id: p.id, nombre: p.name })),
    integrantes: filas.filter(x => nombre.get(x.member_id)).map(x => ({ id: x.id, nombre: nombre.get(x.member_id).nombre || '', apellido: nombre.get(x.member_id).apellido || '', esLider: !!x.is_leader, posiciones: ((enlaces.data || []) as any[]).filter(l => l.team_member_id === x.id).map(l => l.team_position_id) }))
      .sort((p, q) => p.nombre.localeCompare(q.nombre, 'es')),
  }, { headers: NO_STORE })
}

export async function POST(req: NextRequest) {
  const e = await entrar(req, CAMPOS); if ('fallo' in e) return e.fallo
  const { a, b } = e; const { admin } = a
  if (!ACCIONES.includes(b.accion)) return rechazo(400, E.pedido)

  if (b.accion === 'agregar') {
    if (!esId(b.persona)) return rechazo(400, E.pedido)
    const ok = await equipoDeLaPersona(a, b.equipo)
    if (ok === 'error') return falloDeBase()
    if (!ok) return prohibido()
    const m = await admin.from('members').select('id').eq('id', b.persona).eq('organization_id', a.organizationId).maybeSingle()
    if (m.error) return falloDeBase()
    if (!m.data) return rechazo(409, E.personaNoEsDelEquipo)
    const ya = await admin.from('team_members').select('id').eq('member_id', b.persona).eq('team_id', b.equipo).maybeSingle()
    if (ya.error) return falloDeBase()
    if (ya.data) return rechazo(409, E.yaEsDelEquipo)
    const w = await admin.from('team_members').insert({ member_id: b.persona, team_id: b.equipo, organization_id: a.organizationId, is_leader: false })
    if (w.error) return falloDeBase()
    registrar(a, 'equipo-agregar', { equipo: b.equipo, persona: b.persona })
    return listo()
  }

  if (!esId(b.integrante)) return rechazo(400, E.pedido)
  const fila = await admin.from('team_members').select('id, member_id, team_id, organization_id, is_leader').eq('id', b.integrante).eq('organization_id', a.organizationId).maybeSingle()
  if (fila.error) return falloDeBase()
  const f = fila.data as any
  if (!f || !puedeEnEquipo(a, f.team_id)) return prohibido()

  if (b.accion === 'quitar') {
    if (f.is_leader) return rechazo(409, E.noSePuedeQuitarLider)
    if (f.member_id === a.memberId) return rechazo(409, E.noSePuedeQuitarteTu)
    const proximos = await proximosDe(admin, a.organizationId, f.member_id, f.team_id)
    if (proximos === 'error') return falloDeBase()
    if (proximos.servicios.length > 0) return rechazo(409, mensajeProximos(proximos))
    const d1 = await admin.from('team_member_positions').delete().eq('team_member_id', f.id)
    if (d1.error) return falloDeBase()
    const d2 = await admin.from('team_members').delete().eq('id', f.id)
    if (d2.error) return falloDeBase()
    registrar(a, 'equipo-quitar', { equipo: f.team_id, persona: f.member_id })
    return listo()
  }

  if (!Array.isArray(b.posiciones) || b.posiciones.length > 50 || !b.posiciones.every(esId)) return rechazo(400, E.pedido)
  const pedidas: string[] = Array.from(new Set<string>(b.posiciones))
  if (pedidas.length) {
    const v = await admin.from('team_positions').select('id').in('id', pedidas).eq('team_id', f.team_id).is('archived_at', null)
    if (v.error) return falloDeBase()
    if ((v.data || []).length !== pedidas.length) return rechazo(400, E.pedido)
  }
  const act = await admin.from('team_member_positions').select('team_position_id').eq('team_member_id', f.id)
  if (act.error) return falloDeBase()
  const tiene = new Set(((act.data || []) as any[]).map(x => x.team_position_id as string))
  const quitar = Array.from(tiene).filter(x => !pedidas.includes(x)), agregar = pedidas.filter(x => !tiene.has(x))
  if (quitar.length) { const d = await admin.from('team_member_positions').delete().eq('team_member_id', f.id).in('team_position_id', quitar); if (d.error) return falloDeBase() }
  if (agregar.length) { const i = await admin.from('team_member_positions').insert(agregar.map(id => ({ team_member_id: f.id, team_position_id: id }))); if (i.error) return falloDeBase() }
  registrar(a, 'equipo-posiciones', { equipo: f.team_id, persona: f.member_id, agregadas: agregar.length, quitadas: quitar.length })
  return listo()
}
