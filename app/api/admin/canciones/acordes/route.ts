// Editor de acordes (etapa C2). GET carga la canción para editar; POST guarda en formato 2. Llave de servicio; la seguridad la da `requireOrgAdminDeLaSesion`/`requireOrgAdmin`: la organización sale de la
// CANCIÓN, nunca de un parámetro. Sin sesión 401; sin rol, otra organización o canción que no existe, el MISMO 403 genérico (no se filtra si la canción existe). Solo propietario y administrador.
// Lo que se valida, se planifica y se escribe vive en lib/admin/guardarAcordes.ts (nada se borra: ver su encabezado).
import { MSG } from '@/lib/textos/mensajes'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireOrgAdmin, requireOrgAdminDeLaSesion } from '@/lib/auth/authorize'
import { construirCarga, ejecutar, leerEstado, planificar, textosCoinciden, validarCuerpo } from '@/lib/admin/guardarAcordes'
import { esTonoValido } from '@/lib/tonos'
import { TEXTOS_EDITOR } from '@/lib/textos/editorAcordes'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const respuesta = (cuerpo: unknown, status: number) => NextResponse.json(cuerpo, { status, headers: NO_STORE })
const prohibido = () => respuesta({ error: MSG.noAutorizado }, 403)

/** Autoriza sobre la canción: lee la canción con la llave de servicio, saca SU organización y exige administrador de ella. Devuelve el estado leído o la respuesta de error. */
async function autorizar(admin: ReturnType<typeof createAdminSupabase>, songId: string) {
  let estado
  try { estado = await leerEstado(admin, songId) } catch { return { ok: false as const, response: respuesta({ error: MSG.noSePudoLeer }, 500) } }
  if (!estado || !estado.song.organization_id) {
    const s = await requireOrgAdminDeLaSesion()          // sin sesión → 401; con sesión, la misma respuesta que «otra organización»
    return { ok: false as const, response: s.ok ? prohibido() : s.response }
  }
  const a = await requireOrgAdmin(estado.song.organization_id)
  return a.ok ? { ok: true as const, estado } : { ok: false as const, response: a.response }
}

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id') || ''
  if (!UUID.test(id)) return respuesta({ error: `${MSG.valorNoValido} en id` }, 400)
  let admin; try { admin = createAdminSupabase() } catch { return respuesta({ error: MSG.servicioNoDisponible }, 503) }
  const a = await autorizar(admin, id)
  if (!a.ok) return a.response
  return respuesta({ cancion: construirCarga(a.estado) }, 200)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const v = validarCuerpo(body)
  if (!v.ok) return respuesta({ error: `${MSG.valorNoValido} en ${v.campo}` }, 400)
  const d = v.datos
  let admin; try { admin = createAdminSupabase() } catch { return respuesta({ error: MSG.servicioNoDisponible }, 503) }
  const a = await autorizar(admin, d.songId)
  if (!a.ok) return a.response
  if (!d.tono || !esTonoValido(d.tono)) return respuesta({ error: TEXTOS_EDITOR.faltaTono, campo: 'tono' }, 400)
  if (!textosCoinciden(d.letra, d.secciones)) return respuesta({ error: `${MSG.valorNoValido} en secciones` }, 400)
  if (construirCarga(a.estado).huella !== d.base) return respuesta({ error: TEXTOS_EDITOR.huboCambios, campo: 'base' }, 409)
  const r = await ejecutar(admin, planificar(a.estado, d, new Date(), randomUUID))
  if (!r.ok) return respuesta({ error: TEXTOS_EDITOR.guardadoIncompleto, parcial: r.hechas > 0 }, 500)
  const despues = await leerEstado(admin, d.songId).catch(() => null)
  return respuesta({ ok: true, huella: despues ? construirCarga(despues).huella : null }, 200)
}
