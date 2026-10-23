// Los cumpleaños de los compañeros de equipo para el Inicio del portal (punto 54, commit 7). PURO, sin acceso a datos: recibe las filas ya filtradas (solo quienes comparten un equipo con la persona) y devuelve lo
// que VIAJA al portal: solo el DÍA y el MES (nunca el año ni la edad), hasta 4, los más próximos dentro de una ventana de 30 días, contados con el día de Chile. `enDias` = 0 es «Hoy». El 29 de febrero
// cae el 28 en los años que no son bisiestos.
export interface FilaCumple { id: string; nombre: string; apellido?: string | null; avatar_url?: string | null; fecha_nacimiento?: string | null }
export interface Cumple { id: string; nombre: string; apellido: string | null; avatar_url: string | null; dia: number; mes: number; enDias: number }

const bisiesto = (a: number) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0
const utc = (a: number, m: number, d: number) => Date.UTC(a, m - 1, d)

export function proximosCumpleanos(filas: FilaCumple[], hoy: string, o: { limite?: number; ventana?: number } = {}): Cumple[] {
  const limite = o.limite ?? 4, ventana = o.ventana ?? 30
  const h = /^(\d{4})-(\d{2})-(\d{2})$/.exec(hoy); if (!h) return []
  const ay = +h[1], hoyMs = utc(ay, +h[2], +h[3])
  const out: Cumple[] = []
  for (const f of filas) {
    const m = /^\d{4}-(\d{2})-(\d{2})/.exec(f.fecha_nacimiento || ''); if (!m) continue
    const mes = +m[1], dia = +m[2]; if (mes < 1 || mes > 12 || dia < 1 || dia > 31) continue
    const al = (anio: number) => (mes === 2 && dia === 29 && !bisiesto(anio) ? { mes: 2, dia: 28 } : { mes, dia })
    let t = al(ay), ms = utc(ay, t.mes, t.dia)
    if (ms < hoyMs) { t = al(ay + 1); ms = utc(ay + 1, t.mes, t.dia) }
    const enDias = Math.round((ms - hoyMs) / 86400000)
    if (enDias > ventana) continue
    out.push({ id: f.id, nombre: f.nombre, apellido: f.apellido ?? null, avatar_url: f.avatar_url ?? null, dia: t.dia, mes: t.mes, enDias })
  }
  return out.sort((a, b) => a.enDias - b.enDias || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })).slice(0, limite)
}

/** Los cumpleaños que caen en los días dados (la semana que muestra el calendario): solo si hay alguno; día y mes, nunca el año. `dias` son fechas AAAA-MM-DD. */
export function cumpleanosDeLaSemana(cumples: Cumple[], dias: string[]): Cumple[] {
  const claves = new Set(dias.map(f => `${+f.slice(5, 7)}-${+f.slice(8, 10)}`))
  return cumples.filter(c => claves.has(`${c.mes}-${c.dia}`))
}
