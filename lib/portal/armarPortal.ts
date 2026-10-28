// El armador de los datos del portal del músico (punto 54, commit 0). /api/portal/me (sesión) y /api/member-portal (enlace del correo) armaban lo mismo por
// separado y ya habían divergido (columnas del setlist, ensayos, servicios sin convocatoria). Aquí vive UNA lectura —por lotes: un puñado de consultas en total,
// no una por servicio— y dos PROYECCIONES que devuelven a cada ruta exactamente la forma que su pantalla ya conoce:
//   · paraSesion(datos) → services (todos los servicios que no cerraron; los ensayos van dentro; sin convocatoria = tarjeta vacía con `nominaSent`).
//   · paraEnlace(datos) → { services (solo donde la persona tiene asignaciones), ensayos (aparte, con su lista de canciones) }, con la invitación recortada.
// Las pantallas del 54 irán pasando a la forma de sesión; cuando ya nadie lea la del enlace, la proyección paraEnlace se borra. Solo servidor (cliente de servicio).
import type { HerramientaPortal } from '@/lib/portal/panelesServicio'
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SONG_SETLIST_COLUMNS, setlistWithLibrary, setlistWithoutLibrary } from '@/lib/portal/songColumns'
import { libraryAccessOrFalse } from '@/lib/auth/libraryAccess'
import { entradasDeServicio } from '@/lib/portal/convocatorias'
import { convocatoriaCerrada } from '@/lib/convocatoriaCerrada'
import { armarEquipoDelServicio, type Vacante } from '@/lib/portal/equipoServicio'

// La posición con su sección y su equipo (nombre y color): de ahí salen los grupos de «Equipo» (Voces, Banda…). El embed compartido (BANDA_POSICION_EMBED) no se toca: lo usan los correos y la administración.
const BANDA_PORTAL_EMBED = 'team_position:team_positions(name, team_id, sort_order, section:team_sections(name, sort_order), teams(name, color))'

/** Una tarjeta del portal tal como la recibe la pantalla de sesión (/api/portal/me). */
export interface EntradaPortal {
  service: any
  team: { id: string; name: string; color: string | null } | null
  reemplazadaPor: { id: string; name: string } | null
  /** Ausente en la tarjeta vacía (sin convocatoria): así llegaba antes y la pantalla no la lee. */
  cerrada?: boolean
  posiciones: string[]
  invitation: any | null
  banda: any[]
  setlist: any[]
  nominaSent?: boolean
  /** Posiciones del equipo sin nadie («Falta batería»); solo con la convocatoria confirmada, igual que `banda`. */
  vacantes?: Vacante[]
  /** El cronograma del equipo de ESTA tarjeta (service_schedule_items), solo con la convocatoria confirmada. */
  cronograma?: { hora: string | null; texto: string }[]
  /** Las herramientas del equipo de ESTA tarjeta (team_tools, en su orden), solo con la convocatoria confirmada y solo si tiene alguna: de ahí salen las pestañas (lib/portal/panelesServicio.ts). */
  herramientas?: HerramientaPortal[]
}

export interface ServicioArmado {
  entrada: EntradaPortal
  esEnsayo: boolean
  /** La persona tiene alguna asignación (posición) en este servicio. */
  asignado: boolean
}

export interface DatosPortal {
  libraryAccess: boolean
  servicios: ServicioArmado[]
  /** Solo si se pidió (`cancionesDeEnsayo`): los bloques de los ensayos con convocatoria enviada, estén o no confirmados. */
  bloquesDeEnsayo: Map<string, any[]>
}

export interface OpcionesArmado {
  /** Calcula `nominaSent` (alguna convocatoria enviada en el servicio) para la tarjeta vacía: lo usa la pantalla de sesión. */
  conNominaSent?: boolean
  /** Trae las canciones de los ensayos con convocatoria aunque no estén confirmados (el portal por enlace siempre las mostró). */
  cancionesDeEnsayo?: boolean
}

