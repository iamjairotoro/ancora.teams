'use client'
// El aviso de «no se pudo cargar» con «Reintentar», para las pantallas de /admin que antes mostraban una lista vacía cuando la carga fallaba (el mismo bloque de Home y de Servicio).
import { TEXTOS } from '@/lib/textos/comun'

export default function ErrorDeCarga({ titulo, onReintentar, cuerpo = TEXTOS.revisaConexion, compacto = false }: { titulo: string; onReintentar?: () => void; cuerpo?: string; compacto?: boolean }) {
  return (
    <div role="alert" style={compacto ? { padding: '20px 16px', textAlign: 'center' } : { maxWidth: 420, margin: '64px auto', padding: 28, textAlign: 'center' }}>
      <p style={{ fontSize: '.875rem', fontWeight: 700, marginBottom: 8 }}>{titulo}</p>
      <p className="anc-empty" style={{ marginBottom: compacto ? 12 : 18 }}>{cuerpo}</p>
      <button type="button" onClick={onReintentar} style={{ background: 'var(--anc-accent)', color: 'var(--anc-on-accent)', border: 'none', borderRadius: 'var(--anc-r)', padding: '9px 18px', fontSize: '.8125rem', fontWeight: 600, cursor: 'pointer' }}>
        {TEXTOS.reintentar}
      </button>
    </div>
  )
}
