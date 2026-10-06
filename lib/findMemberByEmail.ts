// Busca una persona por correo SIN distinguir mayúsculas ni espacios, y
// escapando _ y % (comodines de LIKE) y \ para que un correo se compare literal
// (y se confirma la igualdad exacta del lado de la app).
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as browserClient } from './supabase'
import { dbErrorText } from './addToTeam'

export type FindMemberResult =
  | { status: 'found'; id: string; email: string; nombre: string }
  | { status: 'not-found' }
  | { status: 'ambiguous' }                  // dos personas con el mismo correo (solo cambian mayúsculas)
  | { status: 'error'; message: string }

/** minúsculas y sin ningún espacio. */
export const normalizeEmail = (raw: string) => raw.replace(/\s+/g, '').toLowerCase()
/** escapa los comodines de LIKE/ILIKE (backslash primero). */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, c => '\\' + c)

// `client`: por defecto el del navegador; en el servidor se pasa el de la sesión o el
// de servicio. Es la ÚNICA forma de buscar a una persona por correo (el login, el
// portal y AuthGate la comparten): nunca `.eq('email', …)`, que distingue mayúsculas.
export async function findMemberByEmail(raw: string, client: SupabaseClient = browserClient): Promise<FindMemberResult> {
  const email = normalizeEmail(raw)
  if (!email) return { status: 'not-found' }
  const { data, error } = await client.from('members').select('id, email, nombre').ilike('email', escapeLike(email)).limit(10)
  if (error) return { status: 'error', message: dbErrorText(error, 'No se pudo buscar a la persona.') }
  // PostgREST toma «*» como comodín además de «%»: se confirma la igualdad exacta acá.
  const exact = (data || []).filter(m => normalizeEmail(m.email || '') === email)
  if (exact.length === 0) return { status: 'not-found' }
  if (exact.length > 1) return { status: 'ambiguous' }
  return { status: 'found', id: exact[0].id, email: exact[0].email, nombre: exact[0].nombre }
}
