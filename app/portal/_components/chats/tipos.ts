// Tipos de lo que la presentación de Chats recibe de PortalApp (punto 54, commit 6).
export interface PersonaChat { id: string; nombre: string; apellido?: string | null; avatar_url?: string | null }
export interface PreviewChat { content: string; memberName: string; memberId: string; created_at: string }
export interface ServicioChat { id: string; fecha: string; titulo?: string; tipo?: string }
export interface MensajeChat { id?: string; member_id: string; content: string; created_at: string; member?: { nombre?: string | null; avatar_url?: string | null } | null }
