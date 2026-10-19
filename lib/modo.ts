// Los «modos» de la app (fase 1 del botón de modo): Usuario (/portal), Líder (/home) y Admin (/admin). Funciones PURAS, sin acceso a datos ni a la sesión: lo que se muestra es solo una pista de interfaz.
// La AUTORIZACIÓN no sale de aquí: quién es administrador o líder lo decide el servidor (lib/portal/perfil.ts → administracionDe, solo con sesión de Google) y las pantallas y rutas
// siguen verificando por su cuenta (/admin y /home con su control de entrada, las rutas con requireOrgAdmin y, al cerrar las tablas, las políticas de la base).
export type RolDeModo = 'admin' | 'lider'
export interface AdministracionDeModo { destino: '/admin' | '/home'; rol: RolDeModo }
export type IconoDeModo = 'admin' | 'lider' | 'usuario'
export interface BotonDeModo { texto: string; href: string; icono: IconoDeModo }

/** El botón del PORTAL: «Modo Admin» (administrador/owner; nunca «Modo Líder») o «Modo Líder». Sin rol, o sin la fila del servidor (enlace de acceso, token), no hay botón. */
export function botonDelPortal(administracion: AdministracionDeModo | null | undefined): BotonDeModo | null {
  if (!administracion) return null
  if (administracion.rol === 'admin') return { texto: 'Modo Admin', href: '/admin', icono: 'admin' }
  if (administracion.rol === 'lider') return { texto: 'Modo Líder', href: '/home', icono: 'lider' }
  return null
}

/** Dentro de Admin o Líder: el botón vuelve a Usuario (/portal, identidad por sesión, no el token). */
export const BOTON_MODO_USUARIO: BotonDeModo = { texto: 'Modo Usuario', href: '/portal', icono: 'usuario' }

/** La etiqueta de dónde estás en /admin y /home. Un administrador siempre ve «MODO ADMIN», también en /home; solo quien no es administrador y lidera ve «MODO LÍDER». */
export function etiquetaDeModo(esAdmin: boolean): 'MODO ADMIN' | 'MODO LÍDER' { return esAdmin ? 'MODO ADMIN' : 'MODO LÍDER' }
