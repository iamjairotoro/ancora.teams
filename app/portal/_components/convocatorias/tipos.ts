// Tipos mínimos de lo que las piezas de convocatoria necesitan (punto 52, commit 4). Son ESTRUCTURALES a propósito: cualquier pantalla del portal
// (hoy Servicios y el detalle del servicio; mañana las que rehaga el punto 54) puede pasar su propia entrada mientras tenga estos campos.
export interface EquipoTarjeta { id: string; name: string; color: string | null }

export interface InvitacionConvocatoria {
  id?: string
  status: string
  token: string
  sent_at?: string | null
  needs_reassignment_confirm?: boolean
  declined_reason?: string | null
}

export interface EntradaConvocatoria {
  service: { id: string; fecha: string; titulo?: string; hora_inicio?: string; hora_fin?: string; tipo?: string }
  team?: EquipoTarjeta | null
  /** Si esta convocatoria quedó declinada porque la persona aceptó en otro equipo: cuál. */
  reemplazadaPor?: { id: string; name: string } | null
  posiciones: string[]
  invitation: InvitacionConvocatoria | null
}
