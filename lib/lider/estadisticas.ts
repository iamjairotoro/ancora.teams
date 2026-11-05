// «Resumen» del LÍDER (etapa 4): cuántas veces sirvió cada persona de SU equipo y qué tan cubiertas quedaron las posiciones. PURAS, sobre filas ya leídas con la llave de servicio (app/api/lider/estadisticas).
// Reglas (acordadas con Claudia):
//  · «Sirvió» = un servicio YA PASADO (fecha anterior a hoy, America/Santiago) donde la persona tenía una invitación CONFIRMADA en ese equipo Y sigue asignada a una posición de ese equipo en ese servicio.
//    Los pendientes, los declinados, los futuros, el de hoy y quien fue retirado de la posición después de confirmar no cuentan.
//  · «Servicios del período» = servicios pasados del período en que el equipo tuvo al menos una asignación. Los ensayos cuentan igual si tienen asignación (INCLUIR_ENSAYOS).
//  · % cubiertas = cupos cubiertos CON confirmación / cupos pedidos, sumados sobre esos servicios. Sin cupos pedidos no hay porcentaje (null), nunca NaN.
//  · La «última vez» se mira hacia atrás ULTIMOS_DIAS (no solo en el período), y los avisos se calculan aquí, no en la pantalla.
// Cada objeto se arma CAMPO POR CAMPO; no hay teléfono, correo, foto ni nacimiento en ningún tipo de este archivo.

export type Periodo = 'mes' | '3m' | 'anio'
export const PERIODOS: readonly Periodo[] = ['mes', '3m', 'anio']
export const esPeriodo = (v: unknown): v is Periodo => typeof v === 'string' && (PERIODOS as readonly string[]).includes(v)
export const PERIODO_POR_DEFECTO: Periodo = 'mes'
/** Los ensayos cuentan como un servicio más cuando el equipo tuvo asignación en ellos (decisión de Claudia; para excluirlos basta ponerlo en false). */
export const INCLUIR_ENSAYOS = true
export const ULTIMOS_DIAS = 400
export const DIAS_SIN_SERVIR = 42

const ymd = (d: Date) => d.toISOString().slice(0, 10)
const aFecha = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`)
export const restarDias = (hoy: string, dias: number): string => { const d = aFecha(hoy); d.setUTCDate(d.getUTCDate() - dias); return ymd(d) }
export const diasEntre = (desde: string, hasta: string): number => Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / 86400000)

/** Primer día del período (AAAA-MM-DD): mes calendario; «3 meses» = desde el día 1 de hace dos meses; año = desde el 1 de enero. */
export function desdeDelPeriodo(p: Periodo, hoy: string): string {
  const a = Number(hoy.slice(0, 4)), m = Number(hoy.slice(5, 7))
  if (p === 'anio') return `${a}-01-01`
  const d = new Date(Date.UTC(a, m - 1 - (p === '3m' ? 2 : 0), 1))
  return ymd(d)
}

export interface FilasEstadisticas {
  hoy: string
  periodo: Periodo
  servicios: { id: string; fecha: string; tipo?: string | null }[]
  posiciones: { id: string; archived_at?: string | null }[]
  asignaciones: { service_id: string; team_position_id: string; member_id: string | null; slot_index?: number | null }[]
  cupos: { service_id: string; team_position_id: string; slots_needed: number | null }[]
  confirmadas: { service_id: string; member_id: string }[]
  integrantes: { id: string; nombre: string | null; apellido: string | null }[]
}
export interface PersonaResumen { id: string; nombre: string; apellido: string; cantidad: number; ultimaVez: string | null }
export type TipoAviso = 'todos' | 'inactiva'
export interface AvisoResumen { tipo: TipoAviso; personaId: string }
export interface CifrasResumen { servicios: number; personasQueSirvieron: number; cubiertasPct: number | null; personas: PersonaResumen[]; avisos: AvisoResumen[] }

export function armarResumen(f: FilasEstadisticas): CifrasResumen {
  const desde = desdeDelPeriodo(f.periodo, f.hoy)
  const conAsignacion = new Set(f.asignaciones.filter(a => a.member_id).map(a => a.service_id))
  const servicios = f.servicios.filter(s => s.fecha < f.hoy && conAsignacion.has(s.id) && (INCLUIR_ENSAYOS || s.tipo !== 'ensayo'))
  const fechaDe = new Map(servicios.map(s => [s.id, s.fecha.slice(0, 10)] as const))
  const confirmada = new Set(f.confirmadas.map(c => `${c.service_id}|${c.member_id}`))
  const asignada = (servicio: string, persona: string) => f.asignaciones.some(a => a.service_id === servicio && a.member_id === persona)
  const delPeriodo = servicios.filter(s => s.fecha.slice(0, 10) >= desde)

  const personas: PersonaResumen[] = f.integrantes.map(i => {
    let cantidad = 0, ultima: string | null = null
    for (const s of servicios) {
      if (!confirmada.has(`${s.id}|${i.id}`) || !asignada(s.id, i.id)) continue
      const fecha = fechaDe.get(s.id) as string
      if (fecha >= desde) cantidad++
      if (!ultima || fecha > ultima) ultima = fecha
    }
    return { id: i.id, nombre: i.nombre || '', apellido: i.apellido || '', cantidad, ultimaVez: ultima }
  }).sort((a, b) => b.cantidad - a.cantidad || (b.ultimaVez || '').localeCompare(a.ultimaVez || '') || a.nombre.localeCompare(b.nombre, 'es') || a.apellido.localeCompare(b.apellido, 'es'))

  let pedidos = 0, cubiertos = 0
  for (const s of delPeriodo) {
    for (const p of f.posiciones) {
      const delServicio = f.asignaciones.filter(a => a.service_id === s.id && a.team_position_id === p.id && a.member_id)
      if (p.archived_at && delServicio.length === 0) continue
      const cupos = Math.max(1, f.cupos.find(c => c.service_id === s.id && c.team_position_id === p.id)?.slots_needed ?? 1)
      pedidos += cupos
      for (let n = 1; n <= cupos; n++) { const a = delServicio.find(x => (x.slot_index ?? 1) === n); if (a && confirmada.has(`${s.id}|${a.member_id}`)) cubiertos++ }
    }
  }

  const avisos: AvisoResumen[] = []
  for (const p of personas) {
    if (delPeriodo.length >= 2 && p.cantidad === delPeriodo.length) avisos.push({ tipo: 'todos', personaId: p.id })
    if (p.ultimaVez && diasEntre(p.ultimaVez, f.hoy) > DIAS_SIN_SERVIR) avisos.push({ tipo: 'inactiva', personaId: p.id })
  }
  return { servicios: delPeriodo.length, personasQueSirvieron: personas.filter(p => p.cantidad > 0).length, cubiertasPct: pedidos > 0 ? Math.round((cubiertos * 100) / pedidos) : null, personas, avisos }
}
