export type Instrument =
  | 'Guitarra Acustica' | 'Guitarra Electrica' | 'Piano'
  | 'MD (Direccion Musical en vivo)' | 'Bajo' | 'Bateria'
  | 'Voz' | 'Sonido' | 'Montaje' | 'Perc menores'

export type Genero = 'femenino' | 'masculino' | 'otro'
export type EstadoCivil = 'soltero' | 'casado' | 'otro'

export interface Member {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono?: string
  instrumentos: Instrument[]
  avatar_url?: string
  fecha_nacimiento?: string
  direccion?: string
  genero?: Genero
  estado_civil?: EstadoCivil
  fecha_aniversario?: string
  last_seen?: string
  instalado_pwa_at?: string
  created_at: string
}

export type ToolType = 'setlist' | 'checklist' | 'schedule' | 'notes' | 'file_upload'

export interface TeamTool {
  id: string
  team_id: string
  tool_type: ToolType
  label?: string
  sort_order: number
  created_at: string
}

export interface ServiceScheduleItem {
  id: string
  service_id: string
  team_id: string
  team_tool_id: string
  hora?: string
  texto: string
  sort_order: number
}

export interface ServiceNote {
  id: string
  service_id: string
  team_id: string
  team_tool_id: string
  texto: string
  updated_at: string
}

export interface Team {
  id: string
  organization_id: string
  name: string
  description?: string
  sort_order: number
  archived_at?: string
  tool_type?: ToolType
  created_at: string
}

export interface ChecklistTemplate {
  id: string
  organization_id: string
  team_id: string
  name: string
  sort_order: number
  archived_at?: string
  created_at: string
}

export interface ChecklistTemplateItem {
  id: string
  template_id: string
  texto: string
  sort_order: number
}

export interface ServiceChecklist {
  id: string
  service_id: string
  team_id: string
  team_tool_id: string
  template_id?: string
  created_at: string
}

export interface ServiceChecklistItem {
  id: string
  service_checklist_id: string
  texto: string
  checked: boolean
  sort_order: number
  assigned_member_id?: string
}

export interface TeamSection {
  id: string
  organization_id: string
  team_id: string
  name: string
  sort_order: number
  archived_at?: string
  created_at: string
}

export interface TeamPosition {
  id: string
  organization_id: string
  team_id: string
  section_id?: string
  name: string
  code: string
  default_slots: number
  sort_order: number
  archived_at?: string
  created_at: string
}

export type Availability = 'unrestricted' | 'monthly_max_1' | 'monthly_max_2' | 'on_request'

export interface TeamMember {
  id: string
  member_id: string
  team_id: string
  organization_id: string
  is_leader: boolean
  availability: Availability
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
  slot_index: number
  member_id?: string
  member?: Member
}

export interface ServicePositionSlots {
  id: string
  service_id: string
  team_position_id: string
  slots_needed: number
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