// PostgREST corta cada respuesta en 1000 filas (el tope de Supabase): una lectura por lotes con muchos servicios se truncaría EN SILENCIO. Por eso los servicios
// se leen en lotes de 10 (una consulta por lote, en paralelo: lo habitual es UN lote) y, si alguna respuesta llega justo al tope, ese lote se relee servicio por
// servicio. Sin orden propio: la banda y el setlist salen en el mismo orden natural de siempre (un `order` por id las barajaría).
const TOPE = 1000
const LOTE = 10
// `tamano`: las lecturas de filas chicas (cupos, cronograma) usan lotes más grandes; si una respuesta llega al tope, ese lote se relee servicio por servicio igual.
async function leerPorLotes(ids: string[], armar: (lote: string[]) => any, tamano = LOTE): Promise<any[]> {
  const lotes: string[][] = []
  for (let k = 0; k < ids.length; k += tamano) lotes.push(ids.slice(k, k + tamano))
  const partes = await Promise.all(lotes.map(async lote => {
    const filas: any[] = (await armar(lote)).data || []
    if (filas.length < TOPE) return filas
    return (await Promise.all(lote.map(async id => ((await armar([id])).data || []) as any[]))).flat()
  }))
  return partes.flat()
}

const porServicio = <T extends { service_id?: string }>(filas: T[]): Map<string, T[]> => {
  const m = new Map<string, T[]>()
  for (const f of filas) { const k = f.service_id as string; const l = m.get(k); if (l) l.push(f); else m.set(k, [f]) }
  return m
}

