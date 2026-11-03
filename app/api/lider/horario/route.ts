// /api/lider/horario — el horario (cronograma) de SU equipo en un servicio. El equipo sale de la HERRAMIENTA de tipo «schedule» (team_tools.team_id), y cada fila pedida debe ser de ese servicio y de esa herramienta.
// GET lee las filas; POST crea, edita o elimina UNA fila. Escribe SOLO service_schedule_items: hora (texto libre, opcional), texto y sort_order.
import { NextRequest, NextResponse } from 'next/server'
import { cerrado, entrar, entrarLectura, esId, falloDeBase, herramientaDe, limpio, listo, NO_STORE, prohibido, rechazo, registrar, servicioDe } from '@/lib/lider/escritura'
import { ERRORES_LIDER as E } from '@/lib/textos/servicioLider'

export const dynamic = 'force-dynamic'
const CAMPOS = ['servicio', 'herramienta', 'accion', 'fila', 'hora', 'texto'] as const
const ACCIONES = ['crear', 'editar', 'eliminar']

export async function GET(req: NextRequest) {
  const e = await entrarLectura(); if ('fallo' in e) return e.fallo
  const { a } = e
  const p = req.nextUrl.searchParams
  const h = await herramientaDe(a, p.get('herramienta'), 'schedule'); const sv = await servicioDe(a, p.get('servicio'))
  if (h === 'error' || sv === 'error') return falloDeBase()
  if (!h || !sv) return prohibido()
  const r = await a.admin.from('service_schedule_items').select('id, hora, texto, sort_order').eq('service_id', sv.id).eq('team_tool_id', h.id).order('sort_order')
  if (r.error) return falloDeBase()
  return NextResponse.json({ cerrado: cerrado(sv), filas: ((r.data || []) as any[]).map(x => ({ id: x.id, hora: x.hora ?? null, texto: x.texto, orden: x.sort_order })) }, { headers: NO_STORE })
}

export async function POST(req: NextRequest) {
  const e = await entrar(req, CAMPOS); if ('fallo' in e) return e.fallo
  const { a, b } = e; const { admin } = a
  if (!esId(b.servicio) || !esId(b.herramienta) || !ACCIONES.includes(b.accion)) return rechazo(400, E.pedido)
  const hora = b.hora == null || b.hora === '' ? null : limpio(b.hora, 20)
  const texto = limpio(b.texto, 200)
  if (b.hora != null && b.hora !== '' && hora === null) return rechazo(400, E.pedido)
  if ((b.accion === 'crear' || (b.accion === 'editar' && b.texto !== undefined)) && texto === null) return rechazo(400, E.pedido)
  if (b.accion !== 'crear' && !esId(b.fila)) return rechazo(400, E.pedido)

  const h = await herramientaDe(a, b.herramienta, 'schedule'); const sv = await servicioDe(a, b.servicio)
  if (h === 'error' || sv === 'error') return falloDeBase()
  if (!h || !sv) return prohibido()
  if (cerrado(sv)) return rechazo(409, E.convocatoriaCerrada)
  if (b.accion === 'crear') {
    const ult = await admin.from('service_schedule_items').select('sort_order').eq('service_id', sv.id).eq('team_tool_id', h.id).order('sort_order', { ascending: false }).limit(1)
    if (ult.error) return falloDeBase()
    const orden = ((ult.data as any[])?.[0]?.sort_order ?? -1) + 1
    const w = await admin.from('service_schedule_items').insert({ service_id: sv.id, team_id: h.team_id, team_tool_id: h.id, hora, texto, sort_order: orden }).select('id').single()
    if (w.error) return falloDeBase()
    registrar(a, 'horario-crear', { servicio: sv.id, equipo: h.team_id, herramienta: h.id })
    return listo({ id: (w.data as any)?.id ?? null })
  }
  const fila = await admin.from('service_schedule_items').select('id, service_id, team_tool_id').eq('id', b.fila).maybeSingle()
  if (fila.error) return falloDeBase()
  const f = fila.data as any
  if (!f || f.service_id !== sv.id || f.team_tool_id !== h.id) return prohibido()
  if (b.accion === 'eliminar') {
    const w = await admin.from('service_schedule_items').delete().eq('id', f.id)
    if (w.error) return falloDeBase()
  } else {
    const cambios: Record<string, unknown> = {}
    if (b.hora !== undefined) cambios.hora = hora
    if (b.texto !== undefined) cambios.texto = texto
    if (Object.keys(cambios).length === 0) return rechazo(400, E.pedido)
    const w = await admin.from('service_schedule_items').update(cambios).eq('id', f.id)
    if (w.error) return falloDeBase()
  }
  registrar(a, `horario-${b.accion}`, { servicio: sv.id, equipo: h.team_id, herramienta: h.id, fila: f.id })
  return listo()
}
