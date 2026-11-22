// Panel de diagnóstico del viewport (solo para depurar en el teléfono; components/DiagnosticoViewport.tsx). Esta función decide si se dibuja:
//   · Nunca en la rama `main` (producción): ahí el panel no existe aunque se pida con el enlace.
//   · `?debug=viewport` lo enciende y `?debug=off` lo apaga. Queda guardado en el almacenamiento de la app (localStorage, que en la app instalada es el suyo) aunque se navegue o se cierre la app.
//   · En la app instalada no se puede escribir una dirección: 5 toques seguidos sobre el título de «Perfil» lo encienden (`toqueEnTitulo`, solo fuera de main). La × del panel lo apaga.
//   · Sin parámetro, sigue lo guardado.
export const CLAVE_DIAGNOSTICO = 'anc-debug-viewport'

export interface EntradaDiagnostico { rama: string | undefined; search: string; guardado: string | null }
export interface SalidaDiagnostico { activo: boolean; guardar: '1' | null | undefined }

export function decidirDiagnostico(e: EntradaDiagnostico): SalidaDiagnostico {
  if (e.rama === 'main') return { activo: false, guardar: null }
  const d = new URLSearchParams(e.search).get('debug')
  if (d === 'viewport') return { activo: true, guardar: '1' }
  if (d === 'off') return { activo: false, guardar: null }
  return { activo: e.guardado === '1', guardar: undefined }
}

export interface Medidas { ih: number; vvh: number; vvTop: number; vvPageTop: number; escala: number }
/** Cuánto del alto de diseño NO está cubierto por el viewport visual: con el teclado abierto es su alto; con el teclado cerrado debe ser 0 (si no, el viewport quedó viejo). */
export const desfase = (m: Medidas): number => Math.round(m.ih - m.vvh - m.vvTop)

// ── 5 toques seguidos sobre el título de Perfil ──────────────────────────────────────────────────────────────────────────────────────────────────────
export const TOQUES_PARA_ENCENDER = 5, ESPERA_ENTRE_TOQUES_MS = 1500
export const EVENTO_DIAGNOSTICO = 'anc-diagnostico'
export interface CuentaToques { n: number; t: number }
/** Cuenta toques seguidos: cada uno debe llegar antes de ESPERA_ENTRE_TOQUES_MS del anterior; si no, se empieza de nuevo. `enciende` es verdadero en el quinto, y la cuenta vuelve a 0. */
export function contarToque(previa: CuentaToques, ahora: number): { cuenta: CuentaToques; enciende: boolean } {
  const n = previa.n > 0 && ahora - previa.t <= ESPERA_ENTRE_TOQUES_MS ? previa.n + 1 : 1
  return n >= TOQUES_PARA_ENCENDER ? { cuenta: { n: 0, t: ahora }, enciende: true } : { cuenta: { n, t: ahora }, enciende: false }
}

let cuenta: CuentaToques = { n: 0, t: 0 }
/** Se llama en cada toque del título de Perfil. En main no hace nada. Al quinto toque seguido guarda el encendido y avisa al panel. */
export function toqueEnTitulo(rama: string | undefined = process.env.NEXT_PUBLIC_ANC_RAMA, ahora: number = Date.now()): boolean {
  if (rama === 'main' || typeof window === 'undefined') return false
  const r = contarToque(cuenta, ahora); cuenta = r.cuenta
  if (!r.enciende) return false
  try { window.localStorage.setItem(CLAVE_DIAGNOSTICO, '1') } catch { /* sin almacenamiento: el aviso de abajo igual lo enciende en esta sesión */ }
  window.dispatchEvent(new Event(EVENTO_DIAGNOSTICO))
  return true
}
