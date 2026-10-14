// Subida de UN archivo a una URL firmada de Supabase Storage con progreso REAL (punto 55, ajuste de Claudia). supabase-js no expone el
// progreso (usa fetch), así que se hace igual que él pero con XMLHttpRequest, que sí lo da (upload.onprogress): PUT a
// …/object/upload/sign/<bucket>/<ruta>?token=… con un FormData {cacheControl, '' = el archivo}. El tipo del archivo es el del propio Blob,
// que quien llama fija CANÓNICO (file.slice(0, size, tipo)). Pura: el XHR y el FormData se inyectan, así se prueba sin navegador.

export interface XhrLike {
  open(metodo: string, url: string): void
  setRequestHeader(nombre: string, valor: string): void
  send(cuerpo: unknown): void
  abort(): void
  upload: { onprogress: ((e: { loaded: number; total: number; lengthComputable: boolean }) => void) | null }
  onload: (() => void) | null
  onerror: (() => void) | null
  onabort: (() => void) | null
  ontimeout: (() => void) | null
  status: number
  responseText: string
}

export type ResultadoXhr =
  | { ok: true }
  | { ok: false; cancelado: true }
  | { ok: false; cancelado: false; status: number; mensaje: string }   // status 0 = se cortó la conexión

export interface OpcionesXhr {
  url: string
  archivo: Blob
  cacheControl?: string
  upsert?: boolean
  headers?: Record<string, string>
  senal?: AbortSignal
  onProgreso?: (bytes: number, total: number) => void
  crearXhr?: () => XhrLike
  crearForm?: () => { append(nombre: string, valor: unknown): void }
}

export function subirConXhr(o: OpcionesXhr): Promise<ResultadoXhr> {
  return new Promise(resolver => {
    if (o.senal?.aborted) { resolver({ ok: false, cancelado: true }); return }
    const xhr = (o.crearXhr ?? (() => new XMLHttpRequest() as unknown as XhrLike))()
    const form = (o.crearForm ?? (() => new FormData()))()
    form.append('cacheControl', o.cacheControl ?? '3600')
    form.append('', o.archivo)
    const total = o.archivo.size
    let terminado = false
    const fin = (r: ResultadoXhr) => { if (terminado) return; terminado = true; o.senal?.removeEventListener('abort', alAbortar); resolver(r) }
    const alAbortar = () => { try { xhr.abort() } catch { /* ya terminó */ } fin({ ok: false, cancelado: true }) }

    xhr.upload.onprogress = e => {
      if (!e.lengthComputable || !e.total) return
      // e.total incluye los bytes del multipart (unos cientos): se reescala al tamaño del archivo para que el 100 % sea el 100 %.
      o.onProgreso?.(Math.min(total, Math.round((e.loaded * total) / e.total)), total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { o.onProgreso?.(total, total); fin({ ok: true }); return }
      let mensaje = ''
      try { const j = JSON.parse(xhr.responseText); mensaje = String(j?.message || j?.error || '') } catch { mensaje = '' }
      fin({ ok: false, cancelado: false, status: xhr.status, mensaje })
    }
    xhr.onerror = () => fin({ ok: false, cancelado: false, status: 0, mensaje: 'network' })
    xhr.ontimeout = () => fin({ ok: false, cancelado: false, status: 0, mensaje: 'timeout' })
    xhr.onabort = () => fin({ ok: false, cancelado: true })
    o.senal?.addEventListener('abort', alAbortar)

    xhr.open('PUT', o.url)
    xhr.setRequestHeader('x-upsert', String(!!o.upsert))
    for (const [k, v] of Object.entries(o.headers ?? {})) xhr.setRequestHeader(k, v)
    xhr.send(form)
  })
}

// ── texto del progreso ──
const num = (n: number) => n.toFixed(1).replace('.', ',')

const NBSP = '\u00A0'   // espacio sin corte: «42 %» y «9,8 MB» no se parten en dos renglones

/** «4,2 de 9,8 MB» (o «120 de 640 KB» si el archivo pesa menos de 1 MB): las dos cifras en la unidad del total. */
export function bytesDe(bytes: number, total: number): string {
  if (total >= 1048576) return `${num(bytes / 1048576)} de ${num(total / 1048576)}${NBSP}MB`
  return `${Math.round(bytes / 1024)} de ${Math.max(1, Math.round(total / 1024))}${NBSP}KB`
}

export const porcentaje = (bytes: number, total: number): number => (total > 0 ? Math.max(0, Math.min(100, Math.floor((bytes / total) * 100))) : 0)

/** «Subiendo ritmo.m4a · 4,2 de 9,8 MB · 43 %». */
export const textoProgreso = (nombre: string, bytes: number, total: number): string => `Subiendo ${nombre} · ${bytesDe(bytes, total)} · ${porcentaje(bytes, total)}${NBSP}%`

export function tamanoLegible(bytes: number): string {
  return bytes >= 1048576 ? `${num(bytes / 1048576)}${NBSP}MB` : `${Math.max(1, Math.round(bytes / 1024))}${NBSP}KB`
}
