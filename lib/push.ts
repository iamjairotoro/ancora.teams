import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

let configured = false
let vapidReady = false
let vapidError = ''
function ensureConfigured() {
  if (configured) return
  configured = true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    vapidError = `Faltan las keys — publicKey:${publicKey?'presente('+publicKey.length+' chars)':'AUSENTE'} privateKey:${privateKey?'presente('+privateKey.length+' chars)':'AUSENTE'}`
    console.error('VAPID keys no configuradas:', vapidError)
    return
  }
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:soporte@ancora.cl',
      publicKey,
      privateKey
    )
    vapidReady = true
  } catch (e: any) {
    vapidError = e?.message || String(e)
    console.error('Error configurando VAPID:', vapidError)
  }
}

export function isVapidReady() {
  ensureConfigured()
  return vapidReady
}

export function getVapidError() {
  ensureConfigured()
  return vapidError
}

// Manda una notificación push a un miembro (a todos sus dispositivos suscritos).
// Si no tiene ninguna suscripción activa, simplemente no hace nada (no falla).
// Devuelve cuántas suscripciones había y a cuántas se les entregó realmente.
export async function sendPushToMember(memberId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
  ensureConfigured()
  if (!vapidReady) return { subs: 0, delivered: 0 }
  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('member_id', memberId)
  if (!subs?.length) return { subs: 0, delivered: 0 }

  let delivered = 0
  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
      delivered++
    } catch (err: any) {
      console.error(`Push failed for member ${memberId} sub ${sub.id}: statusCode=${err.statusCode} ${err.body || err.message || err}`)
      // Suscripción vencida o inválida (410/404) — la limpiamos para no seguir intentando
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }))
  return { subs: subs.length, delivered }
}

export async function sendPushToMembers(memberIds: string[], payload: { title: string; body: string; url?: string; tag?: string }) {
  const results = await Promise.all(memberIds.map(id => sendPushToMember(id, payload)))
  return {
    totalSubs: results.reduce((a, r) => a + r.subs, 0),
    totalDelivered: results.reduce((a, r) => a + r.delivered, 0),
    membersWithNoSub: results.filter(r => r.subs === 0).length,
  }
}
