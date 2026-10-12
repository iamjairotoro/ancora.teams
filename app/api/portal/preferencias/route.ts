// Preferencias del PORTAL: tema (members.theme: 'light' | 'dark' | null = Sistema) y, desde el punto 55, la tipografía de la letra
// («Aa»: fuente y tamaño, dentro de members.chart_prefs, que la administración comparte). Solo el portal usa esta ruta; la
// administración sigue guardando directo con su sesión de Google.
import { NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'
import { lyricPrefsFrom, parseLyricPrefsPatch } from '@/lib/lyricPrefs'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const { data, error } = await createAdminSupabase().from('members').select('theme, chart_prefs').eq('id', auth.identity.memberId).maybeSingle()
  if (error) return portalJson({ error: 'No se pudo leer' }, 500)
  return portalJson({
    theme: data?.theme === 'light' || data?.theme === 'dark' ? data.theme : null,
    letra: lyricPrefsFrom(data?.chart_prefs),   // siempre válida: lo desconocido vuelve al valor por defecto
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const body = await req.json().catch(() => null)

  // Tipografía de la letra: { fontFamily?, textScale? } dentro de { letra: ... }. Se mezcla con lo que ya hay en chart_prefs
  // (modo escenario, interlineado... son de la administración y no se pisan).
  if (body && typeof body === 'object' && 'letra' in body) {
    const patch = parseLyricPrefsPatch((body as { letra: unknown }).letra)
    if (!patch) return portalJson({ error: 'Valor no válido' }, 400)
    const db = createAdminSupabase()
    const { data: cur, error: readErr } = await db.from('members').select('chart_prefs').eq('id', auth.identity.memberId).maybeSingle()
    if (readErr) return portalJson({ error: 'No se pudo guardar' }, 500)
    const next = { ...((cur?.chart_prefs && typeof cur.chart_prefs === 'object') ? cur.chart_prefs : {}), ...patch }
    const { error } = await db.from('members').update({ chart_prefs: next }).eq('id', auth.identity.memberId)
    if (error) return portalJson({ error: 'No se pudo guardar' }, 500)
    return portalJson({ ok: true, letra: lyricPrefsFrom(next) })
  }

  const theme = body?.theme
  if (theme !== 'light' && theme !== 'dark' && theme !== null) return portalJson({ error: 'Valor no válido' }, 400)
  const { error } = await createAdminSupabase().from('members').update({ theme }).eq('id', auth.identity.memberId)
  if (error) return portalJson({ error: 'No se pudo guardar' }, 500)
  return portalJson({ ok: true })
}
