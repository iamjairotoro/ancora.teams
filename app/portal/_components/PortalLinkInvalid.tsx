// «Enlace no válido» del portal (punto 48): lo que se ve al abrir una URL antigua
// /portal/member_<id>, que identificaba a la persona solo por su id y ya no abre nada.
// Usa solo tokens --anc-* (pieza nueva); el resto del portal conserva su estilo heredado.
import { MSG_LINK_INVALID } from '@/lib/auth/accessLink'

export default function PortalLinkInvalid() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--anc-bg)', color: 'var(--anc-ink)' }}>
      <div role="alert" style={{ width: '100%', maxWidth: 320, textAlign: 'center', padding: '28px 24px', borderRadius: 'var(--anc-r)', background: 'var(--anc-panel-solid)', boxShadow: 'var(--anc-e1)' }}>
        <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>{MSG_LINK_INVALID}</p>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--anc-ink-3)', lineHeight: 1.45 }}>
          Este enlace ya no sirve. Entra con tu cuenta de Google o pide un enlace nuevo a tu líder.
        </p>
        <a href="/portal" style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 'var(--anc-r-s)', background: 'var(--anc-accent)', color: 'var(--anc-on-accent)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          Ir a mi portal
        </a>
      </div>
    </main>
  )
}
