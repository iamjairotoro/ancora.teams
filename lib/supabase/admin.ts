// Cliente de Supabase con la LLAVE DE SERVICIO (salta RLS). SOLO SERVIDOR:
// `server-only` hace fallar el build si algo con 'use client' (o importado por
// un componente cliente) llega a importar este archivo. Úsalo únicamente en
// app/api/** y en server components. La llave nunca sale del servidor, jamás
// lleva el prefijo NEXT_PUBLIC_ y no se imprime ni se escribe en ningún archivo.
//
// El cliente se crea AL LLAMAR createAdminSupabase(), no al importar el archivo:
// importar este módulo no lee ni exige la llave.
import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createAdminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  // Los mensajes dicen QUÉ falta, nunca un valor.
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL no está definida')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY no está definida')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
