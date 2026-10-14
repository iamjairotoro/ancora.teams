// Cola de subidas de la administración (punto 55, ajuste de Claudia): uno a la vez, con estados y numeración «2 de 3». Sin React ni red: quien la
// crea le pasa la función que sube de verdad (`subir`) y los temporizadores se inyectan, así se prueba entera con reloj falso.
//   cola → subiendo → registrando → ok (se desvanece solo a los 3 s)
//                  ↘ error (PERSISTENTE, con el motivo y «Reintentar»)   ↘ cancelado (se va a los 3 s)
// La barra solo se muestra si la subida tarda más de ~300 ms (`verBarra`), para que un archivo chico no parpadee.

export type EstadoItem = 'cola' | 'subiendo' | 'registrando' | 'ok' | 'error' | 'cancelado'

export interface ItemSubida<A, C> {
  readonly id: number
  readonly archivo: A
  /** Contexto con el que se agregó (p. ej. la canción): la subida usa el de AL AGREGAR, no el de ahora. */
  readonly ctx: C
  /** «n de de» dentro de su tanda; solo se muestra si de > 1. */
  readonly n: number
  readonly de: number
  readonly estado: EstadoItem
  readonly bytes: number
  readonly total: number
  readonly mensaje: string | null
  /** false si el archivo se rechazó por tipo o tamaño: volver a intentarlo falla igual, así que solo se ofrece «Descartar». */
  readonly reintentable: boolean
  readonly verBarra: boolean
}

export interface ControlSubida {
  senal: AbortSignal
  onProgreso: (bytes: number, total: number) => void
  onRegistrando: () => void
}
export type ResultadoDeSubir = { ok: true } | { ok: false; mensaje: string; cancelado?: boolean; reintentable?: boolean }
export type FuncionSubir<A, C> = (archivo: A, ctx: C, control: ControlSubida) => Promise<ResultadoDeSubir>

export interface OpcionesCola {
  programar?: (f: () => void, ms: number) => unknown
  cancelarProgramado?: (h: unknown) => void
  msBarra?: number
  msDesvanecer?: number
  /** Se llama cuando UN archivo quedó subido y registrado (la pantalla recarga su lista). */
  alTerminarUno?: () => void
}

export const MS_BARRA = 300
export const MS_DESVANECER = 3000

type Estado<A, C> = { -readonly [K in keyof ItemSubida<A, C>]: ItemSubida<A, C>[K] }

export class ColaSubida<A extends { name: string; size: number }, C = undefined> {
  private items: Estado<A, C>[] = []
  private snapshot: readonly ItemSubida<A, C>[] = []
  private oyentes = new Set<() => void>()
  private siguienteId = 1
  private activo: { id: number; ctl: AbortController } | null = null
  private timers = new Map<number, unknown[]>()
  private destruida = false
  private readonly programar: (f: () => void, ms: number) => unknown
  private readonly cancelarProg: (h: unknown) => void
  private readonly msBarra: number
  private readonly msDesvanecer: number

  constructor(private readonly subir: FuncionSubir<A, C>, private readonly opciones: OpcionesCola = {}) {
    this.programar = opciones.programar ?? ((f, ms) => setTimeout(f, ms))
    this.cancelarProg = opciones.cancelarProgramado ?? (h => clearTimeout(h as ReturnType<typeof setTimeout>))
    this.msBarra = opciones.msBarra ?? MS_BARRA
    this.msDesvanecer = opciones.msDesvanecer ?? MS_DESVANECER
  }

  // ── lectura (para useSyncExternalStore: la referencia cambia SOLO cuando cambia algo) ──
  obtener = (): readonly ItemSubida<A, C>[] => this.snapshot
  suscribir = (f: () => void) => { this.oyentes.add(f); return () => { this.oyentes.delete(f) } }
  get ocupado(): boolean { return this.items.some(i => i.estado === 'cola' || i.estado === 'subiendo' || i.estado === 'registrando') }

  private emitir() { this.snapshot = this.items.map(i => ({ ...i })); this.oyentes.forEach(f => f()) }
  private item(id: number) { return this.items.find(i => i.id === id) }
  private programarItem(id: number, f: () => void, ms: number) {
    const h = this.programar(f, ms); const l = this.timers.get(id) ?? []; l.push(h); this.timers.set(id, l)
  }
  private limpiarTimers(id: number) { (this.timers.get(id) ?? []).forEach(h => this.cancelarProg(h)); this.timers.delete(id) }

