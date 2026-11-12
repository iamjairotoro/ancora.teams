'use client'
// El aviso de «Borrador» de la ficha del administrador en teléfono (tablero «Ficha admin · Borrador y estado vacío»): ícono de aviso, «Borrador», «Los músicos aún no la ven.» y, para quien administra, «Publicar».
// Solo dibuja: «Publicar» hace lo de siempre (publicarBorrador: solo cambia `publicada`) y su error sale debajo. El escritorio conserva su aviso de siempre.
import { TEXTOS_NUEVA } from '@/lib/nuevaCancion'
import { TEXTOS_CANCIONES_ADMIN as T } from '@/lib/textos/cancionesAdmin'

export default function FichaBorrador({ onPublicar, publicando, error }: { onPublicar?: () => void; publicando: boolean; error: string | null }) {
  return (
    <div className="anc-fichaBorr" role="status" data-ficha="borrador">
      <svg className="anc-fichaBorr__icono" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>
      <div className="anc-fichaBorr__texto"><b>{TEXTOS_NUEVA.borrador}</b><span>{T.fichaBorradorAyuda}</span></div>
      {onPublicar && <button type="button" className="anc-fichaBorr__publicar" onClick={onPublicar} disabled={publicando}>{publicando ? TEXTOS_NUEVA.publicando : TEXTOS_NUEVA.publicar}</button>}
      {error && <p className="anc-fichaBorr__error" role="alert">{error}</p>}
    </div>
  )
}
