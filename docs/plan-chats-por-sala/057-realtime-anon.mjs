// Prueba de tiempo real con la LLAVE PÚBLICA: un cliente anónimo se suscribe a los cambios de `messages` y `team_messages` y el servidor (llave de servicio) provoca un cambio de cada una.
// Si el cliente anónimo recibe algo, hay datos de chat llegando a quien no debería. Uso (Node 18+, desde la carpeta del repo, para que encuentre @supabase/supabase-js):
//   SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… node docs/plan-chats-por-sala/057-realtime-anon.mjs
// Qué toca en la base: (1) un UPDATE SIN CAMBIOS de un mensaje viejo (no avisa por push: el disparador es AFTER INSERT; confírmalo en el diagnóstico 057-0) y (2) inserta y borra un mensaje de equipo de prueba (team_messages no tiene disparadores de aviso).
// Úsala primero en la base de PRUEBA. Nunca imprime las llaves.
import { createClient } from '@supabase/supabase-js'
const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: svc } = process.env
if (!url || !anon || !svc) { console.error('Faltan SUPABASE_URL, SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY'); process.exit(2) }
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
