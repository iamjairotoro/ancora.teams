// El ícono de cada herramienta (carrusel del equipo y pie de las tarjetas): solo ícono y nombre, nunca un resumen de su contenido.
import { Clock, FileText, ListChecks, ListMusic } from 'lucide-react'
import type { ToolType } from '@/lib/types'

export function IconoHerramienta({ tipo, size = 18 }: { tipo: ToolType; size?: number }) {
  const p = { size, 'aria-hidden': true as const }
  return tipo === 'setlist' ? <ListMusic {...p} /> : tipo === 'schedule' ? <Clock {...p} /> : tipo === 'checklist' ? <ListChecks {...p} /> : <FileText {...p} />
}
