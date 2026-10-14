// Escapa texto para meterlo dentro de un correo en HTML (p. ej. el nombre de un equipo, que escribe quien administra).
export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
