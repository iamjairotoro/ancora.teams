// El checklist por posición para el LÍDER del equipo (y el admin), decidido EN EL SERVIDOR con la llave de servicio. Lo llama /api/admin/checklist.
// Quién puede qué: la ruta autoriza con requireTeamAccess sobre el equipo que sale del RECURSO (herramienta, checklist, grupo o ítem), nunca de un campo que mande el cliente; un líder solo toca su equipo y un id de otro equipo
// se responde igual que uno que no existe (403 genérico). Además se revalida que lo que se mezcla pertenece al mismo checklist (un grupo de otro checklist no sirve de destino) y que las posiciones son del equipo.
// Cada escritura responde con la vista fresca. Los ítems de «General» (sin posición) y los de una posición sin persona los ve el líder; el músico solo los suyos (lib/portal/checklistServidor.ts).
import { MSG } from '@/lib/textos/mensajes'
import { registrarMarca, vistaDelLider, type Convocatoria, type FilaNomina, type Grupo, type Item, type Posicion } from '@/lib/checklist/posiciones'

type Admin = { from: (tabla: string) => any }
export interface Resultado { status: number; body: any }
export type Autorizar = (teamId: string, orgId: string) => Promise<{ ok: true; memberId: string | null } | { ok: false; status: number }>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const esId = (x: unknown): x is string => typeof x === 'string' && UUID.test(x)
export const MAX_TEXTO = 200, MAX_TITULO = 80
const noAutorizado: Resultado = { status: 403, body: { error: MSG.noAutorizado } }
const pedidoInvalido: Resultado = { status: 400, body: { error: MSG.noSePudoGuardar } }
const fallo: Resultado = { status: 500, body: { error: MSG.noSePudoGuardar } }
const limpio = (x: unknown, max: number): string | null => { if (typeof x !== 'string') return null; const t = x.replace(/\s+/g, ' ').trim(); return t.length >= 1 && t.length <= max ? t : null }

async function uno(admin: Admin, tabla: string, cols: string, id: string) { const { data, error } = await admin.from(tabla).select(cols).eq('id', id).maybeSingle(); return error ? undefined : (data ?? null) }

/** El equipo (y su organización) al que pertenece lo que pide la petición, sacado del recurso. null = no existe o la petición no es válida. */
export async function equipoDeLaPeticion(admin: Admin, e: any): Promise<{ teamId: string; orgId: string } | null> {
  let teamId: string | null = null
  const porChecklist = async (id: unknown) => { if (!esId(id)) return null; const c = await uno(admin, 'service_checklists', 'team_id', id); return c?.team_id ?? null }
  switch (e?.accion) {
    case 'leer': case 'crear-checklist': { if (!esId(e.herramienta)) return null; const t = await uno(admin, 'team_tools', 'team_id, tool_type', e.herramienta); teamId = t && t.tool_type === 'checklist' ? t.team_id : null; break }
    case 'crear-grupo': case 'crear-item': teamId = await porChecklist(e.checklistId); break
    case 'renombrar-grupo': case 'eliminar-grupo': { if (!esId(e.grupoId)) return null; const g = await uno(admin, 'service_checklist_groups', 'service_checklist_id', e.grupoId); teamId = g ? await porChecklist(g.service_checklist_id) : null; break }
    case 'editar-item': case 'mover-item': case 'eliminar-item': case 'marcar': { if (!esId(e.itemId)) return null; const i = await uno(admin, 'service_checklist_items', 'service_checklist_id', e.itemId); teamId = i ? await porChecklist(i.service_checklist_id) : null; break }
    default: return null
  }
  if (!teamId) return null
  const eq = await uno(admin, 'teams', 'organization_id', teamId)
  return eq?.organization_id ? { teamId, orgId: eq.organization_id } : null
}

/** Autoriza (sobre el equipo del recurso) y ejecuta. Todo error: respuesta genérica. */
export async function ejecutarComoLider(admin: Admin, autorizar: Autorizar, e: any): Promise<Resultado> {
  try {
    const eq = await equipoDeLaPeticion(admin, e)
    if (!eq) return noAutorizado
    const a = await autorizar(eq.teamId, eq.orgId)
    if (!a.ok) return { status: a.status, body: { error: MSG.noAutorizado } }
    if (e.accion === 'leer') return leerVistaLider(admin, a.memberId, e.servicio, e.herramienta, eq)
    return await escribir(admin, a.memberId, e, eq.teamId)
  } catch { return fallo }
}

