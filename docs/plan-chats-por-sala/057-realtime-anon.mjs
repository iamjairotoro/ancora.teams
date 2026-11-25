// EN PAUSA desde 2026-11-25: no ejecutar.
// Prueba de tiempo real con la LLAVE PÚBLICA: un cliente anónimo se suscribe a los cambios de `messages` y `team_messages` y el servidor (llave de servicio) provoca un cambio de cada una.
// Si el cliente anónimo recibe algo, hay datos de chat llegando a quien no debería. Uso (Node 18+, desde la carpeta del repo, para que encuentre @supabase/supabase-js):
//   node docs/plan-chats-por-sala/057-realtime-anon.mjs        (lee NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY de .env.local; también valen SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY del entorno)
// Qué toca en la base: (1) un UPDATE SIN CAMBIOS de un mensaje viejo (no avisa por push: el disparador es AFTER INSERT; confírmalo en el diagnóstico 057-0) y (2) inserta y borra un mensaje de equipo de prueba (team_messages no tiene disparadores de aviso).
// HAY UNA SOLA BASE (compartida entre dev y main): esta prueba toca la base real durante unos segundos. Antes de correrla, revisa en el diagnóstico 057-0 (sección «5 disparador») que `messages` no tenga disparadores de UPDATE. Nunca imprime las llaves.
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
if (existsSync('.env.local')) for (const linea of readFileSync('.env.local', 'utf8').split('\n')) { const m = linea.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, svc = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !anon || !svc) { console.error('Faltan la URL, la llave pública o la llave de servicio de Supabase (revisa .env.local)'); process.exit(2) }
const publico = createClient(url, anon, { auth: { persistSession: false } }), servidor = createClient(url, svc, { auth: { persistSession: false } })
const esperar = ms => new Promise(r => setTimeout(r, ms)), recibidos = []
const canal = publico.channel('prueba-llave-publica')
for (const tabla of ['messages', 'team_messages']) canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, p => recibidos.push(`${tabla}:${p.eventType}`))
await new Promise((ok, mal) => { const t = setTimeout(() => mal(new Error('no se pudo suscribir')), 15000); canal.subscribe(s => { if (s === 'SUBSCRIBED') { clearTimeout(t); ok() } }) })
const { data: viejo } = await servidor.from('messages').select('id, content').order('created_at', { ascending: true }).limit(1).maybeSingle()
if (viejo) await servidor.from('messages').update({ content: viejo.content }).eq('id', viejo.id)
const { data: tm } = await servidor.from('team_members').select('team_id, member_id').limit(1).maybeSingle()
if (tm) { const { data: fila } = await servidor.from('team_messages').insert({ team_id: tm.team_id, member_id: tm.member_id, content: 'prueba de tiempo real (se borra)' }).select('id').single(); if (fila) await servidor.from('team_messages').delete().eq('id', fila.id) }
await esperar(6000); await publico.removeChannel(canal)
console.log(recibidos.length ? `FALLA: la llave pública recibió ${recibidos.length} evento(s): ${recibidos.join(', ')}` : 'OK: la llave pública no recibió nada')
process.exit(recibidos.length ? 1 : 0)
