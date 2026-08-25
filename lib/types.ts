export type Instrument =
  | 'Guitarra Acustica' | 'Guitarra Electrica' | 'Piano'
  | 'MD (Direccion Musical en vivo)' | 'Bajo' | 'Bateria'
  | 'Voz' | 'Sonido' | 'Montaje' | 'Perc menores'

export interface Member {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono?: string
  instrumentos: Instrument[]
  avatar_url?: string
  fecha_nacimiento?: string
  last_seen?: string
  instalado_pwa_at?: string
  created_at: string
}

export interface Team {
  id: string
  organization_id: string
  parent_team_id?: string
  nombre: string
  created_at: string
}

export interface TeamMember {
  id: string
  member_id: string
  team_id: string
  organization_id: string
  created_at: string
  member?: Member
}

export interface Song {
  id: string
  nombre: string
  artista: string
  tono_original?: string
  bpm?: number
  compas?: string
  link_spotify?: string
  link_letras?: string
  link_recursos?: string
  spotify_url?: string
  apple_music_url?: string
  caratula_url?: string
  tags?: string[]
  notas?: string
  duracion_min?: number
  created_at: string
}

export interface Service {
  id: string
  fecha: string
  titulo: string
  hora_inicio?: string
  hora_fin?: string
  tipo?: 'servicio'|'ensayo'
  lugar?: string
  created_at: string
}

export interface SetlistItem {
  id: string
  service_id: string
  orden: number
  song_id?: string
  song?: Song
  tono?: string
  lead_id?: string
  lead?: Member
  link?: string
}

export interface BandaAssignment {
  id: string
  service_id: string
  posicion: string
  member_id?: string
  member?: Member
}

export interface Invitation {
  id: string
  service_id: string
  member_id: string
  member?: Member
  service?: Service
  token: string
  status: 'pendiente'|'confirmado'|'declinado'
  comentario?: string
  sent_at?: string
  responded_at?: string
  confirmed_posiciones?: string[]
  needs_reassignment_confirm?: boolean
  last_reminder_at?: string
}

export interface ServiceBlock {
  id: string
  service_id: string
  orden: number
  tipo: 'cancion' | 'bloque'
  titulo?: string
  duracion_min?: number
  notas?: string
  song_id?: string
  song?: Song
  tono?: string
  lead_id?: string
  lead?: Member
}