export async function armarPortal(admin: SupabaseClient, memberId: string, o: OpcionesArmado = {}): Promise<DatosPortal> {
  // Punto 59: sin acceso a la biblioteca el setlist solo trae lo del detalle del servicio (ver setlistWithoutLibrary).
  const libraryAccess = await libraryAccessOrFalse(admin, memberId)

  const [{ data: allSvcs }, { data: bandaPropia }, { data: misInvitaciones }] = await Promise.all([
    admin.from('services').select('*').order('fecha', { ascending: true }),
    // Mis asignaciones (con el nombre y el equipo de su posición, por id) y MIS invitaciones (una por servicio y equipo; los ensayos no llevan equipo).
    admin.from('banda_assignments').select('posicion, service_id, team_position:team_positions(name, team_id, teams(name))').eq('member_id', memberId),
    admin.from('invitations').select('*, team:teams(id, name, color)').eq('member_id', memberId),
  ])

  // Un servicio se queda en las listas hasta el cierre de su convocatoria (fin del DÍA en America/Santiago), no hasta su hora de fin: lib/convocatoriaCerrada.ts.
  const vigentes = (allSvcs || []).filter((s: any) => !convocatoriaCerrada(s.fecha))
  const invs = misInvitaciones || [], asignaciones = bandaPropia || []

  // 1) Las tarjetas de cada servicio (puro): UNA por equipo que me convocó (lib/portal/convocatorias.ts).
  const armados = vigentes.map((service: any) => {
    const esEnsayo = service.tipo === 'ensayo'
    const mias = asignaciones.filter((b: any) => b.service_id === service.id)
    const entradas = entradasDeServicio(
      esEnsayo, invs.filter((i: any) => i.service_id === service.id), mias,
      invs,                                      // todas: la convocatoria que desplazó a una puede ser de otro servicio del mismo día
      convocatoriaCerrada(service.fecha),        // pasó el día del servicio (hora de Chile): la pantalla no ofrece botones; la base igual lo rechaza
    )
    return { service, esEnsayo, asignado: mias.length > 0, entradas }
  })

  // 2) Lo que hay que leer, en LOTE: nómina enviada, banda y bloques. Nadie ve banda/setlist hasta confirmar asistencia — si se mandaran siempre, ocultarlos
  //    en la pantalla sería solo cosmético (cualquiera los vería con las devtools). Se leen solo de los servicios con alguna tarjeta confirmada.
  const idsConfirmados = armados.filter(a => a.entradas.some(e => e.invitation?.status === 'confirmado')).map(a => a.service.id as string)
  const idsEnsayoConCanciones = o.cancionesDeEnsayo
    ? armados.filter(a => a.esEnsayo && a.entradas.some(e => e.invitation)).map(a => a.service.id as string) : []
  const idsBloques = Array.from(new Set([...idsConfirmados, ...idsEnsayoConCanciones]))
  const idsNomina = o.conNominaSent ? armados.map(a => a.service.id as string) : []

  const [nominaFilas, bandaFilas, bloquesFilas, invitacionesFilas, cuposFilas, cronogramaFilas] = await Promise.all([
    leerPorLotes(idsNomina, lote => admin.from('invitations').select('service_id').in('service_id', lote).not('sent_at', 'is', null)),
    // La posición y el equipo salen del id (migración 037a): renombrar una posición no rompe nada (lib/bandaPosicion.ts).
    leerPorLotes(idsConfirmados, lote => admin.from('banda_assignments').select(`service_id, posicion, member_id, team_position_id, member:members(nombre,apellido,avatar_url), ${BANDA_PORTAL_EMBED}`).in('service_id', lote)),
    // Columnas explícitas de la canción (no `songs(*)`): ver lib/portal/songColumns.ts.
    leerPorLotes(idsBloques, lote => admin.from('service_blocks').select(`*, song:songs(${SONG_SETLIST_COLUMNS}), lead:members(nombre)`).in('service_id', lote).order('orden')),
    // Equipo (commit 5): quién confirmó (solo se deriva «confirmó» / «sin confirmar»), los cupos pedidos y el cronograma de cada equipo.
    leerPorLotes(idsConfirmados, lote => admin.from('invitations').select('service_id, member_id, team_id, status, needs_reassignment_confirm').in('service_id', lote)),
    leerPorLotes(idsConfirmados, lote => admin.from('service_position_slots').select('service_id, team_position_id, slots_needed').in('service_id', lote), 50),
    leerPorLotes(idsConfirmados, lote => admin.from('service_schedule_items').select('service_id, team_id, hora, texto, sort_order').in('service_id', lote).order('sort_order'), 50),
  ])
  // Las posiciones activas de los equipos que aparecen en esas nóminas (una consulta: son pocas), para saber qué falta.
  const idsEquipos = Array.from(new Set((bandaFilas as any[]).map(f => { const tp = Array.isArray(f.team_position) ? f.team_position[0] : f.team_position; return tp?.team_id as string | undefined }).filter(Boolean))) as string[]
  const posicionesActivas: any[] = idsEquipos.length
    ? ((await admin.from('team_positions').select('id, name, team_id, sort_order, section:team_sections(name, sort_order), teams(name, color)').in('team_id', idsEquipos).is('archived_at', null)).data || []) : []
  // Las herramientas de los equipos de las tarjetas confirmadas (una consulta): de ahí salen las pestañas del detalle. Si falla, el detalle queda con las pestañas de siempre.
  const idsEquiposConfirmados = Array.from(new Set(armados.flatMap(a => a.entradas.filter((e: any) => e.invitation?.status === 'confirmado' && e.team).map((e: any) => e.team.id as string))))
  const herramientasDe = new Map<string, HerramientaPortal[]>()
  if (idsEquiposConfirmados.length) {
    const { data: tools } = await admin.from('team_tools').select('id, team_id, tool_type, label, sort_order').in('team_id', idsEquiposConfirmados).order('sort_order')
    for (const t of (tools || []) as any[]) herramientasDe.set(t.team_id, [...(herramientasDe.get(t.team_id) || []), { id: t.id, tipo: t.tool_type, nombre: t.label ?? null }])
  }
  const conNomina = new Set(nominaFilas.map((r: any) => r.service_id as string))
  const bandaDe = porServicio(bandaFilas as any[])
  const bloquesDe = porServicio(bloquesFilas as any[])
  const invitacionesDe = porServicio(invitacionesFilas as any[]), cuposDe = porServicio(cuposFilas as any[]), cronogramaDe = porServicio(cronogramaFilas as any[])
  // La nómina de cada servicio confirmado, armada una sola vez (la usan todas sus tarjetas confirmadas).
  const equipoDe = new Map<string, ReturnType<typeof armarEquipoDelServicio>>()
  for (const id of idsConfirmados) equipoDe.set(id, armarEquipoDelServicio({ filas: (bandaDe.get(id) || []) as any[], invitaciones: (invitacionesDe.get(id) || []) as any[], posiciones: posicionesActivas, cupos: (cuposDe.get(id) || []) as any[] }))

  // 3) Armar cada tarjeta con lo leído.
  const servicios: ServicioArmado[] = []
  for (const a of armados) {
    const nominaSent = conNomina.has(a.service.id)
    const equipo = equipoDe.get(a.service.id)
    const cronogramaServicio = cronogramaDe.get(a.service.id) || []
    const bloques = bloquesDe.get(a.service.id) || []
    for (const e of a.entradas) {
      // Mientras el admin no presione «Notificar», esta persona no debe ni enterarse de que existe esta convocatoria.
      if (!e.invitation) {
        servicios.push({ esEnsayo: a.esEnsayo, asignado: a.asignado, entrada: { service: a.service, team: null, reemplazadaPor: null, posiciones: [], invitation: null, banda: [], setlist: [], ...(o.conNominaSent ? { nominaSent } : {}) } })
        continue
      }
      const { team: _t, ...invitation } = e.invitation as any
      const canSeeDetails = invitation.status === 'confirmado'
      servicios.push({
        esEnsayo: a.esEnsayo, asignado: a.asignado,
        entrada: {
          service: a.service, team: e.team, reemplazadaPor: e.reemplazadaPor,      // «Declinada · aceptaste en {equipo}»
          cerrada: e.cerrada, posiciones: e.posiciones, invitation,
          banda: canSeeDetails && equipo ? equipo.banda : [],
          ...(canSeeDetails && equipo ? {
            vacantes: equipo.vacantes,
            cronograma: e.team ? cronogramaServicio.filter((c: any) => c.team_id === e.team!.id).map((c: any) => ({ hora: c.hora ?? null, texto: c.texto })) : [],
          } : {}),
          ...(canSeeDetails && e.team && herramientasDe.get(e.team.id)?.length ? { herramientas: herramientasDe.get(e.team.id) } : {}),
          setlist: canSeeDetails ? (libraryAccess ? setlistWithLibrary(bloques, memberId) : setlistWithoutLibrary(bloques, memberId)) : [],
          ...(o.conNominaSent ? { nominaSent } : {}),
        },
      })
    }
  }

  const bloquesDeEnsayo = new Map<string, any[]>()
  for (const id of idsEnsayoConCanciones) bloquesDeEnsayo.set(id, bloquesDe.get(id) || [])
  return { libraryAccess, servicios, bloquesDeEnsayo }
}