async function escribir(admin: Admin, memberId: string | null, e: any, teamId: string): Promise<Resultado> {
  const posicionesDelEquipo = async (): Promise<Set<string> | null> => { const { data, error } = await admin.from('team_positions').select('id').eq('team_id', teamId).is('archived_at', null); return error ? null : new Set((data || []).map((p: any) => p.id as string)) }
  let servicioId = '', herramientaId: string | null = null
  const recordar = (c: { service_id: string; team_tool_id: string | null }) => { servicioId = c.service_id; herramientaId = c.team_tool_id }
  const ok = async (c?: { service_id: string; team_tool_id: string | null }): Promise<Resultado> => { if (c) recordar(c); return herramientaId ? leerVistaLider(admin, memberId, servicioId, herramientaId, { teamId, orgId: '' }) : { status: 200, body: { ok: true } } }
  const checklistDe = (id: string) => uno(admin, 'service_checklists', 'id, service_id, team_id, team_tool_id', id)
  const siguiente = async (tabla: string, col: string, id: string) => { const { data } = await admin.from(tabla).select('sort_order').eq(col, id).order('sort_order', { ascending: false }).limit(1); return ((data && data[0]?.sort_order) ?? 0) + 1 }

  switch (e.accion) {
    case 'crear-checklist': {
      if (!esId(e.servicio)) return pedidoInvalido
      const svc = await uno(admin, 'services', 'id, organization_id', e.servicio); const eq = await uno(admin, 'teams', 'organization_id', teamId)
      if (!svc || !eq || svc.organization_id !== eq.organization_id) return noAutorizado
      const ya = await admin.from('service_checklists').select('id, service_id, team_tool_id').eq('service_id', e.servicio).eq('team_tool_id', e.herramienta).maybeSingle()
      if (ya.error) return fallo
      if (!ya.data) { const r = await admin.from('service_checklists').insert({ service_id: e.servicio, team_id: teamId, team_tool_id: e.herramienta }); if (r.error) return fallo }
      return leerVistaLider(admin, memberId, e.servicio, e.herramienta, { teamId, orgId: '' })
    }
    case 'crear-grupo': {
      const titulo = limpio(e.titulo, MAX_TITULO); if (!titulo) return pedidoInvalido
      const c = await checklistDe(e.checklistId); if (!c) return noAutorizado
      let pos: string | null = null
      if (e.positionId !== null && e.positionId !== undefined) { if (!esId(e.positionId)) return pedidoInvalido; const ps = await posicionesDelEquipo(); if (!ps || !ps.has(e.positionId)) return pedidoInvalido; pos = e.positionId }
      const r = await admin.from('service_checklist_groups').insert({ service_checklist_id: c.id, team_position_id: pos, titulo, sort_order: await siguiente('service_checklist_groups', 'service_checklist_id', c.id) }); if (r.error) return fallo
      return ok(c)
    }
    case 'renombrar-grupo': case 'eliminar-grupo': {
      const g = await uno(admin, 'service_checklist_groups', 'id, service_checklist_id', e.grupoId); if (!g) return noAutorizado; const c = await checklistDe(g.service_checklist_id); if (!c) return noAutorizado
      if (e.accion === 'renombrar-grupo') { const titulo = limpio(e.titulo, MAX_TITULO); if (!titulo) return pedidoInvalido; const r = await admin.from('service_checklist_groups').update({ titulo }).eq('id', g.id); if (r.error) return fallo }
      else { const r = await admin.from('service_checklist_groups').delete().eq('id', g.id); if (r.error) return fallo }       // sus ítems quedan sueltos en su posición (group_id → null): no se pierde ninguno
      return ok(c)
    }
    case 'crear-item': {
      const texto = limpio(e.texto, MAX_TEXTO); if (!texto) return pedidoInvalido
      const c = await checklistDe(e.checklistId); if (!c) return noAutorizado
      let grupo: string | null = null, pos: string | null = null
      if (e.grupoId !== null && e.grupoId !== undefined) { if (!esId(e.grupoId)) return pedidoInvalido; const g = await uno(admin, 'service_checklist_groups', 'id, service_checklist_id, team_position_id', e.grupoId); if (!g || g.service_checklist_id !== c.id) return pedidoInvalido; grupo = g.id; pos = g.team_position_id ?? null }
      else if (e.positionId !== null && e.positionId !== undefined) { if (!esId(e.positionId)) return pedidoInvalido; const ps = await posicionesDelEquipo(); if (!ps || !ps.has(e.positionId)) return pedidoInvalido; pos = e.positionId }
      const r = await admin.from('service_checklist_items').insert({ service_checklist_id: c.id, group_id: grupo, team_position_id: pos, texto, checked: false, sort_order: await siguiente('service_checklist_items', 'service_checklist_id', c.id) }); if (r.error) return fallo
      return ok(c)
    }
    case 'editar-item': {
      const texto = limpio(e.texto, MAX_TEXTO); if (!texto) return pedidoInvalido
      const i = await uno(admin, 'service_checklist_items', 'id, service_checklist_id', e.itemId); if (!i) return noAutorizado; const c = await checklistDe(i.service_checklist_id); if (!c) return noAutorizado
      const r = await admin.from('service_checklist_items').update({ texto }).eq('id', i.id); if (r.error) return fallo
      return ok(c)
    }
    case 'mover-item': {
      const i = await uno(admin, 'service_checklist_items', 'id, service_checklist_id', e.itemId); if (!i) return noAutorizado; const c = await checklistDe(i.service_checklist_id); if (!c) return noAutorizado
      let grupo: string | null = null, pos: string | null = null          // sin grupo ni posición = «General»
      if (e.grupoId !== null && e.grupoId !== undefined) { if (!esId(e.grupoId)) return pedidoInvalido; const g = await uno(admin, 'service_checklist_groups', 'id, service_checklist_id, team_position_id', e.grupoId); if (!g || g.service_checklist_id !== c.id) return pedidoInvalido; grupo = g.id; pos = g.team_position_id ?? null }
      else if (e.positionId !== null && e.positionId !== undefined) { if (!esId(e.positionId)) return pedidoInvalido; const ps = await posicionesDelEquipo(); if (!ps || !ps.has(e.positionId)) return pedidoInvalido; pos = e.positionId }      // sin sección dentro de esa posición
      const r = await admin.from('service_checklist_items').update({ group_id: grupo, team_position_id: pos }).eq('id', i.id); if (r.error) return fallo      // lo marcado conserva su marca (quién y cuándo): no se tocan esas columnas
      return ok(c)
    }
    case 'eliminar-item': {
      const i = await uno(admin, 'service_checklist_items', 'id, service_checklist_id', e.itemId); if (!i) return noAutorizado; const c = await checklistDe(i.service_checklist_id); if (!c) return noAutorizado
      const r = await admin.from('service_checklist_items').delete().eq('id', i.id); if (r.error) return fallo
      return ok(c)
    }
    case 'marcar': {
      if (typeof e.checked !== 'boolean') return pedidoInvalido
      if (!memberId) return noAutorizado
      const i = await uno(admin, 'service_checklist_items', 'id, service_checklist_id', e.itemId); if (!i) return noAutorizado; const c = await checklistDe(i.service_checklist_id); if (!c) return noAutorizado
      const m = registrarMarca(e.checked, memberId, new Date().toISOString())
      const r = await admin.from('service_checklist_items').update({ checked: m.checked, checked_by_member_id: m.checkedBy, checked_at: m.checkedAt }).eq('id', i.id); if (r.error) return fallo
      return ok(c)
    }
    default: return pedidoInvalido
  }
}

