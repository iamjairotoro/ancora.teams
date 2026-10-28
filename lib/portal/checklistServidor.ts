// El checklist por posición para el MÚSICO, decidido EN EL SERVIDOR (llave de servicio; la persona sale de la sesión, nunca del cuerpo de la petición). Lo llaman las rutas /api/portal/checklist y /api/portal/checklist/marcar.
// Qué ve cada quien lo decide lib/checklist/posiciones.ts (puro, con pruebas): solo las posiciones que la persona tiene hoy en la nómina Y confirmó; nunca los ítems de otra posición, de «General» ni de otro equipo, aunque llame a la API a mano.
// A la pantalla solo viajan ítems visibles para esa persona (ids de ítem, texto, estado, quién y cuándo marcó); ni los ids de otras posiciones ni la nómina de otros. Las respuestas de error son genéricas.
import { MSG } from '@/lib/textos/mensajes'
import { puedeMarcar, puedeVerEquipo, registrarMarca, vistaDelMusico, type Convocatoria, type FilaNomina, type Grupo, type Item, type Posicion } from '@/lib/checklist/posiciones'

type Admin = { from: (tabla: string) => any }
export interface Resultado { status: number; body: any }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const noAutorizado: Resultado = { status: 403, body: { error: MSG.noAutorizado } }
const pedidoInvalido: Resultado = { status: 400, body: { error: MSG.noSePudoLeer } }
const fallo: Resultado = { status: 500, body: { error: MSG.noSePudoLeer } }

interface Contexto { convocatorias: Convocatoria[]; posiciones: Posicion[]; nomina: FilaNomina[] }

/** Lo que hace falta para decidir: las convocatorias DE ESTA PERSONA en este equipo y servicio, las posiciones activas del equipo y la nómina del servicio en esas posiciones. */
async function contexto(admin: Admin, memberId: string, servicioId: string, teamId: string): Promise<Contexto | null> {
  const [inv, pos] = await Promise.all([
    admin.from('invitations').select('member_id, team_id, status, confirmed_position_ids').eq('service_id', servicioId).eq('member_id', memberId).eq('team_id', teamId),
    admin.from('team_positions').select('id, name, sort_order').eq('team_id', teamId).is('archived_at', null),
  ])
  if (inv.error || pos.error) return null
  const posiciones: Posicion[] = (pos.data || []).map((p: any) => ({ id: p.id, nombre: p.name, orden: p.sort_order ?? 0 }))
  const ids = posiciones.map(p => p.id)
  const ban = ids.length ? await admin.from('banda_assignments').select('member_id, team_position_id').eq('service_id', servicioId).in('team_position_id', ids) : { data: [], error: null }
  if (ban.error) return null
  return {
    convocatorias: (inv.data || []).map((i: any) => ({ memberId: i.member_id, teamId: i.team_id, status: i.status, confirmedPositionIds: i.confirmed_position_ids ?? null })),
    posiciones, nomina: (ban.data || []).filter((b: any) => b.team_position_id).map((b: any) => ({ memberId: b.member_id ?? null, positionId: b.team_position_id })),
  }
}

