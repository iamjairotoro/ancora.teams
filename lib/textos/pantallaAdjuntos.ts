// Textos de la pantalla «Adjuntos» (una sola, la misma en la ficha del administrador y en la lectura del músico).
export const TEXTOS_ADJUNTOS = {
  titulo: (nombre: string) => `Adjuntos – ${nombre}`,
  volver: 'Volver',
  boton: 'Adjuntos',
  botonConConteo: (n: number) => `Adjuntos · ${n}`,
  vacio: 'Aún no hay archivos',
  vacioSubir: 'Sube archivos para comenzar',
} as const
