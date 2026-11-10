// Los códigos de las secciones al GUARDAR (editor de acordes): una sección que ya existe conserva su código aunque el editor genere uno nuevo para el mismo tipo de sección.
// Caso: el editor ahora llama «Inst» a Instrumental y «Tg» a Tag (antes «INT» y «T»). Una sección guardada con el código viejo (INT, T) NO cambia de código al volver a guardar: así no se toca lo que el arreglo y las demás pantallas ya leen,
// y el guardado no pide confirmar un cambio de código que no es un cambio de verdad. El arreglo se enlaza con las secciones por `sectionId` (no por código), pero un cambio de código de una sección del arreglo sigue pidiendo confirmación (lib/resumenGuardado.ts).
export interface CodigoNombre { codigo: string; nombre: string }

// Cada fila: el nombre del tipo, el código VIEJO que se conserva y el código NUEVO que lo reemplazaría. Solo estos pares; cualquier otro cambio de código es un cambio real.
const LEGADOS: { nombre: RegExp; viejo: RegExp; nuevo: RegExp }[] = [
  { nombre: /^\s*instrumental\b/i, viejo: /^INT(?:\d+|-\d+)?$/, nuevo: /^Inst/ },
  { nombre: /^\s*tag\b/i, viejo: /^T(?:\d+|-\d+)?$/, nuevo: /^Tg/ },
]

/** El código que cada sección nueva (en el orden del texto) lleva realmente. `actuales` son las secciones activas guardadas, en orden: la fila `i` se reutiliza para la sección `i` (como hace el guardado). */
export function conservarCodigos(actuales: CodigoNombre[], nuevas: CodigoNombre[]): string[] {
  const salida = nuevas.map(n => n.codigo)
  nuevas.forEach((n, i) => {
    const a = actuales[i]
    if (!a || a.codigo === n.codigo) return
    // el mismo tipo de sección antes y después (por su nombre), con el par de códigos viejo → nuevo
    if (LEGADOS.some(l => l.nombre.test(n.nombre) && l.nombre.test(a.nombre) && l.viejo.test(a.codigo) && l.nuevo.test(n.codigo))) salida[i] = a.codigo
  })
  // dentro de una canción los códigos no se repiten: si conservar uno choca con otro, esa sección usa el nuevo
  nuevas.forEach((n, i) => { if (salida[i] !== n.codigo && salida.filter(x => x === salida[i]).length > 1) salida[i] = n.codigo })
  return salida
}