export async function leerChecklistMusico(admin: Admin, memberId: string, servicioId: unknown, herramientaId: unknown): Promise<Resultado> {
  if (typeof servicioId !== 'string' || typeof herramientaId !== 'string' || !UUID.test(servicioId) || !UUID.test(herramientaId)) return pedidoInvalido
  try {
    const { data: tool, error } = await admin.from('team_tools').select('id, team_id, tool_type').eq('id', herramientaId).maybeSingle()
    if (error) return fallo
    if (!tool || tool.tool_type !== 'checklist') return noAutorizado                                  // lo que no existe y lo que no es tuyo se responden igual
    const ctx = await contexto(admin, memberId, servicioId, tool.team_id)
    if (!ctx) return fallo
    if (!puedeVerEquipo(memberId, tool.team_id, ctx.convocatorias)) return noAutorizado                // sin convocatoria confirmada de ESE equipo: nada
    const { data: lista, error: e2 } = await admin.from('service_checklists').select('id').eq('service_id', servicioId).eq('team_tool_id', herramientaId).maybeSingle()
    if (e2) return fallo
    const vacio = { generado: new Date().toISOString(), posiciones: [], listos: 0, total: 0 }
    if (!lista) return { status: 200, body: { ...vacio, sinChecklist: true } }
    const [gr, it] = await Promise.all([
      admin.from('service_checklist_groups').select('id, team_position_id, titulo, sort_order').eq('service_checklist_id', lista.id).order('sort_order'),
      admin.from('service_checklist_items').select('id, group_id, team_position_id, texto, checked, checked_by_member_id, checked_at, sort_order').eq('service_checklist_id', lista.id).order('sort_order'),
    ])
    if (gr.error || it.error) return fallo
    const grupos: Grupo[] = (gr.data || []).map((g: any) => ({ id: g.id, positionId: g.team_position_id ?? null, titulo: g.titulo ?? null, orden: g.sort_order ?? 0 }))
    const items: Item[] = (it.data || []).map((i: any) => ({ id: i.id, groupId: i.group_id ?? null, positionId: i.team_position_id ?? null, texto: i.texto, checked: !!i.checked, checkedBy: i.checked_by_member_id ?? null, checkedAt: i.checked_at ?? null, orden: i.sort_order ?? 0 }))
    const vista = vistaDelMusico(memberId, { teamId: tool.team_id, posiciones: ctx.posiciones, nomina: ctx.nomina, convocatorias: ctx.convocatorias, grupos, items })
    // Solo el nombre de pila de quien marcó, y solo de los ítems que esta persona ya puede ver.
    const quienes = Array.from(new Set(vista.posiciones.flatMap(p => p.grupos.flatMap(g => g.items.map(i => i.checkedBy))).filter((x): x is string => !!x && x !== memberId)))
    const nombres = new Map<string, string>()
    if (quienes.length) { const { data } = await admin.from('members').select('id, nombre').in('id', quienes); for (const m of data || []) nombres.set(m.id, m.nombre || '') }
    return { status: 200, body: { ...vacio, listos: vista.listos, total: vista.total,
      posiciones: vista.posiciones.map(p => ({ nombre: p.nombre, listos: p.listos, total: p.total,
        grupos: p.grupos.map(g => ({ titulo: g.titulo, items: g.items.map(i => ({ id: i.id, texto: i.texto, checked: i.checked, marca: i.checked && i.checkedAt ? { yo: i.checkedBy === memberId, nombre: i.checkedBy === memberId ? null : (nombres.get(i.checkedBy || '') || null), hora: i.checkedAt } : null })) })) })) } }
  } catch { return fallo }
}

export async function marcarItemMusico(admin: Admin, memberId: string, itemId: unknown, checked: unknown): Promise<Resultado> {
  if (typeof itemId !== 'string' || !UUID.test(itemId) || typeof checked !== 'boolean') return pedidoInvalido
  try {
    const { data: item, error } = await admin.from('service_checklist_items').select('id, service_checklist_id, team_position_id').eq('id', itemId).maybeSingle()
    if (error) return fallo
    if (!item) return noAutorizado
    const { data: lista, error: e2 } = await admin.from('service_checklists').select('id, service_id, team_id, team_tool_id').eq('id', item.service_checklist_id).maybeSingle()
    if (e2) return fallo
    if (!lista) return noAutorizado
    const ctx = await contexto(admin, memberId, lista.service_id, lista.team_id)
    if (!ctx) return fallo
    if (!puedeMarcar({ rol: 'musico', memberId, teamId: lista.team_id, positionIdDelItem: item.team_position_id ?? null, nomina: ctx.nomina, convocatorias: ctx.convocatorias })) return noAutorizado
    const { error: e3 } = await admin.from('service_checklist_items').update(toColumnas(registrarMarca(checked, memberId, new Date().toISOString()))).eq('id', itemId)
    if (e3) return fallo
    return lista.team_tool_id ? leerChecklistMusico(admin, memberId, lista.service_id, lista.team_tool_id) : { status: 200, body: { ok: true } }      // la respuesta trae el estado fresco
  } catch { return fallo }
}

const toColumnas = (m: { checked: boolean; checkedBy: string | null; checkedAt: string | null }) => ({ checked: m.checked, checked_by_member_id: m.checkedBy, checked_at: m.checkedAt })
