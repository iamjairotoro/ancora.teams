// Lee en lotes lo que depende de una lista larga de ids (`in(...)` con cientos de ids revienta el largo de la URL de PostgREST). Lanza si un lote falla: un resumen incompleto no se entrega como si estuviera completo.
export async function leerPorLotes<T = Record<string, unknown>>(ids: string[], consulta: (lote: string[]) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>, tamano = 100): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < ids.length; i += tamano) {
    const { data, error } = await consulta(ids.slice(i, i + tamano))
    if (error) throw new Error(error.message)
    out.push(...((data ?? []) as T[]))
  }
  return out
}
