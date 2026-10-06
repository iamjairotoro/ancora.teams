// setOrgRole: LA función que cambia el rol de administrador de una persona.
// La usan la pestaña Admins y (en el commit siguiente) la píldora del pop-up
// de «Editar»: cada interfaz es una pieza delgada que solo llama a esta
// función; retirar una es borrar esa pieza.
//
// Reglas (no se amplían):
// - SOLO se pasa de/hacia 'admin'. Un 'owner' NUNCA se toca (se rechaza): así
//   la organización no queda sin propietario.
// - 'admin' desde 'member' (fila existente) → UPDATE a 'admin'. Sin fila →
//   INSERT. Ya 'admin' → ya está. Quitar → DELETE de la fila de 'admin'.
// - Cada escritura pide las filas de vuelta: un update/delete que la política
//   (RLS) deja en 0 filas NO es un éxito. La política de escritura de
//   organization_members es solo del propietario.
// - team_admins (team_id null) se mantiene SINCRONIZADA: rsvp-notify la lee para
//   decidir a quién avisar cuando alguien confirma o declina. Si el rol se
//   aplicó pero esa sincronización falla → 'sync-failed' (el rol SÍ cambió) y
//   syncAdminNotices() se puede repetir (idempotente).
//   DEUDA: retirar cuando rsvp-notify lea organization_members con la llave de
//   servicio (ver README).

import { supabase } from './supabase'
import { DEFAULT_ORGANIZATION_ID } from './constants'
import { dbErrorText } from './addToTeam'

export type SetOrgRoleResult =
  | { status: 'ok' }                          // rol aplicado y avisos sincronizados
  | { status: 'unchanged' }                   // ya estaba así (los avisos también quedan sincronizados)
  | { status: 'rejected'; message: string }   // no se hace (p. ej. el propietario)
  | { status: 'error'; message: string }      // el rol NO se aplicó
  | { status: 'sync-failed'; message: string } // el rol SÍ se aplicó; no se sincronizaron los avisos

export type SyncResult = { ok: true } | { ok: false; message: string }

/** Deja team_admins (team_id null) igual que el rol: con fila si es admin, sin fila si no. Idempotente. */
export async function syncAdminNotices(personId: string, isAdmin: boolean): Promise<SyncResult> {
  const { data: rows, error } = await supabase.from('team_admins').select('id')
    .eq('member_id', personId).is('team_id', null).eq('organization_id', DEFAULT_ORGANIZATION_ID)
  if (error) return { ok: false, message: dbErrorText(error, 'No se pudo leer team_admins.') }
  const existing = rows || []

  if (isAdmin) {
    if (existing.length > 0) return { ok: true }
    // team_id null no choca con el unique de la tabla (los nulos son distintos):
    // por eso se mira antes de insertar, para no duplicar filas.
    const { data, error: insErr } = await supabase.from('team_admins')
      .insert({ member_id: personId, team_id: null, organization_id: DEFAULT_ORGANIZATION_ID }).select('id')
    if (insErr && insErr.code !== '23505') return { ok: false, message: dbErrorText(insErr, 'No se pudo agregar a team_admins.') }
    if (!insErr && (!data || data.length === 0)) return { ok: false, message: 'No se agregó ninguna fila a team_admins — revisá permisos.' }
    return { ok: true }
  }

  if (existing.length === 0) return { ok: true }
  const { data, error: delErr } = await supabase.from('team_admins').delete()
    .eq('member_id', personId).is('team_id', null).eq('organization_id', DEFAULT_ORGANIZATION_ID).select('id')
  if (delErr) return { ok: false, message: dbErrorText(delErr, 'No se pudo quitar de team_admins.') }
  if (!data || data.length === 0) return { ok: false, message: 'No se quitó ninguna fila de team_admins — revisá permisos.' }
  return { ok: true }
}

export async function setOrgRole(personId: string, role: 'admin' | 'member'): Promise<SetOrgRoleResult> {
  const { data: current, error: readErr } = await supabase.from('organization_members').select('role')
    .eq('person_id', personId).eq('organization_id', DEFAULT_ORGANIZATION_ID).maybeSingle()
  if (readErr) return { status: 'error', message: dbErrorText(readErr, 'No se pudo leer el rol actual.') }
  const currentRole = (current?.role ?? null) as 'owner' | 'admin' | 'member' | null

  if (currentRole === 'owner') return { status: 'rejected', message: 'El propietario no se cambia desde aquí.' }

  let changed = false
  if (role === 'admin') {
    if (currentRole === 'admin') {
      changed = false
    } else if (currentRole === 'member') {
      // Ya hay una fila de 'member': un insert daría 23505. Se actualiza.
      const { data, error } = await supabase.from('organization_members').update({ role: 'admin' })
        .eq('person_id', personId).eq('organization_id', DEFAULT_ORGANIZATION_ID).eq('role', 'member').select('person_id')
      if (error) return { status: 'error', message: dbErrorText(error, 'No se pudo dar el rol de administrador.') }
      if (!data || data.length === 0) return { status: 'error', message: 'No se modificó ninguna fila — revisá permisos.' }
      changed = true
    } else {
      const { data, error } = await supabase.from('organization_members')
        .insert({ organization_id: DEFAULT_ORGANIZATION_ID, person_id: personId, role: 'admin' }).select('person_id')
      if (error) return { status: 'error', message: dbErrorText(error, 'No se pudo dar el rol de administrador.') }
      if (!data || data.length === 0) return { status: 'error', message: 'No se agregó ninguna fila — revisá permisos.' }
      changed = true
    }
  } else if (currentRole === 'admin') {
    const { data, error } = await supabase.from('organization_members').delete()
      .eq('person_id', personId).eq('organization_id', DEFAULT_ORGANIZATION_ID).eq('role', 'admin').select('person_id')
    if (error) return { status: 'error', message: dbErrorText(error, 'No se pudo quitar el rol de administrador.') }
    if (!data || data.length === 0) return { status: 'error', message: 'No se quitó ninguna fila — revisá permisos.' }
    changed = true
  }

  const sync = await syncAdminNotices(personId, role === 'admin')
  if (!sync.ok) return { status: 'sync-failed', message: sync.message }
  return changed ? { status: 'ok' } : { status: 'unchanged' }
}
