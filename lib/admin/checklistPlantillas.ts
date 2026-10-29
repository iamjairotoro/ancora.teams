// Plantillas del checklist para el LÍDER y el admin (teléfono), decididas EN EL SERVIDOR con la llave de servicio. Las llama /api/admin/checklist (lib/admin/checklistLider.ts las despacha).
// Quién puede qué: la ruta ya autorizó con requireTeamAccess sobre el equipo del CHECKLIST (nunca de un campo del cliente); aquí además se revalida que la plantilla sea del mismo equipo y de la misma organización.
// Líder y admin pueden guardar y reemplazar plantillas de SU equipo; solo el admin puede reemplazar la predeterminada (default_for_kind). Renombrar, archivar y marcar como predeterminada NO existen aquí: siguen solo en escritorio,
// bajo la política de administrador de tool_templates (que no cambia). Una escritura de este archivo nunca toca `name`, `archived_at` ni `default_for_kind` de una plantilla que ya existe.
// El cliente NUNCA manda contenido: el servidor lo arma desde el checklist en la base y recalcula lo que se agrega al aplicar. Aplicar solo agrega (no borra ni pisa nada, ni lo marcado).
import { MSG } from '@/lib/textos/mensajes'
import {
  MAX_ITEMS_PLANTILLA, esPlantillaVieja, leerPlantilla, norm, planificarAplicacion, plantillaDesdeFilas, posicionesDePlantilla,
  type Grupo, type Item, type PlanAplicar, type PlantillaItem,
} from '@/lib/checklist/posiciones'

