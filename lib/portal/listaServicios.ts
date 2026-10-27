// La lista de Servicios del portal en teléfono (mockup Lista-Usuario): UNA FILA POR SERVICIO, no una por equipo ni por día. Cada fila trae el día, el nombre, el horario, los cuadritos de los equipos que TE convocaron
// y UN estado (el que más importa: «Por responder» pesa más que «Confirmada»). Las notas del día (cruce de equipos) y el aviso de día bloqueado se cuelgan de la primera fila de ese día. PURAS, sin datos ni servidor.
// Reglas: nunca un porcentaje individual y nunca quién rechazó: solo TU respuesta.
import { estadoConvocatoria, textoDeclinadaPersona, type EstadoConvocatoria } from '@/lib/convocatoriaEstado'
import { agruparPorDia, horarioTexto, type NotaDia } from '@/lib/portal/agruparServicios'
import { nombreDeServicio } from '@/lib/admin/nombreDeServicio'
import { MESES_CORTOS } from '@/lib/home/formato'
import { TEXTOS_SERVICIOS_PORTAL as T } from '@/lib/textos/serviciosPortal'

export interface EntradaFila {
  service: { id: string; fecha: string; tipo?: string; titulo?: string; hora_inicio?: string | null; hora_fin?: string | null; lugar?: string }
  team?: { id: string; name: string; color?: string | null } | null
  invitation: { status: string; declined_reason?: string | null; needs_reassignment_confirm?: boolean } | null
  posiciones?: string[]
  reemplazadaPor?: { id: string; name: string } | null
  cerrada?: boolean
  nominaSent?: boolean
}
export interface CuadritoPortal { teamId: string; nombre: string; color: string | null; inicial: string }
export interface FilaPortal {
  servicioId: string
  fecha: string
  diaSemana: string
  dia: string
  mes: string
  cuando: string
  nombre: string
  horario: string
  equipos: CuadritoPortal[]
  estado: string
  /** Pide una respuesta de la persona (ámbar). */
  ambar: boolean
  /** Hay una convocatoria sin responder y todavía abierta: la ficha grande lleva el botón «Responder». */
  responder: boolean
  /** «Voces · Teclado»: las posiciones de TU convocatoria (la que pide respuesta, si la hay). Vacío si no hay. */
  posicion: string
  /** El equipo que se abre (el de la convocatoria que más importa); null si no hay convocatoria. */
  equipoId: string | null
  color: string | null
  nota: NotaDia | null
  bloqueado: boolean
}

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const minutos = (h?: string | null): number => { const m = /^(\d{1,2}):(\d{2})/.exec(h || ''); return m ? +m[1] * 60 + +m[2] : 600 }

type Vista = EstadoConvocatoria | 'cambio-de-rol'
const vistaDe = (e: EntradaFila): Vista | null => { const est = estadoConvocatoria(e.invitation); return est === 'confirmado' && e.invitation?.needs_reassignment_confirm ? 'cambio-de-rol' : est }
/** Qué convocatoria manda en la fila: la que pide respuesta, luego el cambio de rol, la confirmada, y el resto. */
const PESO: Record<Vista, number> = { pendiente: 0, 'cambio-de-rol': 1, confirmado: 2, rechazo: 3, 'otro-equipo': 4 }

function estadoDe(e: EntradaFila, vista: Vista | null, esEnsayo: boolean): { texto: string; ambar: boolean } {
  switch (vista) {
    case 'pendiente': return e.cerrada ? { texto: T.noRespondiste, ambar: false } : { texto: T.porResponder, ambar: true }
    case 'cambio-de-rol': return { texto: T.rolCambio, ambar: true }
    case 'confirmado': return { texto: T.confirmada, ambar: false }
    case 'rechazo': return { texto: T.dijisteQueNo, ambar: false }
    case 'otro-equipo': return { texto: textoDeclinadaPersona(e.reemplazadaPor?.name), ambar: false }
    default: return { texto: esEnsayo || e.nominaSent ? T.noConvocado : T.nominacionPendiente, ambar: false }
  }
}

