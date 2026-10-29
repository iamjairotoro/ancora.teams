// Checklist de un equipo en un servicio, DIVIDIDO POR POSICIÓN (lógica pura: sin acceso a datos ni a servidor; la usan las rutas de servidor y la pantalla, y se prueba aparte).
// Reglas acordadas:
//  · Cada ítem pertenece a una posición de la nómina de ESE servicio (o a «General», sin posición: solo el líder lo ve). Quien tiene la posición ese día Y la confirmó ve y marca sus ítems; no ve las demás.
//  · «Tiene la posición» = su convocatoria de ese equipo está confirmada y la posición está en lo que confirmó (`confirmed_position_ids`, la foto de 037a) y sigue en la nómina. Si la nómina cambia después de confirmar, los ítems
//    SIGUEN A LA POSICIÓN (no a la persona) y lo ya marcado se conserva con quién y cuándo. La posición nueva queda «Pendiente de confirmar» hasta que la persona confirme.
//  · Una convocatoria confirmada sin foto (`null`, heredada) cuenta con todas sus posiciones actuales del equipo. Convocada sin responder: el líder ve «Pendiente de confirmar» y los ítems solo el líder. Declinada, o vacante: «Sin persona».
//  · El líder (el servidor verifica que lo es de ESE equipo) ve todo y puede marcar cualquier ítem; el músico solo los suyos.
//  · Las plantillas guardan por POSICIÓN (no por persona). Al aplicarlas, lo de una posición que ese día no existe NO se aplica y se devuelve aparte para avisar al líder.

export type EstadoConvocatoria = 'pendiente' | 'confirmado' | 'declinado'
export type EstadoPosicion = 'confirmada' | 'pendiente' | 'sin-persona'

export interface Posicion { id: string; nombre: string; orden: number }
/** Una fila de la nómina (banda_assignments) del servicio, de las posiciones de ESTE equipo. `memberId` null = vacante. */
export interface FilaNomina { memberId: string | null; positionId: string }
export interface Convocatoria { memberId: string; teamId: string | null; status: EstadoConvocatoria; confirmedPositionIds: string[] | null }

export interface Grupo { id: string; positionId: string | null; titulo: string | null; orden: number }
export interface Item { id: string; groupId: string | null; positionId: string | null; texto: string; checked: boolean; checkedBy?: string | null; checkedAt?: string | null; orden: number }

const unicos = <T,>(xs: T[]): T[] => Array.from(new Set(xs))
const convocatoriasDe = (memberId: string, teamId: string, cs: Convocatoria[]) => cs.filter(c => c.memberId === memberId && c.teamId === teamId)

/** ¿Tiene esta persona una convocatoria confirmada de este equipo? (si no, ni siquiera ve la herramienta del equipo). */
export function puedeVerEquipo(memberId: string, teamId: string, cs: Convocatoria[]): boolean {
  return convocatoriasDe(memberId, teamId, cs).some(c => c.status === 'confirmado')
}

/** Las posiciones (ids) de ESTA persona que ve y marca: las que tiene hoy en la nómina Y están en lo que confirmó. */
export function posicionesConfirmadasDe(memberId: string, teamId: string, nomina: FilaNomina[], cs: Convocatoria[]): string[] {
  const confirmadas = convocatoriasDe(memberId, teamId, cs).filter(c => c.status === 'confirmado')
  if (confirmadas.length === 0) return []
  const actuales = unicos(nomina.filter(f => f.memberId === memberId).map(f => f.positionId))
  if (confirmadas.some(c => c.confirmedPositionIds === null)) return actuales
  const foto = new Set(confirmadas.flatMap(c => c.confirmedPositionIds ?? []))
  return actuales.filter(p => foto.has(p))
}

export interface EstadoDePosicion { positionId: string; estado: EstadoPosicion; confirmadas: string[]; pendientes: string[] }

/** Para el líder: por cada posición de la nómina, si tiene a alguien confirmado, a alguien por confirmar o a nadie. */
export function estadoDePosiciones(posiciones: Posicion[], nomina: FilaNomina[], teamId: string, cs: Convocatoria[]): EstadoDePosicion[] {
  return [...posiciones].sort((a, b) => a.orden - b.orden).map(p => {
    const personas = unicos(nomina.filter(f => f.positionId === p.id && f.memberId).map(f => f.memberId as string))
    const confirmadas: string[] = [], pendientes: string[] = []
    for (const m of personas) {
      const mias = convocatoriasDe(m, teamId, cs)
      if (mias.length > 0 && mias.every(c => c.status === 'declinado')) continue            // declinó: la posición cuenta como vacante
      if (posicionesConfirmadasDe(m, teamId, nomina, cs).includes(p.id)) confirmadas.push(m)
      else pendientes.push(m)                                                                // sin responder, sin convocar, o posición nueva sin confirmar
    }
    return { positionId: p.id, estado: confirmadas.length > 0 ? 'confirmada' : pendientes.length > 0 ? 'pendiente' : 'sin-persona', confirmadas, pendientes }
  })
}

