// Si los bloqueos del portal NO cargaron, la pantalla no debe dibujarse como si no hubiera ninguno (punto 54, ajuste tras el commit 7). Puro, sin acceso a datos.
//   · 'cargando' → todavía no hubo respuesta; 'ok' → hay datos; 'error' → nunca cargaron.
//   · Una recarga que falla DESPUÉS de haber cargado bien (p. ej. tras guardar) deja lo que ya había: el estado solo pasa a 'error' si nunca hubo datos.
//   · Mientras no cargaron: Disponibilidad muestra el aviso con «Reintentar» (sin calendario ni forma de bloquear) y Servicios no marca ningún día como bloqueado (no dice nada, en vez de mostrarlo libre).
export type EstadoBloqueos = 'cargando' | 'ok' | 'error'

export const estadoTras = (previo: EstadoBloqueos, cargo: boolean): EstadoBloqueos => (cargo ? 'ok' : previo === 'ok' ? 'ok' : 'error')

const NINGUNO: ReadonlySet<string> = new Set()
export const diasParaMostrar = (estado: EstadoBloqueos, dias: ReadonlySet<string>): ReadonlySet<string> => (estado === 'ok' ? dias : NINGUNO)
