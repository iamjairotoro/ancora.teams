// GET /api/lider/estadisticas?equipoId=&periodo=mes|3m|anio — el «Resumen» del LÍDER (etapa 4): servicios del período, personas que sirvieron, % de posiciones cubiertas y, por persona de SU equipo, cuántas veces sirvió y la última vez
// (lib/lider/estadisticas.ts). Solo lee. La persona y la organización salen de la SESIÓN. El equipo debe ser uno que ESTA persona lidera (también un administrador: nunca estadísticas de equipos ajenos); un equipo ajeno, inexistente,
// archivado, de otra organización o sin rol reciben EXACTAMENTE lo mismo (403 genérico). Sin equipoId usa el primero que lidera. Parámetros mal escritos 400. Nunca se piden teléfono, correo, foto ni nacimiento. no-store siempre.
import { NextRequest, NextResponse } from 'next/server'
import { requireLiderDeLaSesion } from '@/lib/auth/authorize'
import { hoyEnSantiago } from '@/lib/convocatoriaCerrada'
import { armarResumen, esPeriodo, PERIODO_POR_DEFECTO, restarDias, ULTIMOS_DIAS } from '@/lib/lider/estadisticas'
import { MSG } from '@/lib/textos/mensajes'
import { ERRORES_LIDER as E } from '@/lib/textos/servicioLider'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const prohibido = (status = 403) => NextResponse.json({ error: MSG.noAutorizado }, { status, headers: NO_STORE })
const falla = () => NextResponse.json({ error: MSG.noSePudoLeer }, { status: 500, headers: NO_STORE })
const TROZO = 60, PAGINA = 1000
type Lectura = PromiseLike<{ data: any[] | null; error: any }>
/** Lee TODAS las filas (PostgREST corta cada respuesta en 1000): en trozos de ids y, dentro de cada trozo, en páginas. */
async function leer(ids: string[], pedir: (parte: string[], desde: number, hasta: number) => Lectura): Promise<{ data: any[]; error: any }> {
  const out: any[] = []
  for (let i = 0; i < ids.length; i += TROZO) {
    for (let desde = 0; ; desde += PAGINA) {
      const r = await pedir(ids.slice(i, i + TROZO), desde, desde + PAGINA - 1)
      if (r.error) return { data: [], error: r.error }
      out.push(...(r.data || []))
      if ((r.data || []).length < PAGINA) break
    }
  }
  return { data: out, error: null }
}

export async function GET(req: NextRequest) {
  const a = await requireLiderDeLaSesion()
  if (!a.ok) return prohibido(a.response.status)
  const periodoPedido = req.nextUrl.searchParams.get('periodo'), equipoPedido = req.nextUrl.searchParams.get('equipoId')
  if (periodoPedido !== null && !esPeriodo(periodoPedido)) return NextResponse.json({ error: E.consultaInvalida }, { status: 400, headers: NO_STORE })
  if (equipoPedido !== null && !UUID.test(equipoPedido)) return NextResponse.json({ error: E.consultaInvalida }, { status: 400, headers: NO_STORE })
  const periodo = periodoPedido === null ? PERIODO_POR_DEFECTO : (periodoPedido as 'mes' | '3m' | 'anio')
  const { admin, organizationId } = a
  const liderados = Array.from(a.equiposLiderados)
  if (liderados.length === 0) return prohibido()

  const teams = await admin.from('teams').select('id, name, color, sort_order').eq('organization_id', organizationId).in('id', liderados).is('archived_at', null).order('sort_order')
  if (teams.error) return falla()
  const equipos = ((teams.data || []) as any[]).map(t => ({ id: t.id as string, nombre: t.name as string, color: (t.color ?? null) as string | null }))
  const equipo = equipoPedido === null ? equipos[0] : equipos.find(t => t.id === equipoPedido)
  if (!equipo) return prohibido()

  const hoy = hoyEnSantiago(), desde = restarDias(hoy, ULTIMOS_DIAS)
  const posiciones = await admin.from('team_positions').select('id, archived_at').eq('team_id', equipo.id).eq('organization_id', organizationId)
  const servicios = await admin.from('services').select('id, fecha, tipo').eq('organization_id', organizationId).gte('fecha', desde).lt('fecha', hoy).order('fecha').range(0, 999)
  const membresias = await admin.from('team_members').select('member_id').eq('team_id', equipo.id).eq('organization_id', organizationId)
  if (posiciones.error || servicios.error || membresias.error) return falla()
  const idsPos = ((posiciones.data || []) as any[]).map(p => p.id as string)
  const idsServ = ((servicios.data || []) as any[]).map(s => s.id as string)
  const idsPersonas = Array.from(new Set(((membresias.data || []) as any[]).map(m => m.member_id as string)))
  const [asignaciones, cupos, confirmadas, personas] = await Promise.all([
    idsPos.length ? leer(idsServ, (p, d, h) => admin.from('banda_assignments').select('service_id, team_position_id, member_id, slot_index').in('service_id', p).in('team_position_id', idsPos).order('id').range(d, h)) : { data: [], error: null },
    idsPos.length ? leer(idsServ, (p, d, h) => admin.from('service_position_slots').select('service_id, team_position_id, slots_needed').in('service_id', p).in('team_position_id', idsPos).order('id').range(d, h)) : { data: [], error: null },
    leer(idsServ, (p, d, h) => admin.from('invitations').select('service_id, member_id').eq('team_id', equipo.id).eq('status', 'confirmado').in('service_id', p).order('id').range(d, h)),
    leer(idsPersonas, (p, d, h) => admin.from('members').select('id, nombre, apellido').in('id', p).eq('organization_id', organizationId).order('id').range(d, h)),
  ])
  if (asignaciones.error || cupos.error || confirmadas.error || personas.error) return falla()
  const r = armarResumen({ hoy, periodo, servicios: (servicios.data || []) as any, posiciones: (posiciones.data || []) as any, asignaciones: asignaciones.data, cupos: cupos.data, confirmadas: confirmadas.data, integrantes: personas.data })
  return NextResponse.json({ equipos, equipoId: equipo.id, periodo, servicios: r.servicios, personasQueSirvieron: r.personasQueSirvieron, cubiertasPct: r.cubiertasPct, personas: r.personas, avisos: r.avisos }, { headers: NO_STORE })
}