/** La vista completa del líder: las posiciones del servicio (de la nómina: las que piden cupo o tienen a alguien) con su estado, sus grupos e ítems y «General». */
export async function leerVistaLider(admin: Admin, actorId: string | null, servicioId: unknown, herramientaId: unknown, eq: { teamId: string; orgId: string }): Promise<Resultado> {
  if (!esId(servicioId) || !esId(herramientaId)) return pedidoInvalido
  const t = await uno(admin, 'team_tools', 'id, team_id, tool_type', herramientaId)
  if (!t || t.tool_type !== 'checklist' || t.team_id !== eq.teamId) return noAutorizado
  const svc = await uno(admin, 'services', 'id, organization_id', servicioId); const equipo = await uno(admin, 'teams', 'organization_id', t.team_id)
  if (!svc || !equipo || svc.organization_id !== equipo.organization_id) return noAutorizado       // el servicio tiene que ser de la organización del equipo
  const generado = new Date().toISOString()
  const [lista, pos, slots, inv] = await Promise.all([
    admin.from('service_checklists').select('id').eq('service_id', servicioId).eq('team_tool_id', herramientaId).maybeSingle(),
    admin.from('team_positions').select('id, name, sort_order, default_slots').eq('team_id', t.team_id).is('archived_at', null),
    admin.from('service_position_slots').select('team_position_id, slots_needed').eq('service_id', servicioId),
    admin.from('invitations').select('member_id, team_id, status, confirmed_position_ids').eq('service_id', servicioId).eq('team_id', t.team_id),
  ])
  if (lista.error || pos.error || slots.error || inv.error) return fallo
  const idsPos: string[] = (pos.data || []).map((p: any) => p.id)
  const ban = idsPos.length ? await admin.from('banda_assignments').select('member_id, team_position_id').eq('service_id', servicioId).in('team_position_id', idsPos) : { data: [], error: null }
  if (ban.error) return fallo
  const nomina: FilaNomina[] = (ban.data || []).filter((b: any) => b.team_position_id).map((b: any) => ({ memberId: b.member_id ?? null, positionId: b.team_position_id }))
  const cupo = new Map<string, number>((slots.data || []).map((s: any) => [s.team_position_id as string, s.slots_needed as number]))
  const posiciones: Posicion[] = (pos.data || [])
    .filter((p: any) => (cupo.get(p.id) ?? p.default_slots ?? 1) > 0 || nomina.some(n => n.positionId === p.id && n.memberId))
    .map((p: any) => ({ id: p.id, nombre: p.name, orden: p.sort_order ?? 0 }))
  const convocatorias: Convocatoria[] = (inv.data || []).map((i: any) => ({ memberId: i.member_id, teamId: i.team_id, status: i.status, confirmedPositionIds: i.confirmed_position_ids ?? null }))
  let grupos: Grupo[] = [], items: Item[] = []
  if (lista.data) {
    const [gr, it] = await Promise.all([
      admin.from('service_checklist_groups').select('id, team_position_id, titulo, sort_order').eq('service_checklist_id', lista.data.id).order('sort_order'),
      admin.from('service_checklist_items').select('id, group_id, team_position_id, texto, checked, checked_by_member_id, checked_at, sort_order').eq('service_checklist_id', lista.data.id).order('sort_order'),
    ])
    if (gr.error || it.error) return fallo
    grupos = (gr.data || []).map((g: any) => ({ id: g.id, positionId: g.team_position_id ?? null, titulo: g.titulo ?? null, orden: g.sort_order ?? 0 }))
    items = (it.data || []).map((i: any) => ({ id: i.id, groupId: i.group_id ?? null, positionId: i.team_position_id ?? null, texto: i.texto, checked: !!i.checked, checkedBy: i.checked_by_member_id ?? null, checkedAt: i.checked_at ?? null, orden: i.sort_order ?? 0 }))
  }
  const vista = vistaDelLider({ teamId: t.team_id, posiciones, nomina, convocatorias, grupos, items })
  const ids = Array.from(new Set([...vista.posiciones.flatMap(p => [...p.confirmadas, ...p.pendientes]), ...vista.posiciones.flatMap(p => p.grupos.flatMap(g => g.items.map(i => i.checkedBy)))].filter((x): x is string => !!x)))
  const nombres = new Map<string, string>()
  if (ids.length) { const { data } = await admin.from('members').select('id, nombre, apellido').in('id', ids); for (const m of data || []) nombres.set(m.id, [m.nombre, m.apellido].filter(Boolean).join(' ')) }
  const nombre = (id: string) => nombres.get(id) || '—'
  return { status: 200, body: {
    generado, checklistId: lista.data?.id ?? null, sinChecklist: !lista.data, listos: vista.listos, total: vista.total,
    posiciones: vista.posiciones.map(p => ({ positionId: p.positionId, nombre: p.nombre, estado: p.estado, confirmadas: p.confirmadas.map(nombre), pendientes: p.pendientes.map(nombre), listos: p.listos, total: p.total,
      grupos: p.grupos.map(g => ({ id: g.id, titulo: g.titulo, items: g.items.map(i => ({ id: i.id, texto: i.texto, checked: i.checked, marca: i.checked && i.checkedAt ? { yo: !!actorId && i.checkedBy === actorId, nombre: i.checkedBy ? nombre(i.checkedBy).split(' ')[0] : null, hora: i.checkedAt } : null })) })) })),
    posicionesDelEquipo: posiciones.map(p => ({ positionId: p.id, nombre: p.nombre })),
  } }
}
