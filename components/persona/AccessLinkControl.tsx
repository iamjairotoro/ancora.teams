'use client'
/* «Generar enlace de acceso» (punto 48): una pieza DELGADA dentro de «En la app» de
   la ficha (solo owner/admin; PersonDetail la monta con canEdit). Toda la lógica y los
   permisos viven en /api/admin/member-access-link; acá solo se llama y se muestra.
   Retirarla es borrar este archivo y su línea en PersonDetail.

   El enlace completo se muestra UNA vez, solo en memoria de este componente: no se
   guarda en ningún almacenamiento ni en la URL, y desaparece al cerrarlo, al cambiar
   de persona o al salir. Si se pierde, se genera otro (el anterior deja de valer). */
import { useCallback, useEffect, useRef, useState } from 'react'
import { ACCESS_LINK_DAYS_OPTIONS, ACCESS_LINK_DEFAULT_DAYS, type AccessLinkDays } from '@/lib/auth/accessLink'
import { relativeSince } from '@/lib/relativeTime'
import styles from './access-link.module.css'

type Status =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'active' | 'expired'; createdAt: string; expiresAt: string; lastUsedAt: string | null }
  | { kind: 'error' }

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
const ENDPOINT = '/api/admin/member-access-link'

export default function AccessLinkControl({ personId }: { personId: string }) {
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [days, setDays] = useState<AccessLinkDays>(ACCESS_LINK_DEFAULT_DAYS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null) // solo en memoria
  const [copied, setCopied] = useState(false)
  const fieldRef = useRef<HTMLInputElement>(null)
  const seq = useRef(0)

  const loadStatus = useCallback(async () => {
    const mine = ++seq.current
    try {
      const res = await fetch(`${ENDPOINT}?memberId=${encodeURIComponent(personId)}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (mine !== seq.current) return
      if (!res.ok) { setStatus({ kind: 'error' }); return }
      setStatus(data.status === 'none' ? { kind: 'none' } : { kind: data.status, createdAt: data.createdAt, expiresAt: data.expiresAt, lastUsedAt: data.lastUsedAt })
    } catch { if (mine === seq.current) setStatus({ kind: 'error' }) }
  }, [personId])

  useEffect(() => { void loadStatus(); return () => { seq.current++ } }, [loadStatus])

  async function call(method: 'POST' | 'DELETE', body: object) {
    const res = await fetch(ENDPOINT, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, data }
  }

  async function generate() {
    if (busy) return
    if ((status.kind === 'active' || status.kind === 'expired')
      && !confirm('Generar uno nuevo desactiva el enlace actual: dejará de abrir el portal. ¿Continuar?')) return
    setBusy(true); setError(null); setCopied(false)
    try {
      const { ok, data } = await call('POST', { memberId: personId, days })
      if (!ok) { setError(data?.error || 'No se pudo generar el enlace.'); return }
      setLink({ url: data.url, expiresAt: data.expiresAt })
      await loadStatus()
    } catch { setError('No se pudo generar el enlace. Revisa tu conexión.') }
    finally { setBusy(false) }
  }

  async function revoke() {
    if (busy || !confirm('¿Revocar el enlace? Esta persona dejará de poder abrir el portal con él, de inmediato.')) return
    setBusy(true); setError(null); setLink(null)
    try {
      const { ok, data } = await call('DELETE', { memberId: personId })
      if (!ok) setError(data?.error || 'No se pudo revocar el enlace.')
      else await loadStatus()
    } catch { setError('No se pudo revocar el enlace. Revisa tu conexión.') }
    finally { setBusy(false) }
  }

  async function copy() {
    if (!link) return
    try { await navigator.clipboard.writeText(link.url); setCopied(true) }
    catch { fieldRef.current?.select(); setCopied(document.execCommand?.('copy') ?? false) }
  }

  const hasLink = status.kind === 'active' || status.kind === 'expired'

  return (
    <div className={styles.box}>
      <p className={styles.title}>Enlace de acceso</p>
      <p className={styles.state}>
        {status.kind === 'loading' && 'Cargando…'}
        {status.kind === 'error' && 'No se pudo leer el estado del enlace.'}
        {status.kind === 'none' && 'Sin enlace de acceso.'}
        {status.kind === 'active' && `Activo desde ${fecha(status.createdAt)} · vence ${fecha(status.expiresAt)} · último uso: ${status.lastUsedAt ? relativeSince(status.lastUsedAt) : 'nunca'}.`}
        {status.kind === 'expired' && `Venció el ${fecha(status.expiresAt)}. Genera uno nuevo.`}
      </p>

      {link && (
        <div className={styles.shown} role="group" aria-label="Enlace generado">
          <p><b>Se muestra una sola vez.</b> Cópialo ahora y envíaselo a la persona: al cerrar esto no se podrá volver a ver (si se pierde, genera otro; el anterior deja de funcionar). Vence el {fecha(link.expiresAt)}.</p>
          <input ref={fieldRef} className={styles.field} readOnly value={link.url} aria-label="Enlace de acceso"
            autoComplete="off" spellCheck={false} onFocus={e => e.currentTarget.select()} />
          <div className={styles.row}>
            <button type="button" className={styles.btn} onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar'}</button>
            <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => { setLink(null); setCopied(false) }}>Cerrar</button>
          </div>
        </div>
      )}

      <div className={styles.row}>
        <label className="sr-only" htmlFor={`al-days-${personId}`}>Vence en</label>
        <select id={`al-days-${personId}`} className={styles.sel} value={days} disabled={busy}
          onChange={e => setDays(Number(e.target.value) as AccessLinkDays)}>
          {ACCESS_LINK_DAYS_OPTIONS.map(d => <option key={d} value={d}>{d} días</option>)}
        </select>
        <button type="button" className={styles.btn} disabled={busy || status.kind === 'loading'} onClick={generate}>
          {busy ? 'Un momento…' : hasLink ? 'Regenerar enlace' : 'Generar enlace de acceso'}
        </button>
        {status.kind === 'active' && (
          <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} disabled={busy} onClick={revoke}>Revocar</button>
        )}
      </div>

      {error && <p className={styles.err} role="alert">{error}</p>}
    </div>
  )
}