  // ── acciones ──
  /** Agrega archivos: forman una tanda («1 de 3»…). Si ya hay subidas en curso, la tanda nueva se numera aparte. */
  agregar(archivos: A[], ctx: C): void {
    if (this.destruida || !archivos.length) return
    archivos.forEach((archivo, i) => this.items.push({ id: this.siguienteId++, archivo, ctx, n: i + 1, de: archivos.length, estado: 'cola', bytes: 0, total: archivo.size, mensaje: null, reintentable: true, verBarra: false }))
    this.emitir(); void this.bombear()
  }

  /** En cola: se descarta. Subiendo: se aborta. Registrando la fila: ya no se puede cancelar (es lo último y es corto). */
  cancelar(id: number): void {
    const it = this.item(id)
    if (!it) return
    if (it.estado === 'cola') { this.terminarCancelado(it); return }
    if (it.estado === 'subiendo' && this.activo?.id === id) this.activo.ctl.abort()
  }

  /** Error o cancelado → vuelve a la cola (al final) y se intenta de nuevo con el mismo archivo. */
  reintentar(id: number): void {
    const it = this.item(id)
    if (!it || (it.estado !== 'error' && it.estado !== 'cancelado') || !it.reintentable) return
    this.limpiarTimers(id)
    Object.assign(it, { estado: 'cola', bytes: 0, mensaje: null, verBarra: false })
    this.items = [...this.items.filter(x => x.id !== id), it]
    this.emitir(); void this.bombear()
  }

  descartar(id: number): void {
    const it = this.item(id)
    if (!it || it.estado === 'subiendo' || it.estado === 'registrando' || it.estado === 'cola') return
    this.quitar(id)
  }

  /** Al desmontar la pantalla: se aborta lo que esté subiendo y se apagan los temporizadores. */
  destruir(): void {
    this.destruida = true
    this.activo?.ctl.abort()
    for (const id of Array.from(this.timers.keys())) this.limpiarTimers(id)
    this.oyentes.clear()
  }

  // ── internos ──
  private quitar(id: number) { this.limpiarTimers(id); this.items = this.items.filter(i => i.id !== id); this.emitir() }

  private terminarCancelado(it: Estado<A, C>) {
    this.limpiarTimers(it.id)
    Object.assign(it, { estado: 'cancelado', verBarra: false, mensaje: 'Cancelado' })
    this.emitir()
    this.programarItem(it.id, () => { if (this.item(it.id)?.estado === 'cancelado') this.quitar(it.id) }, this.msDesvanecer)
  }

  private async bombear(): Promise<void> {
    if (this.activo || this.destruida) return
    const it = this.items.find(i => i.estado === 'cola')
    if (!it) return
    const ctl = new AbortController()
    this.activo = { id: it.id, ctl }
    Object.assign(it, { estado: 'subiendo', bytes: 0, total: it.archivo.size, mensaje: null, verBarra: false })
    this.emitir()
    this.programarItem(it.id, () => { const x = this.item(it.id); if (x && x.estado === 'subiendo') { x.verBarra = true; this.emitir() } }, this.msBarra)

    let r: ResultadoDeSubir
    try {
      r = await this.subir(it.archivo, it.ctx, {
        senal: ctl.signal,
        onProgreso: (bytes, total) => { if (this.item(it.id)?.estado === 'subiendo') { Object.assign(it, { bytes, total }); this.emitir() } },
        onRegistrando: () => { if (this.item(it.id)) { Object.assign(it, { estado: 'registrando', bytes: it.total }); this.emitir() } },
      })
    } catch { r = { ok: false, mensaje: 'Error inesperado al subir el archivo. Inténtalo de nuevo.' } }
    this.activo = null
    if (this.destruida) return
    this.limpiarTimers(it.id)
    if (r.ok) {
      Object.assign(it, { estado: 'ok', bytes: it.total, verBarra: false, mensaje: null })
      this.emitir()
      this.opciones.alTerminarUno?.()
      this.programarItem(it.id, () => { if (this.item(it.id)?.estado === 'ok') this.quitar(it.id) }, this.msDesvanecer)
    } else if (r.cancelado || ctl.signal.aborted) {
      this.terminarCancelado(it)
    } else {
      Object.assign(it, { estado: 'error', verBarra: false, mensaje: r.mensaje, reintentable: r.reintentable !== false })      // PERSISTENTE: solo se va con «Descartar» o «Reintentar»
      this.emitir()
    }
    void this.bombear()
  }
}