type Admin = { from: (tabla: string) => any }
export interface Resultado { status: number; body: any }
export interface ContextoPlantillas { teamId: string; orgId: string; memberId: string | null; /** El actor es administrador de la organización (no solo líder del equipo). */ esAdmin: boolean }
export interface ChecklistFila { id: string; service_id: string; team_id: string; team_tool_id: string | null }
export interface DepsPlantillas { /** La vista fresca del líder de ese checklist (la misma de /api/admin/checklist). */ leerVista: (c: ChecklistFila) => Promise<Resultado> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const esId = (x: unknown): x is string => typeof x === 'string' && UUID.test(x)
export const MAX_NOMBRE_PLANTILLA = 60
const noAutorizado: Resultado = { status: 403, body: { error: MSG.noAutorizado } }
const pedidoInvalido: Resultado = { status: 400, body: { error: MSG.noSePudoGuardar } }
const fallo: Resultado = { status: 500, body: { error: MSG.noSePudoGuardar } }
const nombreLimpio = (x: unknown): string | null => { if (typeof x !== 'string') return null; const t = x.replace(/\s+/g, ' ').trim(); return t.length >= 1 && t.length <= MAX_NOMBRE_PLANTILLA ? t : null }
async function uno(admin: Admin, tabla: string, cols: string, id: string) { const { data, error } = await admin.from(tabla).select(cols).eq('id', id).maybeSingle(); return error ? undefined : (data ?? null) }

const COLS_PLANTILLA = 'id, organization_id, team_id, tool, name, content, default_for_kind, archived_at'
const resumen = (p: PlanAplicar) => ({ agregar: p.agregar.length, omitir: p.omitir, sinPosiciones: p.sinPosiciones, aGeneral: p.aGeneral })

async function plantillasActivas(admin: Admin, c: ContextoPlantillas): Promise<any[] | null> {
  const { data, error } = await admin.from('tool_templates').select(COLS_PLANTILLA).eq('organization_id', c.orgId).eq('team_id', c.teamId).eq('tool', 'checklist').is('archived_at', null).order('name')
  return error ? null : (data || [])
}

async function filasDe(admin: Admin, checklistId: string): Promise<{ grupos: Grupo[]; items: Item[] } | null> {
  const [gr, it] = await Promise.all([
    admin.from('service_checklist_groups').select('id, team_position_id, titulo, sort_order').eq('service_checklist_id', checklistId).order('sort_order'),
    admin.from('service_checklist_items').select('id, group_id, team_position_id, texto, checked, sort_order').eq('service_checklist_id', checklistId).order('sort_order'),
  ])
  if (gr.error || it.error) return null
  return {
    grupos: (gr.data || []).map((g: any) => ({ id: g.id, positionId: g.team_position_id ?? null, titulo: g.titulo ?? null, orden: g.sort_order ?? 0 })),
    items: (it.data || []).map((i: any) => ({ id: i.id, groupId: i.group_id ?? null, positionId: i.team_position_id ?? null, texto: i.texto, checked: !!i.checked, orden: i.sort_order ?? 0 })),
  }
}

async function nombresDePosiciones(admin: Admin, teamId: string, items: Item[]): Promise<Map<string, string> | null> {
  const ids = Array.from(new Set(items.map(i => i.positionId).filter((x): x is string => !!x)))
  const m = new Map<string, string>(); if (!ids.length) return m
  const { data, error } = await admin.from('team_positions').select('id, name').eq('team_id', teamId).in('id', ids)
  if (error) return null
  for (const p of data || []) m.set(p.id, p.name)
  return m
}

/** Contenido de plantilla desde un checklist de la base (para guardar y para «el del domingo pasado»). null = no se pudo leer. */
async function contenidoDelChecklist(admin: Admin, teamId: string, checklistId: string): Promise<PlantillaItem[] | null> {
  const f = await filasDe(admin, checklistId); if (!f) return null
  const nombres = await nombresDePosiciones(admin, teamId, f.items); if (!nombres) return null
  return plantillaDesdeFilas({ grupos: f.grupos, items: f.items, nombres })
}

/** El último checklist ANTERIOR a este servicio, del mismo equipo y de la misma herramienta, con al menos un ítem (los ensayos no cuentan). undefined = error de lectura; null = no hay. */
async function domingoPasado(admin: Admin, c: ContextoPlantillas, ck: ChecklistFila): Promise<{ items: PlantillaItem[]; fecha: string } | null | undefined> {
  if (!ck.team_tool_id) return null
  const actual = await uno(admin, 'services', 'id, fecha, organization_id', ck.service_id); if (actual === undefined) return undefined
  if (!actual || actual.organization_id !== c.orgId) return null
  const cand = await admin.from('service_checklists').select('id, service_id').eq('team_id', c.teamId).eq('team_tool_id', ck.team_tool_id).neq('service_id', ck.service_id)
  if (cand.error) return undefined
  const filas: { id: string; service_id: string }[] = cand.data || []; if (!filas.length) return null
  const sv = await admin.from('services').select('id, fecha, kind, tipo, organization_id').in('id', filas.map(x => x.service_id))
  if (sv.error) return undefined
  const previos = (sv.data || []).filter((s: any) => s.organization_id === c.orgId && s.fecha && s.fecha < actual.fecha && s.kind !== 'rehearsal' && s.tipo !== 'ensayo').sort((a: any, b: any) => (a.fecha < b.fecha ? 1 : -1))
  for (const s of previos.slice(0, 8)) {
    const fila = filas.find(x => x.service_id === s.id); if (!fila) continue
    const items = await contenidoDelChecklist(admin, c.teamId, fila.id); if (!items) return undefined
    if (items.length > 0) return { items, fecha: s.fecha }
  }
  return null
}

async function listar(admin: Admin, c: ContextoPlantillas, ck: ChecklistFila): Promise<Resultado> {
  const ps = await plantillasActivas(admin, c); if (!ps) return fallo
  const dp = await domingoPasado(admin, c, ck); if (dp === undefined) return fallo
  return { status: 200, body: {
    plantillas: ps.map(p => { const it = leerPlantilla(p.content); return { id: p.id, nombre: p.name, items: it.length, posiciones: esPlantillaVieja(it) ? null : posicionesDePlantilla(it), predeterminada: !!p.default_for_kind } }),
    domingoPasado: dp ? { disponible: true, items: dp.items.length, fecha: dp.fecha } : { disponible: false },
    esAdmin: c.esAdmin,
  } }
}

/** Los ítems de lo que se va a aplicar. `undefined` = error de lectura; `null` = el origen no existe o no es de este equipo (403 genérico). */
async function origenDe(admin: Admin, c: ContextoPlantillas, ck: ChecklistFila, e: any): Promise<PlantillaItem[] | null | undefined | 'invalido'> {
  if (e.origen === 'domingo-pasado') { const dp = await domingoPasado(admin, c, ck); return dp === undefined ? undefined : (dp ? dp.items : 'invalido') }
  if (e.origen === 'plantilla') {
    if (!esId(e.plantillaId)) return 'invalido'
    const p = await uno(admin, 'tool_templates', COLS_PLANTILLA, e.plantillaId); if (p === undefined) return undefined
    if (!p || p.tool !== 'checklist' || p.team_id !== c.teamId || p.organization_id !== c.orgId || p.archived_at) return null      // de otro equipo, de otra organización, archivada o inexistente: se trata igual
    return leerPlantilla(p.content)
  }
  return 'invalido'
}

async function planDe(admin: Admin, ck: ChecklistFila, items: PlantillaItem[], deps: DepsPlantillas): Promise<{ plan: PlanAplicar; enServicio: Set<string> } | null> {
  const v = await deps.leerVista(ck); if (v.status !== 200) return null
  const posiciones = (v.body.posicionesDelEquipo || []).map((p: any) => ({ id: p.positionId as string, nombre: p.nombre as string, orden: 0 }))
  const existentes = (v.body.posiciones || []).flatMap((p: any) => (p.grupos || []).flatMap((g: any) => (g.items || []).map((i: any) => ({ positionId: p.positionId ?? null, grupo: g.titulo ?? null, texto: i.texto as string }))))
  return { plan: planificarAplicacion(items, { posiciones, existentes }), enServicio: new Set(posiciones.map((p: any) => p.id)) }
}

async function escribirPlan(admin: Admin, ck: ChecklistFila, plan: PlanAplicar, enServicio: Set<string>): Promise<boolean> {
  const gs = await admin.from('service_checklist_groups').select('id, team_position_id, titulo, sort_order').eq('service_checklist_id', ck.id); if (gs.error) return false
  const grupos: any[] = gs.data || []
  const ult = await admin.from('service_checklist_items').select('sort_order').eq('service_checklist_id', ck.id).order('sort_order', { ascending: false }).limit(1); if (ult.error) return false
  let ordenG = grupos.reduce((m, g) => Math.max(m, g.sort_order ?? 0), 0), ordenI = (ult.data && ult.data[0]?.sort_order) ?? 0
  const porClave = new Map<string, string>(), filas: any[] = []
  for (const a of plan.agregar) {
    let groupId: string | null = null
    if (a.grupo !== null) {
      const k = `${a.positionId ?? ''}|${norm(a.grupo)}`
      groupId = porClave.get(k) ?? null
      if (!groupId) {
        // «General» incluye las secciones de una posición que ya no está en el servicio (así las ve la vista del líder).
        const ya = grupos.find(g => (g.team_position_id && enServicio.has(g.team_position_id) ? g.team_position_id : null) === a.positionId && norm(g.titulo ?? '') === norm(a.grupo as string))
        if (ya) groupId = ya.id
        else {
          const r = await admin.from('service_checklist_groups').insert({ service_checklist_id: ck.id, team_position_id: a.positionId, titulo: a.grupo, sort_order: ++ordenG }).select('id').single()
          if (r.error || !r.data) return false
          groupId = r.data.id
        }
        porClave.set(k, groupId as string)
      }
    }
    filas.push({ service_checklist_id: ck.id, group_id: groupId, team_position_id: a.positionId, texto: a.texto, checked: false, sort_order: ++ordenI })
  }
  const r = await admin.from('service_checklist_items').insert(filas)
  return !r.error
}

async function previsualizarOAplicar(admin: Admin, c: ContextoPlantillas, ck: ChecklistFila, e: any, deps: DepsPlantillas, aplicar: boolean): Promise<Resultado> {
  const items = await origenDe(admin, c, ck, e)
  if (items === undefined) return fallo
  if (items === null) return noAutorizado
  if (items === 'invalido') return pedidoInvalido
  const p = await planDe(admin, ck, items, deps); if (!p) return fallo
  if (!aplicar) return { status: 200, body: resumen(p.plan) }
  const esperado = e.esperados && typeof e.esperados === 'object' ? e.esperados.agregar : undefined
  if (typeof esperado === 'number' && esperado !== p.plan.agregar.length) return { status: 409, body: { error: MSG.noSePudoGuardar, codigo: 'cambio', resumen: resumen(p.plan) } }      // cambió desde que la persona confirmó: se vuelve a preguntar
  if (p.plan.agregar.length > 0 && !(await escribirPlan(admin, ck, p.plan, p.enServicio))) return fallo
  const v = await deps.leerVista(ck); if (v.status !== 200) return v
  return { status: 200, body: { ...v.body, aplicado: resumen(p.plan) } }
}

async function guardar(admin: Admin, c: ContextoPlantillas, ck: ChecklistFila, e: any): Promise<Resultado> {
  const nombre = nombreLimpio(e.nombre); if (!nombre) return pedidoInvalido
  const contenido = await contenidoDelChecklist(admin, c.teamId, ck.id); if (!contenido) return fallo
  if (contenido.length === 0) return { status: 400, body: { error: MSG.noSePudoGuardar, codigo: 'vacio' } }
  if (contenido.length > MAX_ITEMS_PLANTILLA) return { status: 400, body: { error: MSG.noSePudoGuardar, codigo: 'grande' } }
  const ps = await plantillasActivas(admin, c); if (!ps) return fallo
  const iguales = ps.filter(p => norm(p.name) === norm(nombre))
  const sugerencia = `${nombre.slice(0, MAX_NOMBRE_PLANTILLA - 8)} (copia)`
  if (iguales.length > 1) return { status: 409, body: { error: MSG.noSePudoGuardar, codigo: 'ambiguo' } }
  if (iguales.length === 0) {
    const r = await admin.from('tool_templates').insert({ organization_id: c.orgId, team_id: c.teamId, tool: 'checklist', name: nombre, content: contenido, created_by: c.memberId }).select('id').single()
    if (r.error || !r.data) return fallo
    return respuestaGuardada(admin, c, ck, r.data.id, nombre, false)
  }
  const ya = iguales[0]
  if (ya.default_for_kind && !c.esAdmin) return { status: 403, body: { error: MSG.noAutorizado, codigo: 'predeterminada', sugerencia } }      // solo el admin reemplaza la predeterminada: se le sugiere otro nombre
  if (e.reemplazar !== true) return { status: 409, body: { error: MSG.noSePudoGuardar, codigo: 'existe', nombre: ya.name, predeterminada: !!ya.default_for_kind } }
  // Reemplazar = cambiar SOLO el contenido (id, nombre, predeterminada y archivado quedan como están). Para un líder la condición «no es predeterminada» va en la propia escritura: si el admin la marcó justo antes, no se pisa.
  let q = admin.from('tool_templates').update({ content: contenido }).eq('id', ya.id).eq('team_id', c.teamId).eq('organization_id', c.orgId).is('archived_at', null)
  if (!c.esAdmin) q = q.is('default_for_kind', null)
  const r = await q.select('id')
  if (r.error) return fallo
  if (!r.data || r.data.length === 0) return c.esAdmin ? noAutorizado : { status: 403, body: { error: MSG.noAutorizado, codigo: 'predeterminada', sugerencia } }
  return respuestaGuardada(admin, c, ck, ya.id, ya.name, true)
}

async function respuestaGuardada(admin: Admin, c: ContextoPlantillas, ck: ChecklistFila, id: string, nombre: string, reemplazo: boolean): Promise<Resultado> {
  const l = await listar(admin, c, ck); if (l.status !== 200) return l
  return { status: 200, body: { ...l.body, guardada: { id, nombre, reemplazo } } }
}

/** Despacha las acciones de plantillas. El checklist ya existe y es de `c.teamId` (lo comprobó quien llama al sacar el equipo del recurso). */
export async function ejecutarPlantilla(admin: Admin, c: ContextoPlantillas, e: any, deps: DepsPlantillas): Promise<Resultado> {
  if (!esId(e?.checklistId)) return noAutorizado
  const ck = await uno(admin, 'service_checklists', 'id, service_id, team_id, team_tool_id', e.checklistId) as ChecklistFila | null | undefined
  if (ck === undefined) return fallo
  if (!ck || ck.team_id !== c.teamId) return noAutorizado
  switch (e.accion) {
    case 'plantillas-listar': return listar(admin, c, ck)
    case 'plantilla-previsualizar': return previsualizarOAplicar(admin, c, ck, e, deps, false)
    case 'plantilla-aplicar': return previsualizarOAplicar(admin, c, ck, e, deps, true)
    case 'plantilla-guardar': return guardar(admin, c, ck, e)
    default: return pedidoInvalido
  }
}

export const ACCIONES_PLANTILLA = ['plantillas-listar', 'plantilla-previsualizar', 'plantilla-aplicar', 'plantilla-guardar'] as const
