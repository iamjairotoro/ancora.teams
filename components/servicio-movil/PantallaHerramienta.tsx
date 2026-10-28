'use client'
// Una herramienta abierta a pantalla completa en teléfono: la Orden del servicio, el Cronograma, el Checklist o las Notas. Reutiliza TAL CUAL los componentes de escritorio (cargan sus propios datos y ya
// muestran «No se pudo cargar…» con «Reintentar»); aquí solo se les da el marco y el menú «⋯» de la herramienta («Quitar esta herramienta»).
import MenuFlotante from '@/components/MenuFlotante'
import { useState } from 'react'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import type { Member, ToolType } from '@/lib/types'
import type { SeccionEquipo } from '@/lib/admin/servicioMovil'
import { nombreDeHerramienta, TEXTOS_SERVICIO as T } from '@/lib/textos/servicio'
import ChecklistLider from './ChecklistLider'
import ScheduleTool from '../ScheduleTool'
import FreeTextTool from '../FreeTextTool'
import OrdenDelServicio from '../OrdenDelServicio'
import type { ServicioAdminProps } from './tipos'
import ui from './pantallas.module.css'

export default function PantallaHerramienta({ p, seccion, tool }: { p: ServicioAdminProps; seccion: SeccionEquipo; tool: { id: string; tool_type: ToolType; label?: string | null } }) {
  const servicio = p.selectedService!
  const [menu, setMenu] = useState(false)
  const quitar = () => p.removeTeamTool(tool.id)
  const vozPosIds = new Set(p.equipoSections.flatMap(s => s.posiciones).filter(x => x.seccionNombre && /voz|voces/i.test(x.seccionNombre)).map(x => x.id))
  const vozMemberIds = new Set(p.bandaItems.filter(b => b.team_position_id && vozPosIds.has(b.team_position_id) && b.member_id).map(b => b.member_id as string))
  const equipo = p.equipoSections.find(s => s.teamId === seccion.teamId)
  const toolMenu = (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setMenu(v => !v)} aria-label={`${T.accionesDe} ${nombreDeHerramienta(tool.tool_type)}`} className="anc-rowMore" style={{ opacity: 1 }}><MoreHorizontal size={14} /></button>
      {menu && (
        <MenuFlotante titulo={`${T.accionesDe} ${nombreDeHerramienta(tool.tool_type)}`} onCerrar={() => setMenu(false)}>
          <button className="anc-rowMenuDanger" onClick={() => { quitar(); setMenu(false) }}><Trash2 size={13} /> {T.quitarHerramienta}</button>
        </MenuFlotante>
      )}
    </div>
  )
  return (
    <div className={`${ui.herramienta} anc`}>
      <h1 className={ui.soloLectores}>{tool.tool_type === 'setlist' ? T.ordenDelServicio : nombreDeHerramienta(tool.tool_type)}</h1>
      {tool.tool_type === 'checklist' ? (
        <ChecklistLider servicioId={servicio.id} herramientaId={tool.id} nombre={tool.label?.trim() || nombreDeHerramienta(tool.tool_type)} onQuitarHerramienta={quitar} />
      ) : tool.tool_type === 'schedule' ? (
        <ScheduleTool teamId={seccion.teamId} teamToolId={tool.id} service={servicio} onRemoveTool={quitar} canManageTemplates={!!p.canManageTemplates} viewerMemberId={p.viewerMemberId} />
      ) : tool.tool_type === 'notes' ? (
        <FreeTextTool teamId={seccion.teamId} teamToolId={tool.id} service={servicio} menu={toolMenu} />
      ) : (
        <OrdenDelServicio service={servicio} blocks={p.blocks} setBlocks={p.setBlocks} songs={p.songs} members={p.members} vozMemberIds={vozMemberIds}
          onBlocksChange={p.onBlocksChange} canManageTemplates={p.canManageTemplates} viewerMemberId={p.viewerMemberId}
          menuAbierto={menu} onAlternarMenu={() => setMenu(v => !v)} onCerrarMenu={() => setMenu(false)} onQuitar={quitar} alVaciar={() => setMenu(false)} />
      )}
    </div>
  )
}