export function filasDeServicios(entradas: EntradaFila[], bloqueados: ReadonlySet<string> = new Set()): FilaPortal[] {
  const porServicio = new Map<string, EntradaFila[]>()
  for (const e of entradas) { const l = porServicio.get(e.service.id); if (l) l.push(e); else porServicio.set(e.service.id, [e]) }
  const notas = new Map<string, NotaDia | null>(agruparPorDia(entradas.filter((e): e is EntradaFila & { team: { id: string; name: string } } => !!e.team), bloqueados).map(g => [g.fecha, g.nota]))
  const filas = Array.from(porServicio.values()).map(delServicio => {
    const s = delServicio[0].service
    const conVista = delServicio.map(e => ({ e, v: vistaDe(e) })).filter((x): x is { e: EntradaFila; v: Vista } => x.v !== null && !!x.e.team)
    const orden = [...conVista].sort((a, b) => PESO[a.v] - PESO[b.v] || a.e.team!.name.localeCompare(b.e.team!.name, 'es', { sensitivity: 'base' }))
    const rep = orden[0] ?? null
    // «Tu posición»: con varias convocatorias sin responder (convocado a dos equipos: «Bass · Sonido»), las de todas; si no, las de la que manda (la confirmada, por ejemplo).
    const pendientes = orden.filter(x => x.v === 'pendiente')
    const [a, m, d] = s.fecha.split('-').map(Number), dow = new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay()
    const vistos = new Set<string>(), equipos: CuadritoPortal[] = []
    for (const { e } of [...conVista].sort((x, y) => x.e.team!.name.localeCompare(y.e.team!.name, 'es', { sensitivity: 'base' }))) {
      if (vistos.has(e.team!.id)) continue; vistos.add(e.team!.id)
      equipos.push({ teamId: e.team!.id, nombre: e.team!.name, color: e.team!.color ?? null, inicial: (e.team!.name.trim()[0] || '?').toLocaleUpperCase('es') })
    }
    const est = estadoDe(rep ? rep.e : delServicio[0], rep ? rep.v : null, s.tipo === 'ensayo')
    return {
      servicioId: s.id, fecha: s.fecha, diaSemana: DIAS_CORTOS[dow], dia: String(d), mes: MESES_CORTOS[m - 1], cuando: `${DIAS[dow]} ${d} de ${MESES[m - 1]}`,
      nombre: nombreDeServicio({ titulo: s.titulo ?? '', tipo: s.tipo === 'ensayo' ? 'ensayo' : 'servicio' }), horario: (horarioTexto(s.hora_inicio, s.hora_fin) ?? '').replace(' — ', ' – '),
      equipos, estado: est.texto, ambar: est.ambar, responder: !!rep && rep.v === 'pendiente' && !rep.e.cerrada,
      posicion: Array.from(new Set((pendientes.length ? pendientes : rep ? [rep] : []).flatMap(x => x.e.posiciones ?? []))).join(' · '), equipoId: rep ? rep.e.team!.id : null, color: rep ? rep.e.team!.color ?? null : null,
      nota: null as NotaDia | null, bloqueado: false, inicio: minutos(s.hora_inicio),
    }
  })
  filas.sort((x, y) => x.fecha.localeCompare(y.fecha) || x.inicio - y.inicio || x.nombre.localeCompare(y.nombre, 'es', { sensitivity: 'base' }))
  const vistoDia = new Set<string>()
  return filas.map(({ inicio: _i, ...f }) => {
    const primera = !vistoDia.has(f.fecha); vistoDia.add(f.fecha)
    return primera ? { ...f, nota: notas.get(f.fecha) ?? null, bloqueado: bloqueados.has(f.fecha) } : f
  })
}
