// Lógica PURA del visor de PDF del portal (punto 55, commit 3): límites, zoom, páginas visibles y la descarga con UN solo re-firmado.
// Sin DOM ni pdf.js: se prueba aparte (VisorPdf.tsx la usa). Solo navegador y servidor por igual; no importa nada de servidor.

/** Más de esto no se abre en la app: solo la salida ↗ al visor del teléfono. */
export const MAX_PDF_EN_APP_BYTES = 30 * 1024 * 1024
/** Tope del lienzo de UNA página, en píxeles (Safari de iOS limita el lienzo a ~16 millones; se deja margen). */
export const MAX_PIXELES_LIENZO = 12_000_000
export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 4
/** Pasos de los botones − y +. */
export const PASO_ZOOM = 1.25
/** Doble toque: de ajustado (1×) a este zoom, y de vuelta a 1× si ya está ampliado más de UMBRAL_DOBLE_TOQUE. */
export const ZOOM_DOBLE_TOQUE = 2.4
export const UMBRAL_DOBLE_TOQUE = 1.3

export const limitarZoom = (z: number): number => (Number.isFinite(z) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) : 1)

export const pesaDemasiado = (bytes: number | null | undefined): boolean => typeof bytes === 'number' && bytes > MAX_PDF_EN_APP_BYTES

/**
 * Factor de píxeles por píxel CSS con el que se dibuja una página: lo que pida la pantalla (dpr, hasta 3) pero sin pasar del tope
 * de píxeles del lienzo. A mucho zoom la página sale menos nítida en vez de fallar o agotar la memoria.
 */
export function escalaDeLienzo(anchoCss: number, altoCss: number, dpr: number, maxPixeles = MAX_PIXELES_LIENZO): number {
  const pedido = Math.min(3, Math.max(1, Number.isFinite(dpr) ? dpr : 1))
  const area = Math.max(1, anchoCss * altoCss)
  const tope = Math.sqrt(maxPixeles / area)
  return Math.max(0.25, Math.min(pedido, tope))
}

/** Zoom resultante de un pellizco: el zoom de partida por la razón entre la distancia actual y la inicial, dentro de los límites. */
export const zoomTrasPellizco = (z0: number, d0: number, d1: number): number => limitarZoom(d0 > 0 ? z0 * (d1 / d0) : z0)

/** Zoom de un botón (+ / −) o de Ctrl+rueda: multiplica y limita. */
export const zoomPorFactor = (z: number, factor: number): number => limitarZoom(z * factor)

/** Zoom del doble toque / doble clic. */
export const zoomDobleToque = (z: number): number => (z > UMBRAL_DOBLE_TOQUE ? 1 : ZOOM_DOBLE_TOQUE)

/** Desplazamiento (scrollLeft o scrollTop) que deja el punto `foco` (px dentro de la ventana) donde estaba al pasar de zoom z0 a z1. */
export const desplazamientoTrasZoom = (scroll: number, foco: number, z0: number, z1: number): number =>
  Math.max(0, (scroll + foco) * (z1 / (z0 || 1)) - foco)

/**
 * Páginas a tener dibujadas: las que cruzan la ventana (scrollTop..scrollTop+alto) más `margen` píxeles a cada lado. `tops` y
 * `alturas` son la posición y el alto de cada página dentro del área desplazable. Devuelve índices, de menor a mayor.
 */
export function paginasVisibles(tops: number[], alturas: number[], scrollTop: number, alto: number, margen: number): number[] {
  const desde = scrollTop - margen, hasta = scrollTop + alto + margen
  const out: number[] = []
  for (let i = 0; i < tops.length; i++) if (tops[i] + alturas[i] >= desde && tops[i] <= hasta) out.push(i)
  return out
}

/** La página «actual»: la que ocupa el centro de la ventana (la más cercana si el centro cae entre dos). */
export function paginaActual(tops: number[], alturas: number[], scrollTop: number, alto: number): number {
  const centro = scrollTop + alto / 2
  let mejor = 0, dist = Infinity
  for (let i = 0; i < tops.length; i++) {
    const d = Math.abs(tops[i] + alturas[i] / 2 - centro)
    if (d < dist) { dist = d; mejor = i }
  }
  return mejor
}

export type CodigoErrorVisor = 'red' | 'vencida' | 'no_existe' | 'http' | 'grande'
export class ErrorVisor extends Error {
  constructor(public codigo: CodigoErrorVisor, mensaje?: string) { super(mensaje || codigo); this.name = 'ErrorVisor' }
}

/** Lo mínimo de una respuesta de fetch que se usa (las pruebas inyectan una falsa). */
export interface RespuestaDescarga {
  ok: boolean
  status: number
  headers: { get(nombre: string): string | null }
  body?: { getReader(): { read(): Promise<{ done: boolean; value?: Uint8Array }>; cancel(): Promise<void> | void } } | null
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface OpcionesDescarga {
  /** Pide una URL firmada NUEVA. Se llama una vez al empezar y, como mucho, UNA vez más si la primera venció. */
  firmar: () => Promise<string>
  fetchFn: (url: string) => Promise<RespuestaDescarga>
  limite?: number
  onProgreso?: (bytes: number, total: number | null) => void
}

const VENCIDA = new Set([400, 401, 403])   // lo que responde el almacenamiento con una firma vencida o inválida

/**
 * Descarga el PDF ENTERO (así pdf.js no hace peticiones tardías con una URL que ya venció). Si la URL firmada vence (400/401/403)
 * se vuelve a firmar UNA sola vez; si sigue fallando, ErrorVisor('vencida'). Si pesa más del límite (por Content-Length o,
 * sin él, contando lo que llega) se corta con ErrorVisor('grande') SIN terminar de bajar el archivo.
 */
export async function descargarPdf(o: OpcionesDescarga): Promise<Uint8Array> {
  const limite = o.limite ?? MAX_PDF_EN_APP_BYTES
  let url = await o.firmar()
  let refirmado = false
  for (;;) {
    let r: RespuestaDescarga
    try { r = await o.fetchFn(url) } catch { throw new ErrorVisor('red') }
    if (!r.ok) {
      if (VENCIDA.has(r.status)) {
        if (refirmado) throw new ErrorVisor('vencida')
        refirmado = true
        url = await o.firmar()
        continue
      }
      throw new ErrorVisor(r.status === 404 ? 'no_existe' : 'http', `HTTP ${r.status}`)
    }
    const declarado = Number(r.headers.get('content-length'))
    const total = Number.isFinite(declarado) && declarado > 0 ? declarado : null
    if (total !== null && total > limite) { try { await r.body?.getReader().cancel() } catch { /* nada */ } throw new ErrorVisor('grande') }
    if (!r.body) {
      const buf = new Uint8Array(await r.arrayBuffer())
      if (buf.byteLength > limite) throw new ErrorVisor('grande')
      return buf
    }
    const lector = r.body.getReader()
    const trozos: Uint8Array[] = []
    let recibido = 0
    try {
      for (;;) {
        const { done, value } = await lector.read()
        if (done) break
        if (!value) continue
        recibido += value.byteLength
        if (recibido > limite) { await lector.cancel(); throw new ErrorVisor('grande') }
        trozos.push(value)
        o.onProgreso?.(recibido, total)
      }
    } catch (e) {
      if (e instanceof ErrorVisor) throw e
      throw new ErrorVisor('red')
    }
    const out = new Uint8Array(recibido)
    let pos = 0
    for (const t of trozos) { out.set(t, pos); pos += t.byteLength }
    return out
  }
}
