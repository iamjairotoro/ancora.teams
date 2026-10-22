'use client'
// La «Orden del servicio» (fase 3 · B1): antes vivía dentro de AdminServiceView; se sacó SIN cambiar lo que hace ni lo que dibuja (movimiento de código) para que la use también la pantalla de teléfono.
// Es del SERVICIO (service_blocks), no de un equipo: la herramienta «Setlist» de cualquier equipo la muestra. Lo que sigue en AdminServiceView es solo el estado del menú «⋯» de la herramienta
// (compartido con las demás herramientas del equipo), «Quitar esta herramienta» y el «⋯» del encabezado del servicio, que se avisan con las propiedades de abajo.
import { confirmar } from '@/lib/ventanas/ventanas'
import MenuFlotante from '@/components/MenuFlotante'
import { useState, useEffect, useCallback } from 'react'
import { FileText, Headphones, MoreHorizontal, Plus, Trash2, User, X } from 'lucide-react'
import type { Service, Member, Song, ServiceBlock, ToolTemplate, ToolTemplateOrderItem, ServiceAppliedTemplate } from '@/lib/types'
import styles from './app.module.css'
import { usePersonDrawer } from './persona/PersonDrawer'
import { supabase } from '@/lib/supabase'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'
import { applyOrderTemplate, upsertAppliedTemplate } from '@/lib/toolTemplates'
import { contar } from '@/lib/textos/plural'

const NOTAS = ['A','A#','Bb','B','C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab']
const BLOQUES_PRESET = [
  {titulo:'Preroll',duracion_min:180},
  {titulo:'MC / Bienvenida',duracion_min:300},
  {titulo:'Prédica',duracion_min:2700},
  {titulo:'Plan de salvación',duracion_min:300},
  {titulo:'Ofrenda',duracion_min:300},
  {titulo:'Anuncios',duracion_min:300},
  {titulo:'Closing / Cierre',duracion_min:300},
]

function toMMSS(secs: number): string {
  if (!secs) return '—'
  const m = Math.floor(secs / 60), s = Math.round(secs % 60)
  return `${m}:${s.toString().padStart(2,'0')}`
}
function fromMMSS(val: string): number {
  if (!val) return 0
  if (val.includes(':')) { const [m,s]=val.split(':').map(Number); return (m||0)*60+(s||0) }
  return parseFloat(val)*60
}
function totalToDisplay(seconds: number): string {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds/60), s = Math.round(seconds%60)
  return s > 0 ? `${m}:${s.toString().padStart(2,'0')}` : `${m} min`
}

export const C = { crema:'var(--crema)', cremaDark:'var(--crema-dark)', txt:'var(--ancora-txt)', muted:'var(--ancora-muted)', bg:'var(--legacy-page-bg)', card:'var(--card-bg)' }
// Acento fijo para badges/botones sólidos (fondo oscuro + texto crema), igual en ambos modos
export const ACCENT = '#1A1A1A'
// ── EDIT PANEL (móvil, slide-up) — sin cambios, fuera de alcance de v3 ──
interface EditPanelProps {
  block: ServiceBlock
  songs: Song[]
  members: Member[]
  vozMemberIds: Set<string>
  songCounter: number
  onClose: ()=>void
  onUpdate: (id:string, updates:Partial<ServiceBlock>)=>void
  onDelete: (id:string)=>void
}

