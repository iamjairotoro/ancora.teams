// Textos de los Home de teléfono rediseñados (mockups Home-Usuario-A y Home-Admin-A): calendario compartido, favoritos, próximos, cifras y tarjetas del admin. Hablan de tú donde le hablan a la persona.
import { plural } from './plural'
export const TEXTOS_HOME_NUEVO = {
  hoy: 'Hoy',
  semana: 'Semana',
  mes: 'Mes',
  vistaCalendario: 'Vista del calendario',
  mesAnterior: 'Mes anterior',
  mesSiguiente: 'Mes siguiente',
  semanaAnterior: 'Semana anterior',
  semanaSiguiente: 'Semana siguiente',
  leyendaServicio: 'Servicio',
  leyendaEnsayo: 'Ensayo',
  leyendaBloqueado: 'Bloqueado',
  // usuario
  hola: (nombre: string) => `Hola, ${nombre}`,
  tituloUsuario: 'Inicio',
  tusEquipos: 'Tus equipos',
  favoritos: 'Favoritos',
  verTodas: 'Ver todas',
  sinFavoritos: 'Marca canciones con el corazón y aparecerán aquí.',
  proximos: 'Próximos',
  verTodos: 'Ver todos',
  sinProximos: 'Cuando te convoquen a un servicio o a un ensayo, tu próxima cita aparecerá aquí.',
  cumpleanos: 'Cumpleaños de tus equipos',
  cumpleanosEtiqueta: 'Cumpleaños',
  // admin
  tituloAdmin: 'Home',
  equipos: 'Equipos',
  voluntariosCitados: 'Voluntarios citados',
  conLaApp: 'Con la app',
  verPersonas: 'Ver personas',
  despues: 'Después',
  abrirServicio: 'Abrir servicio',
  sinProximoServicio: 'Todavía no hay un próximo servicio.',
  sinProximoServicioAyuda: 'Cuando crees un servicio nuevo, va a aparecer aquí.',
} as const
export const conLaAppDe = (total: number): string => `de ${total}`
export const confirmadosN = (n: number): string => `${n} ${plural(n, 'confirmado', 'confirmados')}`
/** «Próximo: 2 de 5 cubiertos»; un equipo que no participa dice «Próximo: sin asignar». */
export const proximoCubiertos = (cubiertos: number | null, cupos: number | null): string => (cubiertos === null || cupos === null ? 'Próximo: sin asignar' : `Próximo: ${cubiertos} de ${cupos} ${plural(cupos, 'cubierto', 'cubiertos')}`)
export const marcasDelDia = (n: number): string => (n === 1 ? 'un servicio' : `${n} servicios`)
