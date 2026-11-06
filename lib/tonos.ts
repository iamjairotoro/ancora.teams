// Los tonos que acepta la app: una sola fuente para los selectores (Canciones y Orden del servicio), la ruta /api/service-blocks y la base. Mayores y menores, escritos como siempre: letra A–G, sostenido «#» o bemol «b» y una «m»
// si es menor (Bb, F#, Am, C#m). El formato es el MISMO de las restricciones de la base (migrations/054b-restricciones-de-tono.sql: songs.tono_original y service_blocks.tono), así que lo que pasa aquí no lo rechaza la base.
// Vacío («sin tono») es válido. Mayúsculas y sin espacios: «sol», «Sol», «G/A» o « C» no son tonos.
export const TONOS_MAYORES = ['A', 'A#', 'Bb', 'B', 'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab'] as const
export const TONOS_MENORES = TONOS_MAYORES.map(n => `${n}m`) as readonly string[]
/** Mayores y luego menores, en el orden de los selectores. */
export const TONOS: readonly string[] = [...TONOS_MAYORES, ...TONOS_MENORES]
export const TONO_FORMATO = /^([A-G][#b]?m?)?$/
/** true si es un texto con el formato de tono (o vacío). null y undefined no son texto: quien los admita debe comprobarlo antes. */
export const esTonoValido = (v: unknown): v is string => typeof v === 'string' && TONO_FORMATO.test(v)
