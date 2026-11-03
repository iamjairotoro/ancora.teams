// El ÚNICO lugar del navegador que escribe por las rutas del líder (/api/lider/*). Solo lo importan los componentes de SU equipo: el bloque de un equipo ajeno no lo importa ni recibe ninguna función de acción.
export type Resultado = { ok: true; id?: string | null } | { ok: false; error: string }

export async function enviar(ruta: 'asignar' | 'cupos' | 'horario' | 'notas' | 'equipo' | 'herramientas', cuerpo: Record<string, unknown>): Promise<Resultado> {
  try {
    const r = await fetch(`/api/lider/${ruta}`, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
    const d = await r.json().catch(() => null)
    if (r.ok && d && d.ok) return { ok: true, id: d.id ?? null }
    return { ok: false, error: (d && typeof d.error === 'string' && d.error) || 'No se pudo guardar el cambio. Inténtalo de nuevo.' }
  } catch { return { ok: false, error: 'No se pudo guardar el cambio. Inténtalo de nuevo.' } }
}
