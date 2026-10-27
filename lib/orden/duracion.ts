// Duración de un bloque del Orden: «m:ss» ↔ segundos. Antes vivía dentro de components/OrdenDelServicio.tsx; se sacó SIN cambiarla para que la use también la hoja de teléfono.
export function toMMSS(secs: number): string {
  if (!secs) return '—'
  const m = Math.floor(secs / 60), s = Math.round(secs % 60)
  return `${m}:${s.toString().padStart(2,'0')}`
}
export function fromMMSS(val: string): number {
  if (!val) return 0
  if (val.includes(':')) { const [m,s]=val.split(':').map(Number); return (m||0)*60+(s||0) }
  return parseFloat(val)*60
}
