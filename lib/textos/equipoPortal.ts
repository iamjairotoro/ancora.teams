// Textos del Equipo del servicio en teléfono (app/portal/_components/servicio/EquipoServicioTelefono.tsx).
import { contar } from '@/lib/textos/plural'

export const TEXTOS_EQUIPO_PORTAL = {
  tu: 'TÚ',
  confirmado: 'Confirmado',
  sinConfirmar: 'Sin confirmar',
  leyendaConfirmo: 'Confirmó',
  leyendaSinConfirmar: 'Sin confirmar',
  otrosEquipos: 'Otros equipos',
  vacio: 'Todavía no hay equipo asignado a este servicio.',
} as const

export const personasDelEquipo = (n: number): string => contar(n, 'persona', 'personas')
export const abrirEquipo = (nombre: string, abierto: boolean): string => `${abierto ? 'Cerrar' : 'Abrir'} el equipo ${nombre}`
