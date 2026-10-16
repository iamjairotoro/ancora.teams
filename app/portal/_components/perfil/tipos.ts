// Tipos del Perfil del portal (punto 54, commit 1). El servidor ya resuelve todo: la pantalla solo lo dibuja.
export interface EquipoPerfil { id: string; name: string; color: string | null; posiciones: string[] }
/** La fila «Administración»: owner y admin → /admin; líder → /home. null = la fila no existe. */
export interface Administracion { destino: '/admin' | '/home'; rol: 'admin' | 'lider' }

export interface DatosPersona {
  id?: string
  nombre?: string
  apellido?: string | null
  email?: string | null
  telefono?: string | null
  fecha_nacimiento?: string | null
  avatar_url?: string | null
}

/** Estado y acción de las notificaciones push (hook usePush). */
export interface ControlPush {
  /** El navegador sabe de notificaciones (service worker + PushManager). */
  soportado: boolean
  /** iPhone/iPad: solo funcionan con la app agregada a la pantalla de inicio. */
  esIOS: boolean
  instalada: boolean
  /** Falta la clave VAPID en el servidor (variable NEXT_PUBLIC_VAPID_PUBLIC_KEY al construir). */
  sinClave: boolean
  activadas: boolean
  cargando: boolean
  error: string | null
  alternar: () => void
}
