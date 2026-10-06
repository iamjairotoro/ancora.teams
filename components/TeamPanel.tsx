'use client'
/* «Personas»: la lista con su ficha fija (PersonasList.tsx) más lo que la
   alimenta — membresías, posiciones, roles — y las acciones de alta, baja y
   «agregar a un equipo». La antigua «vista de perfil» (?profile=) se retiró en
   el punto 46: lo que hacía vive en la ficha, en Equipos o se descartó (ver
   README). */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Member, Team, TeamPosition } from '@/lib/types'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'
import { usePersonDrawer } from './persona/PersonDrawer'
import AddPersonDialog, { PersonToast, type NewPersonPayload, type SubmitResult, type MembersChangedInfo } from './AddPersonDialog'
import PersonasList from './PersonasList'
import { buildPositionIndex } from '@/lib/personPositions'
import { addToTeam } from '@/lib/addToTeam'

interface Props {
  members: Member[]
  onRefresh: () => void
  // PersonasPanel registra acá la acción de alta (abre el formulario de
  // "Nuevo integrante"): su botón primario del encabezado es el único
  // "Agregar persona" — el que vivía en el cuerpo de esta pestaña se sacó.
  onRequestNew?: (trigger: () => void) => void
  // Punto 39: avisa al padre de cualquier cambio que afecte a las listas de
  // personas o de equipos. Si no se pasa, el alta/edición/borrado se limita
  // a onRefresh (solo members), como antes.
  onMembersChanged?: (info?: MembersChangedInfo) => void
}

interface FlatTeamMember { id: string; member_id: string; team_id: string; is_leader: boolean }
interface FlatLink { team_member_id: string; team_position_id: string }

