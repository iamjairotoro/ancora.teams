'use client'
import { useState, useEffect, useMemo } from 'react'
import { ChevronRight, ChevronDown, Pencil, Trash2, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Team } from '@/lib/types'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'

const LIGHT_C = { crema:'#F2F1EE', cremaDark:'#D6D5D1', txt:'#1A1A1A', muted:'#AAAAAA', card:'#FFFFFF' }
const DARK_C  = { crema:'rgba(255,255,255,0.06)', cremaDark:'rgba(255,255,255,0.08)', txt:'#F5F0E6', muted:'rgba(255,255,255,0.45)', card:'rgba(255,255,255,0.06)' }
const ACCENT = '#1A1A1A'

interface Props { darkMode?: boolean }

interface TeamNode extends Team { children: TeamNode[] }

function buildTree(flat: Team[]): TeamNode[] {
  const byId = new Map<string, TeamNode>(flat.map(t => [t.id, { ...t, children: [] }]))
  const roots: TeamNode[] = []
  Array.from(byId.values()).forEach(node => {
    const parent = node.parent_team_id ? byId.get(node.parent_team_id) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  })
  return roots
}

function getDescendants(teamId: string, flat: Team[]): Team[] {
  const children = flat.filter(t => t.parent_team_id === teamId)
  return children.flatMap(c => [c, ...getDescendants(c.id, flat)])
}

export default function TeamsAdminPanel({ darkMode }: Props) {
  const C = darkMode ? DARK_C : LIGHT_C
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [newName, setNewName] = useState('')
  const [newParentId, setNewParentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    const { data } = await supabase
      .from('teams')
      .select('id, organization_id, parent_team_id, nombre, created_at')
      .eq('organization_id', DEFAULT_ORGANIZATION_ID)
      .order('nombre')
    setTeams(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const tree = useMemo(() => buildTree(teams), [teams])

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function addTeam() {
    if (!newName.trim()) return
    setSaving(true); setErr(''); setMsg('')
    const { error } = await supabase.from('teams').insert({
      nombre: newName.trim(),
      parent_team_id: newParentId || null,
      organization_id: DEFAULT_ORGANIZATION_ID,
    })
    if (error) setErr(error.message)
    else { setMsg(`✓ "${newName}" agregado`); setNewName(''); setNewParentId(''); await load() }
    setSaving(false)
  }

  async function saveRename(id: string) {
    if (!editingName.trim()) return
    await supabase.from('teams').update({ nombre: editingName.trim() }).eq('id', id)
    setEditingId(null)
    await load()
  }

  async function deleteTeam(node: TeamNode) {
    const descendants = getDescendants(node.id, teams)
    const warning = descendants.length
      ? `¿Borrar "${node.nombre}"? También se van a borrar estos ${descendants.length} sub-equipo(s):\n\n${descendants.map(d => `— ${d.nombre}`).join('\n')}\n\nLos miembros no se borran, solo quedan sin este equipo.`
      : `¿Borrar "${node.nombre}"?`
    if (!confirm(warning)) return
    const { error } = await supabase.from('teams').delete().eq('id', node.id)
    if (error) setErr(error.message)
    else { setMsg(`"${node.nombre}" eliminado`); await load() }
  }

  const input: React.CSSProperties = { border:`0.5px solid ${C.cremaDark}`,borderRadius:8,padding:'9px 12px',fontSize:13,fontFamily:'inherit',outline:'none',color:C.txt,background:C.card }
  const btnDark: React.CSSProperties = { background:ACCENT,color:'#F5F0E6',border:'none',borderRadius:8,padding:'9px 16px',fontSize:12,fontWeight:600,fontFamily:'inherit',cursor:'pointer' }
  const iconBtn: React.CSSProperties = { background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',alignItems:'center',color:C.muted }

  function renderNode(node: TeamNode, depth: number) {
    const isExpanded = expanded.has(node.id)
    const isEditing = editingId === node.id
    return (
      <div key={node.id}>
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',paddingLeft:16+depth*20,borderBottom:`0.5px solid ${C.crema}`}}>
          {node.children.length ? (
            <button onClick={() => toggleExpand(node.id)} style={iconBtn}>
              {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
            </button>
          ) : <span style={{width:22}}/>}

          {isEditing ? (
            <>
              <input style={{...input,flex:1,padding:'5px 8px'}} value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveRename(node.id)}
                autoFocus />
              <button onClick={() => saveRename(node.id)} style={{...btnDark,padding:'5px 10px',fontSize:11}}>Guardar</button>
              <button onClick={() => setEditingId(null)} style={{...iconBtn,fontSize:11,color:C.muted}}>Cancelar</button>
            </>
          ) : (
            <>
              <span style={{flex:1,fontSize:13,fontWeight:depth===0?700:500,color:C.txt}}>{node.nombre}</span>
              <button onClick={() => { setEditingId(node.id); setEditingName(node.nombre) }} style={iconBtn} title="Renombrar">
                <Pencil size={13}/>
              </button>
              <button onClick={() => deleteTeam(node)} style={{...iconBtn,color:'#B91C1C'}} title="Borrar">
                <Trash2 size={13}/>
              </button>
            </>
          )}
        </div>
        {isExpanded && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div style={{maxWidth:640,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'14px 16px',borderBottom:`0.5px solid ${C.cremaDark}`,background:C.crema}}>
          <h2 style={{fontSize:13,fontWeight:700,color:C.txt,letterSpacing:0.5,textTransform:'uppercase',marginBottom:2}}>Equipos</h2>
          <p style={{fontSize:11,color:C.muted}}>Estructura organizacional — equipos y sub-equipos anidados.</p>
        </div>

        {loading ? (
          <div style={{padding:32,textAlign:'center',color:C.muted,fontSize:13}}>Cargando...</div>
        ) : tree.length === 0 ? (
          <div style={{padding:32,textAlign:'center',color:C.muted,fontSize:13}}>Sin equipos todavía — agrega el primero abajo.</div>
        ) : (
          <div>{tree.map(node => renderNode(node, 0))}</div>
        )}

        <div style={{padding:'14px 16px',borderTop:`0.5px solid ${C.cremaDark}`,background:C.crema}}>
          {msg && <p style={{fontSize:12,color:'#1B4332',background:'#D8F3DC',padding:'6px 10px',borderRadius:6,marginBottom:10,fontWeight:500}}>{msg}</p>}
          {err && <p style={{fontSize:12,color:'#B91C1C',background:'#FEE2E2',padding:'6px 10px',borderRadius:6,marginBottom:10,fontWeight:500}}>{err}</p>}
          <p style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Agregar equipo</p>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <input
              style={{...input,flex:1,minWidth:160}}
              placeholder="Nombre del equipo"
              value={newName}
              onChange={e => { setNewName(e.target.value); setErr(''); setMsg('') }}
              onKeyDown={e => e.key === 'Enter' && addTeam()}
            />
            <select style={{...input,minWidth:180}} value={newParentId} onChange={e => setNewParentId(e.target.value)}>
              <option value="">— Ninguno (equipo raíz) —</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
            <button onClick={addTeam} disabled={saving || !newName.trim()} style={{...btnDark,opacity:saving||!newName.trim()?0.5:1,display:'flex',alignItems:'center',gap:4}}>
              <Plus size={13}/> {saving ? '...' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
