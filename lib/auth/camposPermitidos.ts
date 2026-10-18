// Listas blancas de columnas para las rutas que escriben con la llave de servicio (punto 50, paso 0a). El cuerpo de la petición NUNCA se pasa tal cual a un update/insert: se aceptan solo las columnas de la lista.
// Una clave que NO está en la lista no se ignora en silencio (eso rompería una pantalla sin que nadie se entere): la ruta responde 400 y dice cuáles claves rechazó.
export interface ResultadoCampos { datos: Record<string, unknown>; rechazados: string[] }

export function soloPermitidos(cuerpo: unknown, permitidos: readonly string[]): ResultadoCampos {
  const datos: Record<string, unknown> = {}, rechazados: string[] = []
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return { datos, rechazados: ['(cuerpo)'] }
  for (const [k, v] of Object.entries(cuerpo as Record<string, unknown>)) {
    if (permitidos.includes(k)) datos[k] = v
    else rechazados.push(k)
  }
  return { datos, rechazados }
}
