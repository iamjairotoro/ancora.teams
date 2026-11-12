// Textos de la lista de Canciones del admin (components/canciones/SongList.tsx) que cambian en TELÉFONO: ahí la lista no tiene chips de filtro, solo el buscador; el escritorio y la tablet conservan
// «Prueba con otro término o cambia el filtro.».
export const TEXTOS_CANCIONES_ADMIN = {
  cargandoLista: 'Cargando las canciones…',
  sinResultadosTitulo: 'Sin resultados',
  sinResultadosAyudaTelefono: 'Prueba con otro término.',
  errorAlGuardar: 'No se pudo guardar la canción. Inténtalo de nuevo.',
  tonoNoValido: 'El tono no es válido. Elige uno de la lista.',
  // La ficha de la canción en teléfono (tablero «Canción · Móvil · Detalle»).
  fichaVolver: 'Canciones',
  fichaEditar: 'Editar',
  fichaSeccionLetra: 'Letra y acordes',
  fichaTono: (tono: string) => `Tono ${tono}`,
  fichaBpm: (bpm: number) => `${bpm} bpm`,
} as const
