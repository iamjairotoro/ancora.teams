'use client'
// La foto del Perfil (punto 54, commit 1, rediseño): 60 px, con el botón de cámara encima en la esquina inferior derecha. Sube por /api/portal/avatar (el servidor valida y sube; el navegador no
// escribe Storage ni `members`). El botón tiene nombre accesible y zona táctil de 44 px; un error se dice en pantalla (antes era un alert()). `token` = token de invitación del portal por enlace, o null.
import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { portalFetch } from '@/lib/portal/portalFetch'
import ui from './perfil.module.css'

const MAX = 2 * 1024 * 1024

export default function FotoPerfil({ token, url, nombre, apellido, onFoto, onError }: {
  token: string | null
  url?: string | null
  nombre: string
  apellido?: string | null
  onFoto: (url: string) => void
  onError: (mensaje: string | null) => void
}) {
  const [subiendo, setSubiendo] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)
  const iniciales = `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toLocaleUpperCase('es')

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    if (archivo.size > MAX) { onError('La imagen debe pesar menos de 2 MB.'); return }
    setSubiendo(true); onError(null)
    try {
      const form = new FormData(); form.append('file', archivo)
      const res = await portalFetch(token, '/api/portal/avatar', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.avatar_url) { onError(typeof data.error === 'string' && res.status < 500 ? data.error : 'No se pudo subir la imagen. Intenta de nuevo.'); return }
      onFoto(data.avatar_url)
    } catch { onError('No se pudo subir la imagen. Revisa tu conexión e intenta de nuevo.') }
    finally { setSubiendo(false) }
  }

  return (
    <div className={ui.foto}>
      <span className={ui.fotoImg} aria-hidden="true">
        {url ? <img src={url} alt="" /> : <span className={ui.iniciales}>{iniciales}</span>}
      </span>
      <button type="button" className={ui.camara} aria-label="Cambiar foto de perfil" aria-busy={subiendo} disabled={subiendo} onClick={() => entrada.current?.click()}>
        {subiendo ? <span className={ui.girando} aria-hidden="true" /> : <Camera size={14} aria-hidden="true" />}
      </button>
      <input ref={entrada} type="file" accept="image/png,image/jpeg,image/webp" className={ui.sr} tabIndex={-1} aria-hidden="true" onChange={alElegir} />
    </div>
  )
}
