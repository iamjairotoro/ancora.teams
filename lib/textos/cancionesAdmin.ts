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
  // Borrador y estado vacío (tablero «Ficha admin · Borrador y estado vacío»), solo teléfono: el escritorio conserva los textos de siempre.
  fichaBorradorAyuda: 'Los músicos aún no la ven.',
  fichaVaciaTitulo: 'Esta canción todavía no tiene letra',
  fichaVaciaAyuda: 'Escribe la letra con sus acordes, o sube un archivo para que los músicos la vean.',
  fichaAgregarLetra: 'Agregar letra',
  fichaSubirArchivos: 'Subir archivos',
  // El menú «⋯» como hoja (tablero «Ficha admin · Menú ⋯ como hoja»), solo teléfono: el escritorio conserva su menú de siempre (Editar, Archivar, Eliminar).
  fichaMenuTitulo: (nombre: string) => `Acciones para ${nombre}`,
  fichaMenuCerrar: 'Cerrar',
  fichaMenuEditar: 'Editar datos',
  fichaMenuArchivar: 'Archivar',
  fichaMenuEliminar: 'Eliminar canción',
} as const
