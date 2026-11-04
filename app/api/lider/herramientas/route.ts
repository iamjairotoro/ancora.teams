// POST /api/lider/herramientas — el líder AGREGA una herramienta (checklist, horario o notas) a SU equipo. En esta etapa NO se pueden quitar: quitarla borra en cascada sus datos de todos los servicios (es de quien administra).
// En el alta, el recurso es el propio equipo: viene en el pedido y se valida contra los equipos que lidera. Escribe SOLO team_tools (team_id, tool_type de la lista cerrada, sort_order). Las herramientas «setlist» (Orden, del servicio entero)
// y «file_upload» no se ofrecen al líder.
import { NextRequest } from 'next/server'
import { entrar, equipoDeLaPersona, falloDeBase, listo, prohibido, rechazo, registrar } from '@/lib/lider/escritura'
import { TIPOS_HERRAMIENTA } from '@/lib/lider/servicioLider'
import { ERRORES_LIDER as E } from '@/lib/textos/servicioLider'

export const dynamic = 'force-dynamic'
const CAMPOS = ['accion', 'equipo', 'tipo'] as const

export async function POST(req: NextRequest) {
  const e = await entrar(req, CAMPOS); if ('fallo' in e) return e.fallo
  const { a, b } = e; const { admin } = a
  if (b.accion !== 'agregar' || !(TIPOS_HERRAMIENTA as readonly string[]).includes(b.tipo)) return rechazo(400, E.pedido)
  const ok = await equipoDeLaPersona(a, b.equipo)
  if (ok === 'error') return falloDeBase()
  if (!ok) return prohibido()
  const ya = await admin.from('team_tools').select('id, tool_type, sort_order').eq('team_id', b.equipo)
  if (ya.error) return falloDeBase()
  const filas = (ya.data || []) as any[]
  if (filas.some(f => f.tool_type === b.tipo)) return rechazo(409, E.herramientaYaExiste)
  const orden = filas.length ? Math.max(...filas.map(f => f.sort_order ?? 0)) + 1 : 0
  const w = await admin.from('team_tools').insert({ team_id: b.equipo, tool_type: b.tipo, sort_order: orden })
  if (w.error) return falloDeBase()
  registrar(a, 'herramienta-agregar', { equipo: b.equipo, tipo: b.tipo })
  return listo()
}