function EditPanel({ block, songs, members, vozMemberIds, songCounter, onClose, onUpdate, onDelete }: EditPanelProps) {
  const isSong = block.tipo === 'cancion'
  const song = block.song as any
  const [tono, setTono] = useState(block.tono || '')
  const [leadId, setLeadId] = useState(block.lead_id || '')
  const [songId, setSongId] = useState(block.song_id || '')
  const [titulo, setTitulo] = useState(block.titulo || '')
  const [obs, setObs] = useState((block as any).notas || '')
  const [durInput, setDurInput] = useState(block.duracion_min ? toMMSS(block.duracion_min) : '')
  const [saving, setSaving] = useState(false)

  // punto 17: solo quienes están asignados a ESTE servicio en Voces —
  // ver el cálculo de vozMemberIds en AdminServiceView.
  const vocalistas = members.filter(m => vozMemberIds.has(m.id))

  async function save() {
    setSaving(true)
    if (isSong) {
      const selectedSong = songs.find(s => s.id === songId)
      await onUpdate(block.id, {
        song_id: songId || undefined,
        titulo: selectedSong?.nombre || titulo,
        tono: tono || undefined,
        lead_id: leadId || undefined,
        notas: obs,
      } as any)
    } else {
      await onUpdate(block.id, {
        titulo,
        duracion_min: fromMMSS(durInput) || 0,
        notas: obs,
      } as any)
    }
    setSaving(false)
    onClose()
  }

  const selectedSong = songs.find(s => s.id === songId)

  return (
    <>
      {/* Dimmer */}
      <div onClick={onClose} style={{
        position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,
        backdropFilter:'blur(2px)',WebkitBackdropFilter:'blur(2px)'
      }}/>

      {/* Panel */}
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,
        background:'var(--card-bg)',borderRadius:'16px 16px 0 0',
        border:'0.5px solid var(--crema-dark)',zIndex:201,
        maxHeight:'85vh',overflowY:'auto',
        paddingBottom:'env(safe-area-inset-bottom, 12px)',
        fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif',
      }}>
        {/* Handle */}
        <div style={{width:36,height:4,background:'var(--crema-dark)',borderRadius:2,margin:'12px auto 0'}}/>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px 10px'}}>
          <div style={{fontSize:15,fontWeight:700,color:C.txt}}>
            {isSong ? `✏️ Canción ${songCounter}` : '✏️ Bloque'}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={async ()=>{ if(await confirmar('¿Eliminar este ítem?', { accion: 'Eliminar', peligro: true })) { onDelete(block.id); onClose() } }}
              style={{fontSize:11,fontWeight:600,color:'#E24B4A',background:'#FEE2E2',border:'none',borderRadius:6,padding:'5px 10px',cursor:'pointer',fontFamily:'inherit'}}>
              Eliminar
            </button>
            <button onClick={onClose}
              style={{fontSize:20,color:'var(--ancora-muted)',background:'none',border:'none',cursor:'pointer',lineHeight:1,padding:0}}>
              ✕
            </button>
          </div>
        </div>

        <div style={{padding:'0 16px 16px'}}>
          {isSong ? (
            <>
              {/* Canción selector */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const,color:C.muted,marginBottom:6}}>Canción</div>
                <select
                  value={songId}
                  onChange={e=>setSongId(e.target.value)}
                  style={{width:'100%',background:'var(--crema)',border:'0.5px solid var(--card-border)',borderRadius:8,padding:'10px 12px',fontSize:13,fontWeight:500,color:C.txt,fontFamily:'inherit',outline:'none',appearance:'none',WebkitAppearance:'none' as any}}>
                  <option value="">— Seleccionar canción —</option>
                  {songs.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>

              {/* Tono + Lead */}
              <div style={{display:'flex',gap:10,marginBottom:14}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const,color:C.muted,marginBottom:6}}>Tono</div>
                  <select value={tono} onChange={e=>setTono(e.target.value)}
                    style={{width:'100%',background:'var(--crema)',border:'0.5px solid var(--card-border)',borderRadius:8,padding:'10px 12px',fontSize:13,fontWeight:500,color:C.txt,fontFamily:'inherit',outline:'none',appearance:'none',WebkitAppearance:'none' as any}}>
                    <option value="">—</option>
                    {NOTAS.map(n=><option key={n}>{n}</option>)}
                  </select>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const,color:C.muted,marginBottom:6}}>Lead / Voz</div>
                  <select value={leadId} onChange={e=>setLeadId(e.target.value)}
                    style={{width:'100%',background:'var(--crema)',border:'0.5px solid var(--card-border)',borderRadius:8,padding:'10px 12px',fontSize:13,fontWeight:500,color:C.txt,fontFamily:'inherit',outline:'none',appearance:'none',WebkitAppearance:'none' as any}}>
                    <option value="">— Lead —</option>
                    {vocalistas.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
              </div>

              {/* Links (solo lectura desde la canción) */}
              {selectedSong && (selectedSong as any).link_spotify || (selectedSong as any)?.link_letras || (selectedSong as any)?.link_recursos ? (
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const,color:C.muted,marginBottom:6}}>Links</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap' as const}}>
                    {(selectedSong as any)?.link_spotify && (
                      <a href={(selectedSong as any).link_spotify} target="_blank"
                        style={{display:'flex',alignItems:'center',gap:6,background:'#D8F3DC',borderRadius:8,padding:'7px 12px',fontSize:12,fontWeight:600,color:'#1B4332',textDecoration:'none'}}>
                        {/youtube\.com|youtu\.be/i.test((selectedSong as any).link_spotify)?'▶️ YouTube':/spotify\.com/i.test((selectedSong as any).link_spotify)?'🎧 Spotify':'🎧 Escuchar'}
                      </a>
                    )}
                    {(selectedSong as any)?.link_letras && (
                      <a href={(selectedSong as any).link_letras} target="_blank"
                        style={{display:'flex',alignItems:'center',gap:6,background:'#DBE4FF',borderRadius:8,padding:'7px 12px',fontSize:12,fontWeight:600,color:'#1E3A8A',textDecoration:'none'}}>
                        📄 Letras
                      </a>
                    )}
                    {(selectedSong as any)?.link_recursos && (
                      <a href={(selectedSong as any).link_recursos} target="_blank"
                        style={{display:'flex',alignItems:'center',gap:6,background:'#FFF3CD',borderRadius:8,padding:'7px 12px',fontSize:12,fontWeight:600,color:'#92400E',textDecoration:'none'}}>
                        📁 Recursos
                      </a>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {/* Título bloque */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const,color:C.muted,marginBottom:6}}>Título</div>
                <input value={titulo} onChange={e=>setTitulo(e.target.value)}
                  style={{width:'100%',background:'var(--crema)',border:'0.5px solid var(--card-border)',borderRadius:8,padding:'10px 12px',fontSize:13,fontWeight:500,color:C.txt,fontFamily:'inherit',outline:'none'}}/>
              </div>
              {/* Duración */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const,color:C.muted,marginBottom:6}}>Duración (mm:ss)</div>
                <input value={durInput} onChange={e=>setDurInput(e.target.value)} placeholder="ej. 5:00"
                  style={{width:'100%',background:'var(--crema)',border:'0.5px solid var(--card-border)',borderRadius:8,padding:'10px 12px',fontSize:13,fontWeight:500,color:C.txt,fontFamily:'inherit',outline:'none'}}/>
              </div>
            </>
          )}

          {/* Observación */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const,color:C.muted,marginBottom:6}}>Observación</div>
            <textarea value={obs} onChange={e=>setObs(e.target.value)}
              rows={2} placeholder="ej. puente y coro, repetir estrofa..."
              style={{width:'100%',background:'#FFFBEB',border:'0.5px solid #C9A14A',borderRadius:8,padding:'10px 12px',fontSize:13,color:C.txt,fontFamily:'inherit',outline:'none',resize:'none' as const}}/>
          </div>

          {/* Save */}
          <button onClick={save} disabled={saving}
            style={{width:'100%',background:ACCENT,color:'#F5F0E6',border:'none',borderRadius:10,padding:'13px',fontSize:14,fontWeight:700,fontFamily:'inherit',cursor:'pointer',opacity:saving?0.6:1}}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </>
  )
}

