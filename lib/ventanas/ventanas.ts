// `confirmar` y `avisar`: lo que antes eran confirm() y alert() del navegador, sin hooks (se llaman desde cualquier función). En TELÉFONO (≤ 768 px) y con el proveedor montado (components/ventanas/VentanasProvider)
// salen como ventana centrada; en escritorio (o sin proveedor: pruebas, servidor) siguen siendo los diálogos de siempre con el MISMO texto, para que el escritorio quede idéntico.
import type { TonoVentana } from '@/components/ventanas/VentanaCentrada'

export interface OpcionesConfirmar { /** Rótulo del botón que sigue adelante: «Eliminar», «Vaciar»… */ accion?: string; /** Acción que borra o desactiva: el botón va en rojo. */ peligro?: boolean; cancelar?: string }
export interface OpcionesAvisar { tono?: TonoVentana; cerrar?: string }
export interface ImplVentanas { confirmar: (mensaje: string, o: OpcionesConfirmar) => Promise<boolean>; avisar: (mensaje: string, o: OpcionesAvisar) => Promise<void> }

let impl: ImplVentanas | null = null
export const registrarVentanas = (i: ImplVentanas | null): void => { impl = i }

const esTelefono = (): boolean => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 768px)').matches

export function confirmar(mensaje: string, o: OpcionesConfirmar = {}): Promise<boolean> {
  if (impl && esTelefono()) return impl.confirmar(mensaje, o)
  return Promise.resolve(typeof window !== 'undefined' ? window.confirm(mensaje) : false)
}
export function avisar(mensaje: string, o: OpcionesAvisar = {}): Promise<void> {
  if (impl && esTelefono()) return impl.avisar(mensaje, o)
  if (typeof window !== 'undefined') window.alert(mensaje)
  return Promise.resolve()
}
