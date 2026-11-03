// /api/lider/notas — las notas de SU equipo en un servicio. El equipo sale de la HERRAMIENTA de tipo «notes». GET lee el texto; POST lo guarda (service_notes.texto, hasta 5000 caracteres). Escribe SOLO service_notes.
import { NextRequest, NextResponse } from 'next/server'
import { cerrado, entrar, entrarLectura, esId, falloDeBase, herramientaDe, listo, NO_STORE, prohibido, rechazo, registrar, servicioDe } from '@/lib/lider/escritura'
import { ERRORES_LIDER as E } from '@/lib/textos/servicioLider'

export const dynamic = 'force-dynamic'
const CAMPOS = ['servicio', 'herramienta', 'texto'] as const
const MAX = 5000

export async function GET(req: NextRequest) {
  const e = await entrarLectura(); if ('fallo' in e) return e.fallo
  const { a } = e
  const p = req.nextUrl.searchParams
  const h = await herramientaDe(a, p.get('herramienta'), 'notes'); const sv = await servicioDe(a, p.get('servicio'))
  if (h === 'error' || sv === 'error') return falloDeBase()
  if (!h || !sv) return prohibido()
  const r = await a.admin.from('service_notes').select('texto').eq('service_id', sv.id).eq('team_tool_id', h.id).maybeSingle()
  if (r.error) return falloDeBase()
  return NextResponse.json({ cerrado: cerrado(sv), texto: (r.data as any)?.texto ?? '' }, { headers: NO_STORE })
}

export async function POST(req: NextRequest) {
  const e = await entrar(req, CAMPOS); if ('fallo' in e) return e.fallo
  const { a, b } = e; const { admin } = a
  if (!esId(b.servicio) || !esId(b.herramienta) || typeof b.texto !== 'string' || b.texto.length > MAX) return rechazo(400, E.pedido)
  const h = await herramientaDe(a, b.herramienta, 'notes'); const sv = await servicioDe(a, b.servicio)
  if (h === 'error' || sv === 'error') return falloDeBase()
  if (!h || !sv) return prohibido()
  if (cerrado(sv)) return rechazo(409, E.convocatoriaCerrada)
  const actual = await admin.from('service_notes').select('id').eq('service_id', sv.id).eq('team_tool_id', h.id).maybeSingle()
  if (actual.error) return falloDeBase()
  const w = (actual.data as any)?.id
    ? await admin.from('service_notes').update({ texto: b.texto, updated_at: new Date().toISOString() }).eq('id', (actual.data as any).id)
    : await admin.from('service_notes').insert({ service_id: sv.id, team_id: h.team_id, team_tool_id: h.id, texto: b.texto })
  if (w.error) return falloDeBase()
  registrar(a, 'notas', { servicio: sv.id, equipo: h.team_id, herramienta: h.id, largo: b.texto.length })
  return listo()
}
