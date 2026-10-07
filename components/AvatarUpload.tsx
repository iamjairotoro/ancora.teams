'use client'
import { useState, useRef } from 'react'
import { portalFetch } from '@/lib/portal/portalFetch'

// Foto del portal: la sube /api/portal/avatar (el servidor valida y sube; el navegador ya no
// escribe Storage ni `members`). `token` = token de invitación del portal por token, o null.
interface Props {
  token: string | null
  currentUrl?: string
  nombre: string
  apellido?: string
  size?: 'sm' | 'lg'
  onUpdate?: (url: string) => void
}

export default function AvatarUpload({ token, currentUrl, nombre, apellido, size = 'sm', onUpdate }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentUrl || '')
  const inputRef = useRef<HTMLInputElement>(null)

  const dim = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('La imagen debe ser menor a 2MB'); return }

    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await portalFetch(token, '/api/portal/avatar', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.avatar_url) { alert(data.error || 'Error subiendo imagen'); return }
      setPreview(data.avatar_url)
      onUpdate?.(data.avatar_url)
    } catch {
      alert('Error subiendo imagen')
    } finally {
      setUploading(false)
    }
  }

  const initials = `${nombre?.[0] || ''}${apellido?.[0] || ''}`

  return (
    <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
      <div className={`${dim} rounded-full overflow-hidden bg-[#1F2A44] flex items-center justify-center flex-shrink-0`}>
        {preview ? (
          <img src={preview} alt={nombre} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white font-bold">{initials}</span>
        )}
      </div>
      <div className={`absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
        {uploading
          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <span className="text-white text-xs">📷</span>
        }
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp"
        className="hidden" onChange={handleFile} />
    </div>
  )
}