export default function TeamPanel({ members, onRefresh, onRequestNew, onMembersChanged }: Props) {
  const { canEdit } = usePersonDrawer()

  const [teams, setTeams] = useState<Team[]>([])
  const [teamsStatus, setTeamsStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [positions, setPositions] = useState<TeamPosition[]>([])
  const [teamMembers, setTeamMembers] = useState<FlatTeamMember[]>([])
  const [memberPositions, setMemberPositions] = useState<FlatLink[]>([])
  // Posiciones por persona, agrupadas por equipo: un solo recorrido de las
  // listas que ya se cargan, sin consultas por fila.
  const positionIndex = useMemo(
    () => buildPositionIndex({ teams, positions, teamMembers, memberPositions }),
    [teams, positions, teamMembers, memberPositions],
  )

  // Agregar a un equipo desde la ficha: un solo camino, lib/addToTeam.ts.
  // addBusy deshabilita el botón mientras guarda; el error queda visible.
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<{ personId: string; text: string } | null>(null)

  // Cambió una persona: recarga completa si el padre la ofrece, si no solo members.
  function peopleChanged() { if (onMembersChanged) onMembersChanged(); else onRefresh() }

  // Alta: el botón primario del encabezado de PersonasPanel (único "Agregar
  // persona" de la pestaña) abre el pop-up. La edición vive en /admin (mismo
  // pop-up, modo edición), que se pide desde la ficha.
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState('')
  useEffect(() => { onRequestNew?.(() => setAdding(true)) }, [onRequestNew])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const loadMemberTeams = useCallback(async () => {
    const [teamsRes, posRes, tmRes, mpRes] = await Promise.all([
      supabase.from('teams').select('id, organization_id, name, description, sort_order, archived_at, color, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null),
      supabase.from('team_positions').select('id, organization_id, team_id, name, code, default_slots, sort_order, archived_at, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null),
      supabase.from('team_members').select('id, member_id, team_id, is_leader').eq('organization_id', DEFAULT_ORGANIZATION_ID),
      supabase.from('team_member_positions').select('team_member_id, team_position_id'),
    ])
    setTeams(teamsRes.data || [])
    setTeamsStatus(teamsRes.error ? 'error' : 'ready')
    setPositions(posRes.data || [])
    setTeamMembers((tmRes.data || []) as FlatTeamMember[])
    setMemberPositions((mpRes.data || []) as FlatLink[])
  }, [])

  // Rol de organización (organization_members): lo que se ve como etiqueta
  // «Admin» / «Propietario» en la lista. Solo lo lee quien puede editar (la
  // política de lectura de organization_members es de admins) y es de solo lectura.
  const [roleByMember, setRoleByMember] = useState<Map<string, 'owner' | 'admin'> | null>(null)
  const loadRoles = useCallback(async () => {
    if (!canEdit) { setRoleByMember(null); return }
    const { data, error } = await supabase.from('organization_members')
      .select('person_id, role').eq('organization_id', DEFAULT_ORGANIZATION_ID).in('role', ['owner', 'admin'])
    if (error || !data) { setRoleByMember(null); return } // sin datos: sin etiquetas (no se inventan)
    setRoleByMember(new Map(data.map((r: any) => [r.person_id, r.role] as [string, 'owner' | 'admin'])))
  }, [canEdit])

  useEffect(() => { loadMemberTeams(); loadRoles() }, [loadMemberTeams, loadRoles])

  // Las membresías de acá se cargan al montar. Si /admin recarga a las personas
  // (p. ej. al guardar el pop-up de edición, que también agrega equipos), hay
  // que volver a pedirlas: si no, la lista seguiría diciendo «Sin equipo».
  const firstMembers = useRef(true)
  useEffect(() => {
    if (firstMembers.current) { firstMembers.current = false; return }
    loadMemberTeams()
  }, [members, loadMemberTeams])

  // Alta desde el pop-up. Mismo insert de siempre en `members` (devolviendo
  // el error de la base en vez de ignorarlo: duplicado 23505, RLS, red) y,
  // si se eligieron equipos, UN solo insert de varias filas en team_members
  // (todo o nada, sin posiciones: se asignan después desde Equipos). Si la
  // persona se crea pero los equipos fallan, se informa como parcial.
  async function addPerson(payload: NewPersonPayload, teamIds: string[]): Promise<SubmitResult> {
    const { data, error } = await supabase.from('members').insert(payload).select('id').single()
    if (error || !data) return { status: 'error', error: { code: error?.code, message: error?.message || 'No se pudo guardar. Intentá de nuevo.' } }
    if (teamIds.length) {
      const { error: tmErr } = await supabase.from('team_members').insert(
        teamIds.map(team_id => ({ member_id: data.id, team_id, organization_id: DEFAULT_ORGANIZATION_ID })),
      )
      if (tmErr) return { status: 'partial', teams: teamIds.map(id => ({ id, name: teams.find(t => t.id === id)?.name || '' })) }
    }
    return { status: 'ok' }
  }

  // true si se eliminó (la lista de Personas mueve la selección a la vecina).
  async function del(id: string): Promise<boolean> {
    if (!confirm('¿Eliminar este integrante?')) return false
    await supabase.from('members').delete().eq('id', id)
    peopleChanged()
    return true
  }

  // Menú «Agregar a un equipo» de la ficha. addToTeam: un duplicado es «ya
  // estaba»; cualquier otro error o 0 filas queda visible. Se refresca SIEMPRE:
  // las listas de acá y las del padre (/admin).
  async function addFromFicha(personId: string, teamId: string) {
    if (addBusy) return
    setAddError(null)
    const who = members.find(m => m.id === personId)?.nombre || 'La persona'
    const teamLabel = teams.find(t => t.id === teamId)?.name || 'el equipo'
    setAddBusy(true)
    const res = await addToTeam(personId, teamId)
    await loadMemberTeams()
    onMembersChanged?.()
    setAddBusy(false)
    if (res.status === 'error') setAddError({ personId, text: `No se pudo agregar a ${teamLabel}: ${res.message}` })
    else setToast(res.status === 'already' ? `${who} ya estaba en ${teamLabel}` : `Se agregó ${who} a ${teamLabel}`)
  }

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'es')),
    [teams],
  )

  return (
    <div className="space-y-4">
      {adding && (
        <AddPersonDialog
          existingEmails={members.map(m => m.email || '')}
          teams={sortedTeams.map(t => ({ id: t.id, name: t.name }))}
          teamsStatus={teamsStatus}
          onSubmit={addPerson}
          onSaved={name => { peopleChanged(); loadMemberTeams(); setToast(`Se agregó ${name}`) }}
          onPartial={info => { loadMemberTeams(); if (onMembersChanged) onMembersChanged({ partialTeamFailure: info }); else onRefresh() }}
          onClose={() => setAdding(false)}
        />
      )}
      <PersonToast message={toast} />

      {members.length === 0 ? (
        <div className="card overflow-hidden">
          <p className="p-4 text-sm text-gray-400 dark:text-white/30">Sin integrantes. Agrega el primero.</p>
        </div>
      ) : (
        <PersonasList members={members} teams={sortedTeams} teamMembers={teamMembers} positionIndex={positionIndex}
          ready={teamsStatus === 'ready'} roleByMember={roleByMember} onDelete={del}
          onAddToTeam={addFromFicha} addBusy={addBusy} addError={addError} onClearAddError={() => setAddError(null)} />
      )}
    </div>
  )
}
