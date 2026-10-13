// Comprobación del enlace de YouTube de una canción (punto 55, commit 2). SOLO owner/admin con sesión; la llama el formulario de
// administración AL GUARDAR. No escribe nada: responde si el video existe y se puede incrustar para que quien administra decida.
// POST { url }  →  { estado: 'ok' | 'no_existe' | 'no_incrustable' | 'no_verificado' | 'no_es_youtube', id?, titulo? }
import { NextRequest, NextResponse } from 'next/server'
import { requireOrgAdmin } from '@/lib/auth/authorize'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'
import { extraerIdYoutube } from '@/lib/youtube'
import { consultarOembed } from '@/lib/youtubeOembed'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE })

export async function POST(req: NextRequest) {
  const auth = await requireOrgAdmin(DEFAULT_ORGANIZATION_ID)
  if (!auth.ok) return auth.response
  const body = await req.json().catch(() => null)
  const id = extraerIdYoutube(body?.url)
  if (!id) return json({ estado: 'no_es_youtube' })           // no se consulta nada fuera de YouTube
  const r = await consultarOembed(id)
  return json({ id, ...r })
}
