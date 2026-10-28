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
export interface PlantillaGrupo { titulo: string | null; items: string[] }
export interface PlantillaPosicion { positionId: string | null; nombre: string; grupos: PlantillaGrupo[] }
export interface PlantillaContenido { version: 2; posiciones: PlantillaPosicion[] }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Guarda lo que hay (de la vista del líder) como plantilla: por posición, sin marcas ni personas. */
export function plantillaDesdeVista(v: VistaChecklist): PlantillaContenido {
  return { version: 2, posiciones: v.posiciones.filter(p => p.total > 0).map(p => ({ positionId: p.positionId, nombre: p.nombre, grupos: p.grupos.filter(g => g.items.length > 0).map(g => ({ titulo: g.titulo, items: g.items.map(i => i.texto) })) })) }
}

export interface AplicacionPlantilla { aplicar: { positionId: string | null; grupos: PlantillaGrupo[] }[]; fuera: { nombre: string; items: number }[] }

/** Qué se aplica a las posiciones de ESTE servicio: primero por id; si no, por nombre solo cuando es único en el servicio. Lo demás NO se aplica y se devuelve en `fuera` (nombre y cuántos ítems) para avisar al líder. «General» siempre se aplica. */
export function aplicarPlantilla(p: PlantillaContenido, posiciones: Posicion[]): AplicacionPlantilla {
  const usadas = new Set<string>(), aplicar: AplicacionPlantilla['aplicar'] = [], fuera: AplicacionPlantilla['fuera'] = []
  for (const x of p.posiciones) {
    const items = x.grupos.reduce((n, g) => n + g.items.length, 0)
    if (x.positionId === null) { aplicar.push({ positionId: null, grupos: x.grupos }); continue }
    let destino = posiciones.find(q => q.id === x.positionId) ?? null
    if (!destino) { const por = posiciones.filter(q => norm(q.nombre) === norm(x.nombre)); destino = por.length === 1 ? por[0] : null }
    if (!destino || usadas.has(destino.id)) { fuera.push({ nombre: x.nombre, items }); continue }
    usadas.add(destino.id); aplicar.push({ positionId: destino.id, grupos: x.grupos })
  }
  return { aplicar, fuera }
}

/** «Empezar con el del domingo pasado»: lo mismo que guardar y aplicar una plantilla (copia los ítems por posición, SIN marcar). */
export const copiarDelDomingoPasado = (vistaPasada: VistaChecklist, posiciones: Posicion[]): AplicacionPlantilla => aplicarPlantilla(plantillaDesdeVista(vistaPasada), posiciones)