export interface OrdenDelServicioProps {
  service: Service
  blocks: ServiceBlock[]
  setBlocks: (updater: ServiceBlock[] | ((prev: ServiceBlock[]) => ServiceBlock[])) => void
  songs: Song[]
  members: Member[]
  /** Quienes están asignados en una posición de la sección «Voces» de este servicio: el selector de Lead solo lista a esas personas. */
  vozMemberIds: Set<string>
  onBlocksChange: () => void
  canManageTemplates?: boolean
  viewerMemberId?: string
  /** El menú «⋯» de la herramienta: su estado vive en AdminServiceView (lo comparten todas las herramientas del equipo). */
  menuAbierto: boolean
  onAlternarMenu: () => void
  onCerrarMenu: () => void
  /** «Quitar esta herramienta» del menú. */
  onQuitar: () => void
  /** Después de «Vaciar»: el padre cierra el menú «⋯» del encabezado del servicio. */
  alVaciar: () => void
}

export default function OrdenDelServicio({ service, blocks, setBlocks, songs, members, vozMemberIds, onBlocksChange, canManageTemplates, viewerMemberId, menuAbierto, onAlternarMenu, onCerrarMenu, onQuitar, alVaciar }: OrdenDelServicioProps) {
  const { open: openPerson } = usePersonDrawer()
  const [showPresets,setShowPresets] = useState(false)
  const [editingObs,setEditingObs]   = useState<string|null>(null)
  const [obsText,setObsText]         = useState<Record<string,string>>({})
  const [openRowMenuId,setOpenRowMenuId] = useState<string|null>(null)
  // punto 25 — plantillas del Orden del servicio. No es por equipo
  // (tool_templates.team_id null, service_applied_templates.team_tool_id
  // null) — a diferencia de Checklist/Cronograma, que sí viven adentro de
  // sus propios componentes, esto queda acá porque "Orden del servicio"
  // no es un componente aparte, es esta misma vista.
  const [orderTemplates,setOrderTemplates] = useState<ToolTemplate[]>([])
  const [orderApplied,setOrderApplied] = useState<ServiceAppliedTemplate|null>(null)
  const [showApplyOrder,setShowApplyOrder] = useState(false)
  const [pendingApplyOrder,setPendingApplyOrder] = useState<ToolTemplate|null>(null)
  const [showSaveAsOrder,setShowSaveAsOrder] = useState(false)
  const [saveAsOrderName,setSaveAsOrderName] = useState('')
  const [orderTemplateMenuId,setOrderTemplateMenuId] = useState<string|null>(null)
  const [orderRenamingId,setOrderRenamingId] = useState<string|null>(null)
  const [orderRenameValue,setOrderRenameValue] = useState('')
  const [orderMsg,setOrderMsg] = useState('')

  const loadOrderTemplates = useCallback(async () => {
    const { data } = await supabase.from('tool_templates').select('*')
      .eq('tool','order').is('team_id', null).is('archived_at', null).order('name')
    setOrderTemplates(data || [])
  }, [])
  const loadOrderApplied = useCallback(async () => {
    if (!service) { setOrderApplied(null); return }
    const { data } = await supabase.from('service_applied_templates').select('*')
      .eq('service_id', service.id).eq('tool','order').is('team_tool_id', null).maybeSingle()
    setOrderApplied(data || null)
  }, [service])
  useEffect(() => { loadOrderTemplates() }, [loadOrderTemplates])
  useEffect(() => { loadOrderApplied() }, [loadOrderApplied])

  // Mobile edit panel state
  const [editingBlock, setEditingBlock] = useState<ServiceBlock|null>(null)
  const [editingBlockNum, setEditingBlockNum] = useState(0)

  async function addBlock(tipo:'cancion'|'bloque', preset?:{titulo:string,duracion_min:number}) {
    if(!service) return
    // punto 25 — al aplicar una plantilla del Orden, el marcador de
    // canciones queda como una fila real (tipo 'bloque', titulo
    // 'Canciones'). La primera vez que se agrega una canción de verdad,
    // esa fila se convierte en la canción en vez de sumar una fila
    // nueva — así la posición del "bloque de canciones" en el orden no
    // se pierde. Se identifica por título — no hay una columna aparte
    // marcándola, es la versión mínima (ver README).
    if (tipo==='cancion') {
      const marcador = blocks.find(b=>b.tipo==='bloque' && b.titulo==='Canciones')
      if (marcador) {
        setShowPresets(false)
        await updateBlock(marcador.id, { tipo:'cancion', titulo:'Nueva canción', song_id:undefined } as any)
        return
      }
    }
    const orden=(blocks.length||0)+1
    const payload={service_id:service.id,orden,tipo,
      titulo:preset?.titulo||(tipo==='cancion'?'Nueva canción':'Nuevo bloque'),
      duracion_min:preset?.duracion_min||300}
    setShowPresets(false)
    const res = await fetch('/api/service-blocks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    const { block } = await res.json()
    if(block) setBlocks(prev=>[...prev, block])
  }
  async function updateBlock(id:string, updates:Partial<ServiceBlock>) {
    // Se ve al instante — no hace falta esperar ni recargar todo el servicio para un cambio puntual.
    setBlocks(prev=>prev.map(b=>b.id===id?{...b,...updates}:b))
    await fetch('/api/service-blocks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...updates})})
  }
  async function deleteBlock(id:string) {
    setBlocks(prev=>prev.filter(b=>b.id!==id))
    await fetch('/api/service-blocks',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
  }
  function saveObs(blockId:string) {
    updateBlock(blockId,{notas:obsText[blockId]||''} as any)
    setEditingObs(null)
  }

  // ════════ punto 25 — plantillas del Orden del servicio ════════
  // Los bloques fijos guardan título y duración — nunca song_id, tono
  // ni lead_id (eso es contenido de la canción, no estructura). Las
  // canciones se colapsan en UN marcador por tramo consecutivo: la
  // plantilla guarda "acá va el bloque de canciones", no cuántas había.
  function buildOrderContent(): ToolTemplateOrderItem[] {
    const sorted = [...blocks].sort((a,b)=>a.orden-b.orden)
    const content: ToolTemplateOrderItem[] = []
    for (const b of sorted) {
      if (b.tipo==='cancion') {
        if (content[content.length-1]?.tipo !== 'cancion_marker') content.push({ tipo:'cancion_marker' })
      } else {
        content.push({ tipo:'bloque', titulo: b.titulo||'', duracion_min: b.duracion_min ?? undefined })
      }
    }
    return content
  }

  async function saveAsTemplateOrder() {
    const name = saveAsOrderName.trim()
    if (!name) return
    const content = buildOrderContent()
    const { data, error } = await supabase.from('tool_templates').insert({
      organization_id: DEFAULT_ORGANIZATION_ID, team_id: null, tool: 'order', name, content,
      created_by: viewerMemberId || null,
    }).select().single()
    if (error || !data) { setOrderMsg(error?.message || 'Error al guardar'); return }
    await upsertAppliedTemplate(supabase, { serviceId: service!.id, tool: 'order', teamToolId: null, templateId: data.id })
    await loadOrderApplied()
    await loadOrderTemplates()
    setSaveAsOrderName(''); setShowSaveAsOrder(false); setOrderMsg(`✓ Guardada como "${name}"`)
  }

  async function updateAppliedOrderTemplate() {
    if (!orderApplied?.template_id) return
    await supabase.from('tool_templates').update({ content: buildOrderContent() }).eq('id', orderApplied.template_id)
    await loadOrderTemplates()
    setOrderMsg('✓ Plantilla actualizada')
  }

  // Misma función compartida (lib/toolTemplates.ts) que usan las
  // predeterminadas al crear un servicio (app/admin/page.tsx) — ahí
  // arma la fila real del marcador de canciones (tipo 'bloque', titulo
  // 'Canciones'; ver addBlock para cuándo se convierte en canción).
  async function applyTemplateOrder(template: ToolTemplate, mode: 'reemplazar'|'agregar') {
    if (!service) return
    if (mode==='reemplazar') {
      // Reemplazar borra TODO, canciones cargadas incluidas — con su
      // tono y su lead, es trabajo que no se recupera. Se avisa cuántas
      // ANTES de confirmar, no después.
      const cargadas = blocks.filter(b=>b.tipo==='cancion' && b.song_id).length
      if (cargadas>0 && !(await confirmar(`Vas a perder ${cargadas} canción${cargadas>1?'es':''} cargada${cargadas>1?'s':''} (con su tono y su lead) al reemplazar el orden — ¿seguir igual?`, { accion: 'Reemplazar', peligro: true }))) return
    }
    await applyOrderTemplate(supabase, { serviceId: service.id, template, mode })
    onBlocksChange()
    await loadOrderApplied()
    setPendingApplyOrder(null); setShowApplyOrder(false)
  }

  function onPickOrderTemplate(template: ToolTemplate) {
    if (blocks.length>0) setPendingApplyOrder(template)
    else applyTemplateOrder(template, 'reemplazar')
  }

  async function vaciarOrder() {
    if (!service) return
    const cargadas = blocks.filter(b=>b.tipo==='cancion' && b.song_id).length
    const aviso = cargadas>0 ? ` Se pierden ${cargadas} canción${cargadas>1?'es':''} cargada${cargadas>1?'s':''} (con su tono y su lead).` : ''
    if (!(await confirmar(`¿Vaciar el orden del servicio?${aviso}`, { accion: 'Vaciar', peligro: true }))) return
    await supabase.from('service_blocks').delete().eq('service_id', service.id)
    setBlocks([])
    alVaciar()
  }

  async function renameOrderTemplate(id:string) {
    const name = orderRenameValue.trim()
    if (!name) return
    await supabase.from('tool_templates').update({ name }).eq('id', id)
    setOrderRenamingId(null); setOrderRenameValue('')
    await loadOrderTemplates()
  }

  // Al archivar, la predeterminada se limpia en el mismo update — una
  // plantilla archivada no puede seguir siendo la que se aplica sola al
  // crear un servicio.
  async function archiveOrderTemplate(id:string) {
    if (!(await confirmar('¿Archivar esta plantilla? No se borra, deja de aparecer para elegir en nuevos servicios.', { accion: 'Archivar' }))) return
    await supabase.from('tool_templates').update({ archived_at:new Date().toISOString(), default_for_kind:null }).eq('id', id)
    setOrderTemplateMenuId(null)
    await loadOrderTemplates()
  }

  async function setOrderDefaultForKind(id:string, kind:string) {
    const { error } = await supabase.from('tool_templates').update({ default_for_kind: kind||null }).eq('id', id)
    if (error) { setOrderMsg('Ya hay una plantilla predeterminada para ese tipo — cámbiala primero.'); return }
    await loadOrderTemplates()
  }

  const totalSecs = blocks.reduce((s,b)=>{
    const dur = b.tipo==='cancion'&&(b.song as any)?.duracion_min?(b.song as any).duracion_min:(b.duracion_min||0)
    return s+dur
  },0)

  const input:React.CSSProperties = {border:`1px solid var(--card-border)`,borderRadius:8,padding:'7px 11px',fontSize:13,fontFamily:'inherit',outline:'none',background:'var(--card-bg)',color:C.txt}

  // Song counter for numbering
  let songCounter = 0

  return (
    <>
      {/* RIGHT — Order of service. Orden de columnas: Nº · Título ·
               Observaciones · Links · Tono · Lead · Min (regla v3). */}
      <div className={styles.panel}>
            <div className={styles.panelHead} style={{alignItems:'center'}}>
              <h2>Orden del servicio</h2>
              <span className={styles.panelHeadN}>{contar(blocks.length, 'ítem', 'ítems')}</span>
              <span className={styles.panelHeadSpacer}/>
              {/* "Añadir" y el "⋯" de la herramienta viven en la misma
                  fila, alineados a la derecha — el menú de opciones ya
                  no es una franja aparte que descuadra la tarjeta. */}
              <div style={{position:'relative',display:'flex',alignItems:'center',gap:4}}>
                <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnXs}`} onClick={()=>setShowPresets(v=>!v)}>
                  <Plus size={12}/> Añadir
                </button>
                {showPresets&&(
                  <MenuFlotante titulo="Añadir al orden" onCerrar={()=>setShowPresets(false)} claseCaja="" margenDerecho={0} separacion={4} style={{background:'var(--panel-solid)',borderRadius:'var(--r)',boxShadow:'0 10px 22px -14px rgba(10,14,18,.4), inset 0 0 0 1px var(--ring)',zIndex:30,width:190,maxHeight:'60vh',overflowY:'auto',padding:4}}>
                    <button onClick={()=>{addBlock('cancion');setShowPresets(false)}}
                      style={{width:'100%',textAlign:'left',padding:'8px 12px',fontSize:12,fontWeight:600,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink)',borderRadius:'var(--r-s)'}}>
                      Canción
                    </button>
                    <div style={{borderTop:'1px solid var(--rule)',margin:'2px 0'}} role="separator"/>
                    {BLOQUES_PRESET.map(b=>(
                      <button key={b.titulo} onClick={()=>addBlock('bloque',b)}
                        style={{width:'100%',textAlign:'left',padding:'8px 12px',fontSize:12,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink)',display:'flex',justifyContent:'space-between',alignItems:'center',borderRadius:'var(--r-s)'}}>
                        {b.titulo}<span style={{fontSize:10,color:'var(--v3-ink-3)'}}>{toMMSS(b.duracion_min)}</span>
                      </button>
                    ))}
                    <div style={{borderTop:'1px solid var(--rule)',margin:'2px 0'}} role="separator"/>
                    <button onClick={()=>addBlock('bloque')}
                      style={{width:'100%',textAlign:'left',padding:'8px 12px',fontSize:12,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink-3)',borderRadius:'var(--r-s)'}}>
                      Bloque personalizado
                    </button>
                  </MenuFlotante>
                )}
                {/* punto 25 — mismo menú "⋯" que Checklist/Cronograma,
                    con las plantillas del Orden sumadas a "Quitar esta
                    herramienta". No es toolMenu (ese es genérico y no
                    sabe de plantillas) — este vive acá porque el Orden
                    del servicio no es un componente aparte. */}
                <div style={{position:'relative'}}>
                  <button onClick={()=>onAlternarMenu()} aria-label="Acciones del Orden del servicio" className="anc-rowMore" style={{opacity:1}}>
                    <MoreHorizontal size={14}/>
                  </button>
                  {menuAbierto && (
                    <MenuFlotante titulo="Acciones del Orden del servicio" onCerrar={()=>onCerrarMenu()}>
                      {canManageTemplates && (<>
                        <button onClick={()=>{setShowApplyOrder(true);onCerrarMenu()}}>Aplicar plantilla…</button>
                        <button onClick={()=>{setShowSaveAsOrder(true);onCerrarMenu()}} disabled={blocks.length===0}>Guardar como plantilla</button>
                        <button onClick={()=>{updateAppliedOrderTemplate();onCerrarMenu()}} disabled={!orderApplied?.template_id}
                          title={!orderApplied?.template_id ? 'No hay ninguna plantilla aplicada' : undefined}>
                          Actualizar {orderTemplates.find(t=>t.id===orderApplied?.template_id)?.name ? `«${orderTemplates.find(t=>t.id===orderApplied?.template_id)?.name}»` : ''}
                        </button>
                        <div style={{borderTop:'1px solid var(--rule)',margin:'4px 0'}} role="separator"/>
                        <button className="anc-rowMenuDanger" onClick={vaciarOrder} disabled={blocks.length===0}>Vaciar</button>
                        <div style={{borderTop:'1px solid var(--rule)',margin:'4px 0'}} role="separator"/>
                      </>)}
                      <button className="anc-rowMenuDanger" onClick={()=>{onQuitar();onCerrarMenu()}}>
                        <Trash2 size={13}/> Quitar esta herramienta
                      </button>
                    </MenuFlotante>
                  )}
                </div>
              </div>
            </div>

            {orderMsg && <p style={{fontSize:11,color:'var(--v3-ink-3)',padding:'0 16px 8px'}}>{orderMsg}</p>}

            {showApplyOrder && (
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--ring)',background:'var(--sunk)'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <p style={{fontSize:10,fontWeight:700,color:'var(--v3-ink-3)',textTransform:'uppercase',letterSpacing:0.5,margin:0}}>Elegir plantilla</p>
                  <button onClick={()=>setShowApplyOrder(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink-3)'}}><X size={14}/></button>
                </div>
                {orderTemplates.length===0 && <p style={{fontSize:12,color:'var(--v3-ink-3)'}}>Sin plantillas todavía — guarda una desde "Guardar como plantilla".</p>}
                {orderTemplates.map(t=>(
                  <div key={t.id} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 0'}}>
                    {orderRenamingId===t.id ? (
                      <>
                        <input autoFocus style={{...input,flex:1,fontSize:12,padding:'5px 8px'}} value={orderRenameValue}
                          onChange={e=>setOrderRenameValue(e.target.value)} onKeyDown={e=>e.key==='Enter'&&renameOrderTemplate(t.id)} />
                        <button onClick={()=>renameOrderTemplate(t.id)} className={`${styles.btn} ${styles.btnAccent}`} style={{fontSize:11,padding:'5px 10px'}}>Guardar</button>
                        <button onClick={()=>setOrderRenamingId(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink-3)',fontSize:11}}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={()=>onPickOrderTemplate(t)} style={{flex:1,textAlign:'left',cursor:'pointer',background:'var(--card-bg)',border:'1px solid var(--ring)',borderRadius:8,padding:'7px 11px',fontSize:13,fontFamily:'inherit',color:'var(--v3-ink)'}}>
                          {t.name}{t.default_for_kind ? <span style={{color:'var(--v3-ink-3)',fontSize:11}}> · predeterminada de {t.default_for_kind==='service'?'Servicio':t.default_for_kind==='rehearsal'?'Ensayo':'Otro'}</span> : ''}
                        </button>
                        <div style={{position:'relative'}}>
                          <button onClick={()=>setOrderTemplateMenuId(cur=>cur===t.id?null:t.id)} className="anc-rowMore" style={{opacity:1}} aria-label={`Más acciones de ${t.name}`}>
                            <MoreHorizontal size={13}/>
                          </button>
                          {orderTemplateMenuId===t.id && (
                            <MenuFlotante titulo={`Acciones de ${t.name}`} onCerrar={()=>setOrderTemplateMenuId(null)} style={{minWidth:200}}>
                              <button onClick={()=>{setOrderRenamingId(t.id);setOrderRenameValue(t.name);setOrderTemplateMenuId(null)}}>Renombrar</button>
                              <div style={{padding:'6px 10px'}}>
                                <label style={{fontSize:10,color:'var(--v3-ink-3)',display:'block',marginBottom:3}}>Predeterminada para</label>
                                <select value={t.default_for_kind||''} onChange={e=>setOrderDefaultForKind(t.id,e.target.value)}
                                  style={{width:'100%',fontSize:12,padding:'4px 6px',borderRadius:6,border:'1px solid var(--ring)',background:'var(--card-bg)',color:'var(--v3-ink)',fontFamily:'inherit'}}>
                                  <option value="">Ninguna</option>
                                  <option value="service">Servicio</option>
                                  <option value="rehearsal">Ensayo</option>
                                  <option value="other">Otro</option>
                                </select>
                              </div>
                              <button className="anc-rowMenuDanger" onClick={()=>archiveOrderTemplate(t.id)}>Archivar</button>
                            </MenuFlotante>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {pendingApplyOrder && (
                  <div style={{marginTop:10,padding:10,background:'var(--card-bg)',borderRadius:8,border:'1px solid var(--ring)'}}>
                    <p style={{fontSize:12,color:'var(--v3-ink)',marginBottom:8}}>Ya hay bloques hoy — ¿qué hacemos con "{pendingApplyOrder.name}"?</p>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>applyTemplateOrder(pendingApplyOrder,'reemplazar')} className={`${styles.btn} ${styles.btnAccent}`} style={{flex:1}}>Reemplazar</button>
                      <button onClick={()=>applyTemplateOrder(pendingApplyOrder,'agregar')} className={`${styles.btn} ${styles.btnQuiet}`} style={{flex:1}}>Agregar al final</button>
                      <button onClick={()=>setPendingApplyOrder(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink-3)',fontSize:12}}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {showSaveAsOrder && (
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--ring)',background:'var(--sunk)'}}>
                <p style={{fontSize:10,fontWeight:700,color:'var(--v3-ink-3)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Guardar como plantilla</p>
                <div style={{display:'flex',gap:6}}>
                  <input autoFocus style={{...input,flex:1}} placeholder="Nombre (ej. Domingo regular)" value={saveAsOrderName}
                    onChange={e=>setSaveAsOrderName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveAsTemplateOrder()} />
                  <button onClick={saveAsTemplateOrder} disabled={!saveAsOrderName.trim()} className={`${styles.btn} ${styles.btnAccent}`} style={{opacity:saveAsOrderName.trim()?1:0.5}}>Guardar</button>
                  <button onClick={()=>setShowSaveAsOrder(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink-3)'}}>Cancelar</button>
                </div>
              </div>
            )}

            <div className={styles.thead}>
              <span className={styles.colN}/>
              <span className={styles.colTitle}>Título</span>
              <span className={styles.colObs}>Observaciones</span>
              <span className={styles.colLinks}>Links</span>
              <span className={styles.colKey}>Tono</span>
              <span className={styles.colLead}>Lead</span>
              <span className={styles.colMin}>Min</span>
              <span className={styles.colAct}/>
            </div>

            {blocks.length===0&&(
              <div style={{padding:'48px',textAlign:'center',color:'var(--v3-ink-3)',fontSize:13,fontWeight:300}}>
                Sin ítems. Agrega una canción o bloque.
              </div>
            )}

            {blocks.map(block=>{
              const isSong = block.tipo==='cancion'
              const songDur = (block.song as any)?.duracion_min
              if(isSong) songCounter++
              const currentNum = isSong ? songCounter : null
              const blockObs = (block as any).notas || ''
              const currentSongCounter = songCounter

              return(
                <div key={block.id}
                  draggable
                  onDragStart={e=>{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('blockId', block.id) }}
                  onDragOver={e=>{ e.preventDefault(); e.currentTarget.style.background='var(--hover)' }}
                  onDragLeave={e=>{ e.currentTarget.style.background='' }}
                  onDrop={e=>{
                    e.preventDefault(); e.currentTarget.style.background=''
                    const draggedId = e.dataTransfer.getData('blockId')
                    if(draggedId === block.id) return
                    const draggedIdx = blocks.findIndex(b=>b.id===draggedId)
                    const targetIdx  = blocks.findIndex(b=>b.id===block.id)
                    const newOrder = [...blocks]
                    const [moved] = newOrder.splice(draggedIdx,1)
                    newOrder.splice(targetIdx,0,moved)
                    const withOrden = newOrder.map((b,i)=>({...b, orden:i+1}))
                    // Se ve reordenado al instante — el guardado real corre atrás, sin bloquear la UI.
                    setBlocks(withOrden)
                    withOrden.forEach(b=>
                      fetch('/api/service-blocks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:b.id,orden:b.orden})})
                    )
                  }}
                >
                  {/* ── DESKTOP ROW ── */}
                  <div className={`order-row-desktop ${styles.orow} ${!isSong?styles.orowBlock:''}`}>
                    <span className={`${styles.colN} ${styles.orowIdx}`}>{isSong ? currentNum : '—'}</span>

                    {/* TÍTULO — acotado, la observación de al lado es la que crece */}
                    <span className={styles.colTitle}>
                      {isSong ? (
                        <>
                          <select className={styles.songTitle}
                            value={block.song_id||''} onChange={e=>updateBlock(block.id,{song_id:e.target.value||undefined,titulo:songs.find(s=>s.id===e.target.value)?.nombre||''})}>
                            <option value="">— Seleccionar canción —</option>
                            {songs.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                          </select>
                          {(block.song as any)?.artista && <span className={styles.songArtist}>{(block.song as any).artista}</span>}
                        </>
                      ) : (
                        <input defaultValue={block.titulo||''} onBlur={e=>updateBlock(block.id,{titulo:e.target.value})}
                          className={styles.songTitle}/>
                      )}
                    </span>

                    {/* OBSERVACIONES — la columna elástica, invisible en reposo si está vacía */}
                    <span className={styles.colObs}>
                      {isSong && (
                        <textarea rows={1} placeholder="Agregar observación" value={editingObs===block.id?(obsText[block.id]??blockObs):blockObs}
                          className={`${styles.obs} ${!blockObs?styles.obsEmpty:''}`}
                          onFocus={()=>{setEditingObs(block.id);setObsText(prev=>prev[block.id]!==undefined?prev:{...prev,[block.id]:blockObs})}}
                          onChange={e=>setObsText(prev=>({...prev,[block.id]:e.target.value}))}
                          onBlur={()=>saveObs(block.id)}
                          onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();(e.target as HTMLTextAreaElement).blur()}if(e.key==='Escape')setEditingObs(null)}}/>
                      )}
                    </span>

                    {/* LINKS */}
                    <span className={`${styles.colLinks} ${styles.links}`}>
                      {isSong && block.song && (block.song as any).link_spotify && (
                        <a href={(block.song as any).link_spotify} target="_blank" aria-label="Audio"><Headphones size={14}/></a>
                      )}
                      {isSong && block.song && ((block.song as any).link_letras || (block.song as any).link_recursos) && (
                        <a href={(block.song as any).link_letras || (block.song as any).link_recursos} target="_blank" aria-label="Letra/partitura"><FileText size={14}/></a>
                      )}
                    </span>

                    {/* TONO — sin appearance:none acá la flecha nativa del <select>
                        se comía el aire de una columna de 28px (punto 19: no era un
                        problema de ancho, los anchos ya coinciden con el mockup). */}
                    <span className={`${styles.colKey} ${styles.key}`}>
                      {isSong && (
                        <select style={{background:'transparent',border:'none',outline:'none',font:'inherit',color:'inherit',textAlign:'center',width:'100%',appearance:'none',WebkitAppearance:'none',MozAppearance:'none'}}
                          value={block.tono||''} onChange={e=>updateBlock(block.id,{tono:e.target.value||undefined})}>
                          <option value="">—</option>
                          {NOTAS.map(n=><option key={n}>{n}</option>)}
                        </select>
                      )}
                    </span>

                    {/* LEAD */}
                    <span className={styles.colLead}>
                      {isSong && (
                        <span className={`${styles.lead} ${!block.lead_id?styles.leadUnassigned:''}`} style={{display:'flex',alignItems:'center',gap:2}}>
                          <select style={{background:'transparent',border:'none',outline:'none',font:'inherit',color:'inherit',flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis'}}
                            value={block.lead_id||''} onChange={e=>updateBlock(block.id,{lead_id:e.target.value||undefined})}>
                            <option value="">Sin asignar</option>
                            {members.filter(m=>vozMemberIds.has(m.id)).map(m=>(
                              <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                          </select>
                          {block.lead_id && (
                            <button type="button" title="Ver persona" onClick={e=>{e.stopPropagation(); openPerson(block.lead_id!)}}
                              style={{flex:'none',width:14,height:14,display:'grid',placeItems:'center',border:0,background:'none',color:'var(--v3-ink-3)',cursor:'pointer',borderRadius:3}}>
                              <User size={10}/>
                            </button>
                          )}
                        </span>
                      )}
                    </span>

                    {/* MIN — duración, editable para los bloques */}
                    <span className={`${styles.colMin} ${styles.dur}`}>
                      {isSong && songDur ? toMMSS(songDur)
                        : isSong ? '—'
                        : (
                          <input type="text" placeholder="mm:ss" defaultValue={block.duracion_min?toMMSS(block.duracion_min):''}
                            onBlur={e=>updateBlock(block.id,{duracion_min:fromMMSS(e.target.value)||0})}
                            style={{width:44,fontSize:11,padding:'2px 4px',border:0,boxShadow:'inset 0 0 0 1px var(--ring)',borderRadius:'var(--r-s)',fontFamily:'inherit',textAlign:'right',color:'inherit',background:'var(--panel-solid)'}}/>
                        )}
                    </span>

                    <span className={styles.colAct}>
                      <button className={styles.rowMore} aria-label={`Acciones para ${isSong?(block.song as any)?.nombre||block.titulo:block.titulo}`}
                        onClick={()=>setOpenRowMenuId(cur=>cur===block.id?null:block.id)}>
                        <MoreHorizontal size={13}/>
                      </button>
                      {openRowMenuId===block.id && (
                        <MenuFlotante titulo="Acciones del ítem" onCerrar={()=>setOpenRowMenuId(null)} claseCaja={styles.rowMenu}>
                          <button className={styles.rowMenuDanger} onClick={()=>{deleteBlock(block.id);setOpenRowMenuId(null)}}>
                            <Trash2 size={13}/> Eliminar
                          </button>
                        </MenuFlotante>
                      )}
                    </span>
                  </div>

                  {/* ── MOBILE ROW — tap to edit (sin cambios, fuera de alcance de v3) ── */}
                  <div className="order-row-mobile"
                    onClick={()=>{ setEditingBlock(block); setEditingBlockNum(currentSongCounter) }}
                    style={{
                      display:'none',
                      alignItems:'center',gap:10,padding:'11px 14px',
                      borderBottom:`0.5px solid #E8E0D0`,
                      cursor:'pointer',
                      background: isSong ? 'var(--card-bg)' : C.bg,
                      WebkitTapHighlightColor:'transparent',
                    }}>
                    {/* Left: duration or num */}
                    {isSong ? (
                      <div style={{width:20,height:20,borderRadius:'50%',background:ACCENT,color:'#F5F0E6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0}}>
                        {currentNum}
                      </div>
                    ) : (
                      <span style={{fontSize:10,fontWeight:600,background:C.cremaDark,color:C.muted,padding:'2px 6px',borderRadius:3,flexShrink:0}}>bloque</span>
                    )}

                    {/* Center: title + sub */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:isSong?600:400,color:isSong?C.txt:C.muted,fontStyle:isSong?'normal':'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {isSong ? ((block.song as any)?.nombre || block.titulo || '— canción —') : (block.titulo || 'Sin título')}
                      </div>
                      {isSong && (
                        <div style={{fontSize:11,color:C.muted,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {block.lead_id ? members.find(m=>m.id===block.lead_id)?.nombre || '' : ''}
                          {blockObs ? (block.lead_id ? ' · ' : '') + '📝 ' + blockObs : ''}
                        </div>
                      )}
                      {!isSong && block.duracion_min ? (
                        <div style={{fontSize:11,color:C.muted,marginTop:1}}>{toMMSS(block.duracion_min)}</div>
                      ) : null}
                    </div>

                    {/* Right: tono + chevron */}
                    <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                      {isSong && block.tono && (
                        <span style={{fontSize:11,fontWeight:600,background:'rgba(0,0,0,0.06)',color:C.txt,padding:'2px 7px',borderRadius:4}}>
                          {block.tono}
                        </span>
                      )}
                      <span style={{fontSize:16,color:'#CCC',lineHeight:1}}>›</span>
                    </div>
                  </div>
                </div>
              )
            })}

            {blocks.length>0&&(
              <div className={styles.total}>
                <span className={styles.totalK}>Total</span>
                <span className={styles.totalV}>{totalToDisplay(totalSecs)}</span>
              </div>
            )}
          </div>
      {editingBlock && (
        <EditPanel
          block={editingBlock}
          songs={songs}
          members={members}
          vozMemberIds={vozMemberIds}
          songCounter={editingBlockNum}
          onClose={()=>setEditingBlock(null)}
          onUpdate={async (id, updates)=>{ await updateBlock(id, updates) }}
          onDelete={async (id)=>{ await deleteBlock(id) }}
        />
      )}
    </>
  )
}
