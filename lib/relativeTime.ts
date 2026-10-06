// «Hoy», «Ayer», «Hace 3 días»… desde un instante (p. ej. members.last_seen).
// Cuenta días de calendario locales, no bloques de 24 h: algo de anoche a las
// 23:50 mirado hoy a las 00:10 es «Ayer», no «Hoy».
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

export function relativeSince(ts: string, now: Date = new Date()): string {
  const t = new Date(ts)
  if (Number.isNaN(t.getTime())) return 'Nunca'
  const days = Math.round((startOfDay(now) - startOfDay(t)) / 86400000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  if (days < 35) { const w = Math.round(days / 7); return `Hace ${w} semana${w !== 1 ? 's' : ''}` }
  if (days < 365) { const m = Math.round(days / 30); return `Hace ${m} mes${m !== 1 ? 'es' : ''}` }
  const y = Math.round(days / 365); return `Hace ${y} año${y !== 1 ? 's' : ''}`
}
