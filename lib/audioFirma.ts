// Firmado del audio propio con re-firmado automático (punto 55, paso 4; lo usa el reproductor flotante del paso 5). La URL firmada del audio
// dura 60 minutos (POST /api/portal/cancion/firmar). Se pide AL DAR PLAY (nunca al cargar la pantalla) y se reutiliza mientras le quede
// margen; si el <audio> falla a mitad de la reproducción (la firma venció, o la red se cortó) se firma de nuevo UNA vez y el reproductor
// retoma donde estaba. Si vuelve a fallar enseguida, se rinde (sin bucles). Pura: sin DOM ni red propios; `firmar` y el reloj se inyectan.

/** Si a la URL le queda menos que esto, se pide una nueva antes de dar play. */
export const MARGEN_RENOVAR_MS = 60_000
/** Un nuevo fallo antes de que pase este tiempo desde el último re-firmado NO se vuelve a firmar. */
export const ESPERA_ENTRE_REFIRMAS_MS = 20_000

export interface RespuestaFirma { url: string; expiraEnSeg: number }
export type TrasFallo = { accion: 'refirmar'; url: string } | { accion: 'rendirse' }

export function crearFirmadorAudio(opciones: { firmar: () => Promise<RespuestaFirma>; ahora?: () => number }) {
  const ahora = opciones.ahora ?? Date.now
  let actual: { url: string; venceEn: number } | null = null
  let pendiente: Promise<{ url: string; venceEn: number }> | null = null
  let ultimaRefirma = -Infinity

  // Varias llamadas a la vez comparten UNA sola petición de firma.
  function pedir() {
    if (!pendiente) {
      pendiente = opciones.firmar()
        .then(r => (actual = { url: r.url, venceEn: ahora() + r.expiraEnSeg * 1000 }))
        .finally(() => { pendiente = null })
    }
    return pendiente
  }

  return {
    /** La URL para dar play: la que ya hay si le queda margen; si no, una nueva. Lanza si no se pudo firmar. */
    async urlVigente(): Promise<string> {
      if (actual && actual.venceEn - ahora() > MARGEN_RENOVAR_MS) return actual.url
      return (await pedir()).url
    },
    /** El audio falló a mitad: ¿se re-firma? Una vez por episodio. Nunca lanza. */
    async trasFallo(): Promise<TrasFallo> {
      const t = ahora()
      if (t - ultimaRefirma < ESPERA_ENTRE_REFIRMAS_MS) return { accion: 'rendirse' }
      ultimaRefirma = t
      actual = null                                       // la firma que había ya no sirve
      try { return { accion: 'refirmar', url: (await pedir()).url } } catch { return { accion: 'rendirse' } }
    },
    /** Al cerrar el reproductor: no se guarda nada. */
    olvidar() { actual = null },
  }
}
