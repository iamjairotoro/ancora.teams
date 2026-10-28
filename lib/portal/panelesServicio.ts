// Las pestañas del detalle de un servicio para el músico, según las herramientas de SU equipo (puro, con pruebas). El servidor manda `herramientas` (team_tools del equipo, en su orden) solo con la convocatoria confirmada.
//  · Equipo SIN herramienta de checklist: lo de siempre → Orden · Equipo · Mi cronograma, abre en Orden (nada cambia para esos equipos).
//  · Equipo CON checklist: la herramienta del equipo primero, en el orden de sus herramientas: «Orden» solo si el equipo tiene la de setlist; el checklist con su nombre («Montaje»); y siempre Equipo y Mi cronograma.
//    Abre en la primera herramienta del equipo (Producción en su checklist, Alabanza en Orden).
export type PanelServicio = 'orden' | 'equipo' | 'cronograma' | `checklist:${string}`
export interface HerramientaPortal { id: string; tipo: string; nombre: string | null }
export interface OpcionPanel { valor: PanelServicio; texto: string }

const BASE: OpcionPanel[] = [{ valor: 'orden', texto: 'Orden' }, { valor: 'equipo', texto: 'Equipo' }, { valor: 'cronograma', texto: 'Mi cronograma' }]

export const idDeChecklist = (p: PanelServicio): string | null => (p.startsWith('checklist:') ? p.slice('checklist:'.length) : null)

export function panelesDelServicio(herramientas: HerramientaPortal[] | undefined | null): OpcionPanel[] {
  const hs = herramientas ?? []
  if (!hs.some(h => h.tipo === 'checklist')) return BASE
  const propias: OpcionPanel[] = []
  for (const h of hs) {
    if (h.tipo === 'setlist' && !propias.some(o => o.valor === 'orden')) propias.push({ valor: 'orden', texto: 'Orden' })
    else if (h.tipo === 'checklist') propias.push({ valor: `checklist:${h.id}`, texto: h.nombre?.trim() || 'Checklist' })
  }
  return [...propias, { valor: 'equipo', texto: 'Equipo' }, { valor: 'cronograma', texto: 'Mi cronograma' }]
}

/** La pestaña con la que abre: la primera herramienta del equipo (o Orden, como siempre). */
export const panelInicial = (herramientas: HerramientaPortal[] | undefined | null): PanelServicio => panelesDelServicio(herramientas)[0].valor

/** Si el panel guardado ya no existe entre las opciones (otro equipo, otra tarjeta), cae en la primera. */
export const panelEfectivo = (panel: PanelServicio, opciones: OpcionPanel[]): PanelServicio => (opciones.some(o => o.valor === panel) ? panel : opciones[0].valor)
