import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data } = await supabase
    .from('services')
    .select('id,fecha,titulo,tipo,hora_inicio,hora_fin,lugar')
    .order('fecha', { ascending: true })
  return NextResponse.json({ services: data || [] })
}
