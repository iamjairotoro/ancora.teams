// Preferencias de la persona: tema (members.theme: 'light' | 'dark' | null = Sistema) y, desde el punto 55, la tipografía de la letra
// («Aa»: fuente y tamaño, dentro de members.chart_prefs, que la administración comparte). Punto 50 (paso 0a): /admin y /home guardan su tema y sus
// preferencias de lectura de la canción (`chart`) también por aquí, con su sesión de Google: ya no se escribe `members` desde el navegador (esa tabla se cierra).
// La ruta solo cambia la fila de QUIEN ESTÁ AUTENTICADO y SOLO estas llaves, con valores validados: nunca nombre, organización ni correo.
import { MSG } from '@/lib/textos/mensajes'
import { NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'
import { chartPrefsAdminFrom, lyricPrefsFrom, parseChartPrefsPatch, parseLyricPrefsPatch } from '@/lib/lyricPrefs'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const { data, error } = await createAdminSupabase().from('members').select('theme, chart_prefs').eq('id', auth.identity.memberId).maybeSingle()
  if (error) return portalJson({ error: MSG.noSePudoLeer }, 500)
  return portalJson({
    theme: data?.theme === 'light' || data?.theme === 'dark' ? data.theme : null,
    letra: lyricPrefsFrom(data?.chart_prefs),   // siempre válida: lo desconocido vuelve al valor por defecto
    chart: chartPrefsAdminFrom(data?.chart_prefs),   // las cuatro preferencias de lectura que guarda la administración
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
    if (!patch) return portalJson({ error: MSG.valorNoValido }, 400)
    const db = createAdminSupabase()
    const { data: cur, error: readErr } = await db.from('members').select('chart_prefs').eq('id', auth.identity.memberId).maybeSingle()
    if (readErr) return portalJson({ error: MSG.noSePudoGuardar }, 500)
    const next = { ...((cur?.chart_prefs && typeof cur.chart_prefs === 'object') ? cur.chart_prefs : {}), ...patch }
    const { error } = await db.from('members').update({ chart_prefs: next }).eq('id', auth.identity.memberId)
    if (error) return portalJson({ error: MSG.noSePudoGuardar }, 500)
    return portalJson({ ok: true, letra: lyricPrefsFrom(next) })
  }

  // Preferencias de lectura de la administración: { chart: { fontFamily?, textScale?, lineHeightWide?, stageMode? } }, mezcladas con lo que ya hay.
  if (body && typeof body === 'object' && 'chart' in body) {
    const patch = parseChartPrefsPatch((body as { chart: unknown }).chart)
    if (!patch) return portalJson({ error: MSG.valorNoValido }, 400)
    const db = createAdminSupabase()
    const { data: cur, error: readErr } = await db.from('members').select('chart_prefs').eq('id', auth.identity.memberId).maybeSingle()
    if (readErr) return portalJson({ error: MSG.noSePudoGuardar }, 500)
    const next = { ...((cur?.chart_prefs && typeof cur.chart_prefs === 'object') ? cur.chart_prefs : {}), ...patch }
    const { error } = await db.from('members').update({ chart_prefs: next }).eq('id', auth.identity.memberId)
    if (error) return portalJson({ error: MSG.noSePudoGuardar }, 500)
    return portalJson({ ok: true, chart: chartPrefsAdminFrom(next) })
  }

  const theme = body?.theme
  if (theme !== 'light' && theme !== 'dark' && theme !== null) return portalJson({ error: MSG.valorNoValido }, 400)
  const { error } = await createAdminSupabase().from('members').update({ theme }).eq('id', auth.identity.memberId)
  if (error) return portalJson({ error: MSG.noSePudoGuardar }, 500)
  return portalJson({ ok: true })
}
