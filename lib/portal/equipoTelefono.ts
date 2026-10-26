// El Equipo del servicio para el músico EN TELÉFONO (mockup Portal-Equipo-A). Lógica pura sobre lo que ya arma agruparEquipo (sin datos ni servidor):
//   · dentro de cada equipo, las secciones van «Banda», «Voces» y lo demás; «Otros» al final (las demás secciones conservan su orden de siempre entre Voces y Otros);
//   · en la vista del usuario NO se muestran las posiciones sin nadie (las vacantes); la administración sigue viéndolas (no pasa por aquí);
//   · el equipo (o equipos) de la persona va primero y abierto; los demás, cerrados con «N personas». Si la persona no está en ninguno, se abre el primero.
// Los conteos de confirmados NO se tocan: aquí no se cuenta quién confirmó (esa regla vive en lib/admin/estadoEquipoServicio); «N personas» cuenta personas distintas, sin vacantes.
import type { EquipoAgrupado, FilaPersona, GrupoEquipo } from '@/lib/portal/equipoServicio'

export interface GrupoTelefono { titulo: string | null; mezcla: boolean; filas: FilaPersona[] }
export interface EquipoTelefono { team: EquipoAgrupado['team']; abierto: boolean; esMio: boolean; personas: number; grupos: GrupoTelefono[] }

const rango = (titulo: string | null): number => {
  const t = (titulo ?? '').trim().toLocaleLowerCase('es')
  return t === 'banda' ? 0 : t === 'voces' ? 1 : t === 'otros' ? 3 : 2
}

export function vistaEquipoTelefono(equipos: EquipoAgrupado[]): EquipoTelefono[] {
  const armados = equipos.map(eq => {
    const grupos = eq.grupos.map((g: GrupoEquipo, i) => ({ g, i }))
      .map(({ g, i }) => ({ i, titulo: g.titulo, mezcla: g.mezcla, filas: g.filas.filter((f): f is FilaPersona => f.tipo === 'persona') }))
      .filter(g => g.filas.length > 0)
      .sort((a, b) => rango(a.titulo) - rango(b.titulo) || a.i - b.i)
      .map(({ titulo, mezcla, filas }) => ({ titulo, mezcla, filas }))
    const ids = new Set<string>(); let sinId = 0
    for (const g of grupos) for (const f of g.filas) { if (f.memberId) ids.add(f.memberId); else sinId++ }
    return { team: eq.team, esMio: grupos.some(g => g.filas.some(f => f.esYo)), personas: ids.size + sinId, grupos }
  })
  const orden = [...armados.filter(e => e.esMio), ...armados.filter(e => !e.esMio)]
  const hayMio = orden.some(e => e.esMio)
  return orden.map((e, i) => ({ ...e, abierto: hayMio ? e.esMio : i === 0 }))
}
