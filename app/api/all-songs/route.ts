import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const { data } = await supabase
    .from('songs')
    .select('*')
    .order('nombre')
  return NextResponse.json({ songs: data || [] }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  })
}