export interface ItemVista { id: string; texto: string; checked: boolean; checkedBy: string | null; checkedAt: string | null }
export interface GrupoVista { id: string | null; titulo: string | null; items: ItemVista[] }
export interface PosicionVista { positionId: string | null; nombre: string; estado: EstadoPosicion | 'general'; confirmadas: string[]; pendientes: string[]; grupos: GrupoVista[]; listos: number; total: number }
export interface VistaChecklist { posiciones: PosicionVista[]; listos: number; total: number }

const aVista = (i: Item): ItemVista => ({ id: i.id, texto: i.texto, checked: i.checked, checkedBy: i.checkedBy ?? null, checkedAt: i.checkedAt ?? null })

function gruposDe(positionId: string | null, grupos: Grupo[], items: Item[], conVacios: boolean): GrupoVista[] {
  const de = items.filter(i => i.positionId === positionId)
  const g = grupos.filter(x => x.positionId === positionId).sort((a, b) => a.orden - b.orden)
  const salida: GrupoVista[] = g.map(x => ({ id: x.id, titulo: x.titulo, items: de.filter(i => i.groupId === x.id).sort((a, b) => a.orden - b.orden).map(aVista) }))
  const sueltos = de.filter(i => !i.groupId || !g.some(x => x.id === i.groupId)).sort((a, b) => a.orden - b.orden).map(aVista)
  if (sueltos.length > 0) salida.unshift({ id: null, titulo: null, items: sueltos })
  return conVacios ? salida : salida.filter(x => x.items.length > 0)
}
const contar = (gs: GrupoVista[]) => ({ listos: gs.reduce((n, g) => n + g.items.filter(i => i.checked).length, 0), total: gs.reduce((n, g) => n + g.items.length, 0) })

export interface EntradaVista { teamId: string; posiciones: Posicion[]; nomina: FilaNomina[]; convocatorias: Convocatoria[]; grupos: Grupo[]; items: Item[] }

/** Lo que ve el LÍDER del equipo: todas las posiciones de la nómina (con su estado) y «General»; los ítems de una posición que ya no está en el servicio van a «General» (no se pierden). */
export function vistaDelLider(e: EntradaVista, nombreGeneral = 'General'): VistaChecklist {
  const ids = new Set(e.posiciones.map(p => p.id))
  const items = e.items.map(i => (i.positionId && !ids.has(i.positionId) ? { ...i, positionId: null } : i))
  const grupos = e.grupos.map(g => (g.positionId && !ids.has(g.positionId) ? { ...g, positionId: null } : g))
  const posiciones: PosicionVista[] = estadoDePosiciones(e.posiciones, e.nomina, e.teamId, e.convocatorias).map(s => {
    const gs = gruposDe(s.positionId, grupos, items, true)
    return { positionId: s.positionId, nombre: e.posiciones.find(p => p.id === s.positionId)!.nombre, estado: s.estado, confirmadas: s.confirmadas, pendientes: s.pendientes, grupos: gs, ...contar(gs) }
  })
  const general = gruposDe(null, grupos, items, true)
  if (general.some(g => g.items.length > 0)) posiciones.push({ positionId: null, nombre: nombreGeneral, estado: 'general', confirmadas: [], pendientes: [], grupos: general, ...contar(general) })
  return { posiciones, listos: posiciones.reduce((n, p) => n + p.listos, 0), total: posiciones.reduce((n, p) => n + p.total, 0) }
}

/** Lo que ve el MÚSICO: solo las posiciones que tiene hoy y confirmó (una o varias, en el orden de la nómina), sin «General», sin pendientes ni vacantes de otros; los totales cuentan solo lo suyo. Sin convocatoria confirmada del equipo: nada. */
export function vistaDelMusico(memberId: string, e: EntradaVista): VistaChecklist {
  if (!puedeVerEquipo(memberId, e.teamId, e.convocatorias)) return { posiciones: [], listos: 0, total: 0 }
  const mias = new Set(posicionesConfirmadasDe(memberId, e.teamId, e.nomina, e.convocatorias))
  const posiciones: PosicionVista[] = [...e.posiciones].sort((a, b) => a.orden - b.orden).filter(p => mias.has(p.id)).map(p => {
    const gs = gruposDe(p.id, e.grupos, e.items, false)
    return { positionId: p.id, nombre: p.nombre, estado: 'confirmada' as const, confirmadas: [memberId], pendientes: [], grupos: gs, ...contar(gs) }
  })
  return { posiciones, listos: posiciones.reduce((n, p) => n + p.listos, 0), total: posiciones.reduce((n, p) => n + p.total, 0) }
}

