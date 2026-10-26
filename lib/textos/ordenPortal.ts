// Textos del Orden del servicio en teléfono (app/portal/_components/servicio/OrdenServicioTelefono.tsx).
export const TEXTOS_ORDEN_PORTAL = {
  lidera: 'Lidera',
  liderasTu: 'Lideras tú',
  vacio: 'Aún no hay canciones.',
} as const
export const textoTono = (t: string): string => `Tono ${t}`
export const textoBpmChip = (b: string): string => `${b} BPM`
export const textoMinutos = (m: number): string => `${m} min`
export const abrirCancionOrden = (nombre: string): string => `Abrir ${nombre}`
