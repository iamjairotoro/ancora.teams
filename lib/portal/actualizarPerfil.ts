// Guardar «Mis datos» del Perfil (punto 54, commit 1). Lo comparten /api/portal/me y /api/member-portal (antes cada una tenía su copia). Solo servidor.
//   · nombre es obligatorio; los textos se recortan a 200 caracteres; la fecha de nacimiento, si viene, debe ser AAAA-MM-DD válida (vacía = quitarla).
//   · `instrumentos` SOLO se escribe si el cuerpo lo trae como lista: el Perfil ya no lo muestra ni lo manda, y guardar «Mis datos» NO debe vaciar esa columna.
import { MSG } from '@/lib/textos/mensajes'
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, 200) : null)
const esFecha = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v + 'T12:00:00Z').toISOString().slice(0, 10) === v

export async function actualizarPerfil(admin: SupabaseClient, memberId: string, b: Record<string, unknown>): Promise<{ status: number; body: { ok?: true; error?: string } }> {
  const nombre = str(b.nombre)
  if (!nombre?.trim()) return { status: 400, body: { error: 'El nombre es obligatorio' } }
  const nacimiento = str(b.fecha_nacimiento)?.trim() || null
  if (nacimiento && !esFecha(nacimiento)) return { status: 400, body: { error: 'La fecha de nacimiento no es válida' } }
  const cambios: Record<string, unknown> = { nombre, apellido: str(b.apellido), telefono: str(b.telefono), fecha_nacimiento: nacimiento }
  if (Array.isArray(b.instrumentos)) cambios.instrumentos = b.instrumentos.filter((i: unknown): i is string => typeof i === 'string').slice(0, 30)
  const { error } = await admin.from('members').update(cambios).eq('id', memberId)
  if (error) return { status: 500, body: { error: MSG.noSePudoGuardar } }
  return { status: 200, body: { ok: true } }
}