/** ¿Puede marcar o desmarcar este ítem? El líder (verificado por el servidor para ESE equipo) cualquiera del equipo; el músico solo los de sus posiciones (nunca «General»). */
export function puedeMarcar(a: { rol: 'lider' | 'musico'; memberId: string; teamId: string; positionIdDelItem: string | null; nomina: FilaNomina[]; convocatorias: Convocatoria[] }): boolean {
  if (a.rol === 'lider') return true
  if (a.positionIdDelItem === null) return false
  return posicionesConfirmadasDe(a.memberId, a.teamId, a.nomina, a.convocatorias).includes(a.positionIdDelItem)
}

/** El registro de una marca: quién y a qué hora. Al desmarcar se borra (el ítem vuelve a estar pendiente). */
export const registrarMarca = (checked: boolean, memberId: string, ahoraIso: string): { checked: boolean; checkedBy: string | null; checkedAt: string | null } =>
  checked ? { checked: true, checkedBy: memberId, checkedAt: ahoraIso } : { checked: false, checkedBy: null, checkedAt: null }

// ── plantillas ──
// Una plantilla es la MISMA lista plana de siempre (`tool_templates.content`: `[{ texto }]`) con campos opcionales por ítem: `positionId`, `positionNombre` y `grupo` (título de la sección). Las plantillas viejas (solo `texto`) siguen
// valiendo: al aplicarlas, todos sus ítems van a «General» en una sola sección sin título. Escritorio y los servicios nuevos ignoran los campos extra, así que nada se rompe. No hay migración.
export interface PlantillaItem { texto: string; positionId?: string | null; positionNombre?: string | null; grupo?: string | null }

export const MAX_ITEMS_PLANTILLA = 500
// Un id de posición solo se compara con los ids que el servidor conoce (nunca llega a una consulta): basta con que tenga la forma de un identificador.
const ID_POSICION = /^[A-Za-z0-9_-]{1,64}$/
const txt = (x: unknown, max: number): string | null => { if (typeof x !== 'string') return null; const t = x.replace(/\s+/g, ' ').trim(); return t.length >= 1 && t.length <= max ? t : null }

export const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Lee el `content` de una plantilla con cuidado (viene de la base, pero se vuelve a validar): lista de ítems con texto de 1 a 200 caracteres; los campos opcionales solo si tienen la forma correcta. Lo que no sirve se descarta. */
export function leerPlantilla(content: unknown): PlantillaItem[] {
  if (!Array.isArray(content)) return []
  const salida: PlantillaItem[] = []
  for (const x of content) {
    if (salida.length >= MAX_ITEMS_PLANTILLA) break
    if (!x || typeof x !== 'object') continue
    const texto = txt((x as any).texto, 200); if (!texto) continue
    const it: PlantillaItem = { texto }
    const pid = (x as any).positionId
    if (pid === null) it.positionId = null
    else if (typeof pid === 'string' && ID_POSICION.test(pid)) it.positionId = pid
    const nombre = txt((x as any).positionNombre, 80); if (nombre) it.positionNombre = nombre
    const grupo = txt((x as any).grupo, 80); if (grupo) it.grupo = grupo
    salida.push(it)
  }
  return salida
}

/** ¿Es una plantilla vieja, sin posiciones? (ningún ítem declara `positionId`, ni siquiera null). */
export const esPlantillaVieja = (items: PlantillaItem[]): boolean => items.length > 0 && items.every(i => i.positionId === undefined)
/** Cuántas posiciones distintas trae (sin contar «General»). */
export const posicionesDePlantilla = (items: PlantillaItem[]): number => new Set(items.filter(i => typeof i.positionId === 'string').map(i => i.positionId)).size

