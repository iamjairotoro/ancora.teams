// Lo común de las rutas de ESCRITURA del líder (etapa 2: /api/lider/asignar, cupos, horario, notas, equipo, herramientas). Reglas, iguales en todas:
//  · la persona y la organización salen de la SESIÓN (requireLiderDeLaSesion); un líder escribe SOLO en los equipos que lidera, un administrador en cualquiera de su organización;
//  · el equipo se DERIVA del recurso (la posición, la herramienta, la fila del integrante); solo en las altas, donde el recurso es el propio equipo, viene en el pedido y se valida contra los equipos que lidera;
//  · un equipo ajeno, un recurso que no existe, uno de otra organización o una persona sin rol reciben EXACTAMENTE lo mismo: 403 genérico, sin Cache-Control de caché (no-store en todo);
//  · el cuerpo admite SOLO los campos de la lista de cada ruta: cualquier otro (is_leader, rol, team_id, organization_id…) se rechaza con 400;
//  · el servicio de la organización y con la convocatoria abierta; cada cambio deja una línea en los registros (quién, en qué equipo, qué).
import { NextRequest, NextResponse } from 'next/server'
import { requireLiderDeLaSesion } from '@/lib/auth/authorize'
import { convocatoriaCerrada } from '@/lib/convocatoriaCerrada'
import { MSG } from '@/lib/textos/mensajes'
import { ERRORES_LIDER as E } from '@/lib/textos/servicioLider'

export const NO_STORE = { 'Cache-Control': 'no-store' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const esId = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)
export const MAX_CUPOS = 20

export type AuthLider = Extract<Awaited<ReturnType<typeof requireLiderDeLaSesion>>, { ok: true }>
export const prohibido = (status = 403) => NextResponse.json({ error: MSG.noAutorizado }, { status, headers: NO_STORE })
export const rechazo = (status: number, error: string) => NextResponse.json({ error }, { status, headers: NO_STORE })
export const listo = (extra: Record<string, unknown> = {}) => NextResponse.json({ ok: true, ...extra }, { headers: NO_STORE })
export const falloDeBase = () => rechazo(500, E.noSePudoGuardar)

/** Autoriza y lee el cuerpo (JSON, objeto, solo los campos permitidos). Sin sesión 401; sin rol 403; cuerpo mal formado o con campos de más 400. */
export async function entrar(req: NextRequest, permitidos: readonly string[]): Promise<{ fallo: NextResponse } | { a: AuthLider; b: Record<string, any> }> {
  const a = await requireLiderDeLaSesion()
  if (!a.ok) return { fallo: prohibido(a.response.status) }
  const b = await req.json().catch(() => null)
  if (!b || typeof b !== 'object' || Array.isArray(b) || Object.keys(b).some(k => !permitidos.includes(k))) return { fallo: rechazo(400, E.pedido) }
  return { a, b }
}
/** Autoriza para una lectura (GET): solo la sesión; los parámetros los valida cada ruta. */
export async function entrarLectura(): Promise<{ fallo: NextResponse } | { a: AuthLider }> {
  const a = await requireLiderDeLaSesion()
  return a.ok ? { a } : { fallo: prohibido(a.response.status) }
}

export const puedeEnEquipo = (a: AuthLider, teamId: string | null | undefined): boolean => !!teamId && (a.esAdmin || a.equiposLiderados.has(teamId))

/** El equipo existe en la organización de la sesión Y esta persona puede cambiarlo. */
export async function equipoDeLaPersona(a: AuthLider, teamId: unknown): Promise<boolean | 'error'> {
  if (!esId(teamId) || !puedeEnEquipo(a, teamId)) return false
  const t = await a.admin.from('teams').select('id').eq('id', teamId).eq('organization_id', a.organizationId).maybeSingle()
  return t.error ? 'error' : !!t.data
}

/** El servicio de la organización de la sesión (o null). */
export async function servicioDe(a: AuthLider, id: unknown): Promise<{ id: string; fecha: string } | null | 'error'> {
  if (!esId(id)) return null
  const s = await a.admin.from('services').select('id, fecha').eq('id', id).eq('organization_id', a.organizationId).maybeSingle()
  return s.error ? 'error' : ((s.data as any) ?? null)
}
export const cerrado = (s: { fecha: string }) => convocatoriaCerrada(s.fecha)

/** Una herramienta del tipo pedido, de un equipo que esta persona puede cambiar (el equipo sale de la herramienta). */
export async function herramientaDe(a: AuthLider, id: unknown, tipo: string): Promise<{ id: string; team_id: string } | null | 'error'> {
  if (!esId(id)) return null
  const t = await a.admin.from('team_tools').select('id, team_id, tool_type').eq('id', id).maybeSingle()
  if (t.error) return 'error'
  const f = t.data as any
  if (!f || f.tool_type !== tipo || !puedeEnEquipo(a, f.team_id)) return null
  const ok = await equipoDeLaPersona(a, f.team_id)
  return ok === 'error' ? 'error' : ok ? { id: f.id, team_id: f.team_id } : null
}

/** Una línea por cambio, en los registros del servidor: quién (id de persona), si actuó como administrador, qué y dónde. Sin correos, teléfonos ni textos de personas. */
export function registrar(a: AuthLider, accion: string, detalle: Record<string, unknown>): void {
  console.info('[lider-cambio]', JSON.stringify({ actor: a.memberId, administrador: a.esAdmin, accion, ...detalle }))
}

export const limpio = (v: unknown, max: number): string | null => { if (typeof v !== 'string') return null; const t = v.trim(); return t.length >= 1 && t.length <= max ? t : null }
