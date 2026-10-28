// Menú inferior del teléfono: la pestaña TOCADA pasa a ser la activa de inmediato (estado local de PortalNav) y se mantiene así hasta que la pantalla real lo confirme.
// Sin esto, en la administración «Home» es otra RUTA (router.push): hasta que la página nueva monta, la pestaña real sigue siendo la vieja y la lente se devolvía. Funciones puras (con prueba).
/** Cuánto se espera la confirmación de la ruta; pasado este tiempo, si no llegó, la lente vuelve a la pestaña real. */
export const PENDIENTE_MS = 3000

/** Qué pestaña se dibuja como activa: la pendiente (solo teléfono) o la real. */
export const activoVisible = (real: string, pendiente: string | null, telefono: boolean): string => (telefono && pendiente ? pendiente : real)

/** La pendiente que corresponde al elegir una pestaña: ninguna en escritorio ni al tocar la que ya es la real (quita una pendiente anterior). */
export const pendienteAlElegir = (real: string, elegida: string, telefono: boolean): string | null => (telefono && elegida !== real ? elegida : null)
