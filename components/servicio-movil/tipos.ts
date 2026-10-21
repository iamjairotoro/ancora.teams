// Las propiedades que la página de administración le pasa a la vista del servicio. Las comparten la vista de escritorio (AdminServiceView) y las pantallas de teléfono (components/servicio-movil):
// una sola definición, para que las dos reciban exactamente lo mismo.
import type { Service, Member, Song, BandaAssignment, Invitation, ServiceBlock, ToolType, TeamTool } from '@/lib/types'
import type { AvisoConvocatoria, ResultadoDestinatario } from '@/lib/convocatoriaTypes'
import type { TeamBlockRow } from '@/lib/teamBlocks'

export interface ServicioAdminProps {
  services: Service[]
  selectedService: Service|null
  setSelectedService: (s:Service)=>void
  createService: (fecha:string, horaInicio?:string, horaFin?:string, kind?:'service'|'rehearsal'|'other', extra?:{parentServiceId?:string; lugar?:string; direccion?:string; mapsLink?:string})=>Promise<string|null|void>|void
  deleteService: (id:string)=>void
  duplicateService: (id:string,fecha:string)=>void
  members: Member[]
  songs: Song[]
  blocks: ServiceBlock[]
  setBlocks: (updater: ServiceBlock[] | ((prev: ServiceBlock[]) => ServiceBlock[])) => void
  bandaItems: BandaAssignment[]
  invitations: Invitation[]
  /** id de invitación → su equipo (también las de otros servicios del mismo día): para decir «Aceptó en {equipo}». */
  equipoDeInvitacion?: Record<string, string | null>
  membersFor: (posId:string)=>Member[]
  getBanda: (posId:string,slotIndex?:number)=>BandaAssignment|undefined
  assignBanda: (posId:string,memberId:string,slotIndex?:number)=>void
  getSlotsNeeded: (posId:string)=>number
  updateSlotsNeeded: (posId:string,newCount:number)=>void
  sendInvites: (teamId?: string)=>void
  sending: boolean
  // Resultado de la última convocatoria/reinvitación (punto 61): persiste hasta «Cerrar»; lo guarda la página.
  // Errores generales (rojo) e info (una línea que se va sola) de la última llamada; el resultado POR PERSONA ya no tiene panel (punto 61, ajuste de octubre 2026): con éxito no se
  // muestra nada, y quien tiene un problema de correo lleva un «!» en la nómina. resultadosCorreo = lo que devolvieron los envíos de esta pantalla (se pierde al recargar o cambiar de servicio).
  aviso: AvisoConvocatoria | null
  resultadosCorreo: ResultadoDestinatario[]
  onCerrarAviso: () => void
  // «Reintentar correo» (punto 61): reintenta solo el correo de esa persona, sin tocar sent_at. reintentandoId = quién está en curso.
  reintentarCorreo: (memberId: string, teamId: string) => void
  reintentandoId: string | null
  reinvitar: (memberId:string, teamId:string)=>void
  onBlocksChange: ()=>void
  // Un equipo del módulo Equipos = una columna del tablero; sus posiciones
  // son las filas de esa columna. 100% dinámico, sin nombres ni cantidades
  // fijas — puede haber cualquier cantidad de equipos, cada uno con
  // cualquier cantidad de posiciones. Cada posición lleva su id (para
  // membersFor/getBanda/assignBanda) además del nombre a mostrar. Un
  // equipo puede tener varias herramientas activas a la vez, incluso
  // repetidas — cada una es una instancia independiente (su propio id).
  equipoSections: { teamId: string; nombre: string; color: string | null; tools: TeamTool[]; posiciones: {id:string; nombre:string; codigo:string; seccionNombre:string|null}[] }[]
  addTeamTool: (teamId: string, toolType: ToolType) => void
  removeTeamTool: (teamToolId: string) => void
  dateBlocks: TeamBlockRow[] // punto 51: (persona, equipo) bloqueados en la fecha del servicio
  darkMode?: boolean
  // punto 25 — plantillas por herramienta: solo owner/admin las administra
  // (crea, aplica, actualiza, borra). viewerMemberId queda registrado como
  // created_by al guardar una plantilla nueva.
  canManageTemplates?: boolean
  viewerMemberId?: string
  // Carga inicial de services/teams/etc (app/admin/page.tsx). Mientras
  // dataLoading, ningún "Sin equipos todavía"/"Sin servicios futuros" se
  // muestra — sería un vacío adivinado, no real. dataError reemplaza el
  // esqueleto por un mensaje + reintentar si la carga falló (nunca se
  // queda cargando para siempre).
  dataLoading?: boolean
  dataError?: string | null
  onRetryData?: () => void
  /** El equipo que pide la URL (?equipo=): queda elegida su pestaña. No cambia nada de lo que se ve. */
  equipoInicial?: string | null
  /** El aviso de lo que pasó al CREAR este servicio (p. ej. «Checklist de Producción: había 2, se usó el primero por orden»). Solo lo muestra la pantalla de teléfono, como nota que se puede cerrar; el escritorio usa su propia banda. */
  avisoCreacion?: string
  onCerrarAvisoCreacion?: () => void
}