/** La forma de /api/portal/me: todas las tarjetas, ensayos incluidos. */
export const paraSesion = (d: DatosPortal): EntradaPortal[] => d.servicios.map(s => s.entrada)

const porFecha = (a: { service: { fecha: string } }, b: { service: { fecha: string } }) => a.service.fecha.localeCompare(b.service.fecha)

/** La forma de /api/member-portal: servicios donde la persona tiene asignaciones y los ensayos aparte; la invitación va recortada (no se ensancha lo que ve). */
export function paraEnlace(d: DatosPortal) {
  const services = d.servicios.filter(s => !s.esEnsayo && s.asignado && s.entrada.invitation).map(s => {
    const e = s.entrada, i = e.invitation
    return {
      service: e.service, team: e.team, reemplazadaPor: e.reemplazadaPor, cerrada: e.cerrada, posiciones: e.posiciones,
      invitation: { id: i.id, status: i.status, comentario: i.comentario, token: i.token, sent_at: i.sent_at, needs_reassignment_confirm: i.needs_reassignment_confirm, declined_reason: i.declined_reason ?? null },
      setlist: e.setlist, banda: e.banda, vacantes: e.vacantes, cronograma: e.cronograma,
    }
  }).sort(porFecha)
  const ensayos = d.servicios.filter(s => s.esEnsayo && s.entrada.invitation).map(s => {
    const e = s.entrada, i = e.invitation
    return {
      service: e.service, posiciones: [] as string[],
      invitation: { status: i.status, comentario: i.comentario, token: i.token, sent_at: i.sent_at },
      cerrada: e.cerrada,
      // las canciones del ensayo, estén o no confirmadas (así lo mostró siempre el portal por enlace)
      setlist: (d.bloquesDeEnsayo.get(e.service.id) || []).filter((b: any) => b.tipo === 'cancion').map((b: any) => ({ orden: b.orden, song: b.song ? { nombre: b.song.nombre, artista: b.song.artista } : null })),
      banda: [] as any[],
    }
  }).sort(porFecha)
  return { services, ensayos }
}
