// Textos del selector de vista de Personas (components/PersonasPanel.tsx). En TELÉFONO las dos vistas se llaman «Personas» (la lista de gente) y «Equipos»; el ESCRITORIO conserva «Lista» y «Por equipo»
// hasta que se decida cambiarlos también (pendiente de Claudia: docs/PENDIENTES-code.md).
export const TEXTOS_PERSONAS = {
  comoVer: 'Cómo ver a las personas',
  vistaPersonas: 'Personas',
  vistaEquipos: 'Equipos',
  vistaListaEscritorio: 'Lista',
  vistaPorEquipoEscritorio: 'Por equipo',
  // teléfono: la lista no tiene chips de filtro, solo el buscador
  sinResultadosTitulo: 'No hay nadie con ese nombre',
  sinResultadosAyuda: 'Prueba con otra búsqueda.',
} as const