/** Lo que hay en un checklist (sus filas de la base), como plantilla: por posición y sección, SIN marcas ni personas. `nombres` = nombre de cada posición por id. Mantiene el orden de las secciones y de los ítems. */
export function plantillaDesdeFilas(e: { grupos: Grupo[]; items: Item[]; nombres: Map<string, string> }): PlantillaItem[] {
  const ordenGrupo = new Map(e.grupos.map(g => [g.id, g] as const))
  const orden = [...e.items].sort((a, b) => {
    const ga = a.groupId ? ordenGrupo.get(a.groupId) : undefined, gb = b.groupId ? ordenGrupo.get(b.groupId) : undefined
    return (a.positionId === null ? 1 : 0) - (b.positionId === null ? 1 : 0) || (a.positionId ?? '').localeCompare(b.positionId ?? '') || (ga?.orden ?? -1) - (gb?.orden ?? -1) || a.orden - b.orden
  })
  return orden.map(i => {
    const g = i.groupId ? ordenGrupo.get(i.groupId) : undefined
    const it: PlantillaItem = { texto: i.texto, positionId: i.positionId ?? null }
    if (g?.titulo) it.grupo = g.titulo
    if (i.positionId) { const n = e.nombres.get(i.positionId); if (n) it.positionNombre = n }
    return it
  })
}

export interface DestinoAplicar { positionId: string | null; grupo: string | null; texto: string }
export interface PlanAplicar {
  /** Lo que se agrega, en orden. */
  agregar: DestinoAplicar[]
  /** Cuántos ya estaban (mismo texto, misma posición y sección) y se omiten. */
  omitir: number
  /** Ítems que van a «General» porque su posición no existe este domingo, por posición original. */
  aGeneral: { nombre: string; items: number }[]
  /** Ítems de una plantilla vieja (sin posiciones) que van a «General» sin título. */
  sinPosiciones: number
}
export interface EstadoParaAplicar { posiciones: Posicion[]; /** Lo que ya hay: posición (null = General), título de la sección (null = suelto) y texto. */ existentes: { positionId: string | null; grupo: string | null; texto: string }[] }

const tituloDeGeneral = (nombre: string, grupo: string | null | undefined) => (grupo ? `${nombre} · ${grupo}` : nombre).slice(0, 80)

/** Qué se agrega a ESTE checklist. Primero se empareja la posición por id; si no, por nombre solo cuando es único en el servicio; si no, el ítem va a «General» en una sección con el nombre de la posición original (y se avisa). Las plantillas
 *  viejas van enteras a «General», en una sola sección sin título. Se omiten los ítems que ya están (texto sin distinguir mayúsculas ni tildes, misma posición y misma sección), también los repetidos dentro de la propia plantilla:
 *  así aplicar dos veces la misma plantilla no cambia nada la segunda vez. Nunca borra ni cambia nada. */
export function planificarAplicacion(items: PlantillaItem[], e: EstadoParaAplicar): PlanAplicar {
  const vistos = new Set(e.existentes.map(x => `${x.positionId ?? ''}|${x.grupo ? norm(x.grupo) : ''}|${norm(x.texto)}`))
  const plan: PlanAplicar = { agregar: [], omitir: 0, aGeneral: [], sinPosiciones: 0 }
  const fuera = new Map<string, number>()
  const resolver = (nombre: string | null | undefined, id: string): string | null => {
    if (e.posiciones.some(q => q.id === id)) return id
    if (!nombre) return null
    const por = e.posiciones.filter(q => norm(q.nombre) === norm(nombre)); return por.length === 1 ? por[0].id : null
  }
  for (const it of items) {
    let positionId: string | null, grupo: string | null, origen: string | null = null
    if (it.positionId === undefined) { positionId = null; grupo = null }
    else if (it.positionId === null) { positionId = null; grupo = it.grupo ?? null }
    else {
      const destino = resolver(it.positionNombre, it.positionId)
      if (destino) { positionId = destino; grupo = it.grupo ?? null }
      else { positionId = null; origen = it.positionNombre || 'Otra posición'; grupo = tituloDeGeneral(origen, it.grupo) }
    }
    const k = `${positionId ?? ''}|${grupo ? norm(grupo) : ''}|${norm(it.texto)}`
    if (vistos.has(k)) { plan.omitir++; continue }
    vistos.add(k); plan.agregar.push({ positionId, grupo, texto: it.texto })
    if (it.positionId === undefined) plan.sinPosiciones++
    if (origen) fuera.set(origen, (fuera.get(origen) ?? 0) + 1)
  }
  // El aviso cuenta solo lo que de verdad se agrega (lo omitido por repetido no se movió a ninguna parte).
  plan.aGeneral = Array.from(fuera.entries()).map(([nombre, items]) => ({ nombre, items }))
  return plan
}
