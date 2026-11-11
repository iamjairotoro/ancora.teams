// Canciones en borrador (migración 056: songs.publicada, por defecto true). Solo el flujo «Nueva canción» del teléfono crea una con publicada = false; todo lo demás nace y queda publicado.
// Un borrador lo ve el administrador (panel Canciones, con la etiqueta «Borrador»); NO lo ven los músicos (catálogo, ficha) ni se ofrece al armar un setlist.
// Una canción sin la columna (base sin migrar) o con publicada = null cuenta como publicada: el filtro nunca esconde algo por falta del dato.
export const esBorrador = (s: { publicada?: boolean | null } | null | undefined): boolean => !!s && s.publicada === false
export function soloPublicadas<T extends { publicada?: boolean | null }>(canciones: T[]): T[] { return canciones.filter(s => !esBorrador(s)) }
