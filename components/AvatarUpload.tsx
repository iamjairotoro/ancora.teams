'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  memberId: string
  currentUrl?: string
  nombre: string
  apellido?: string
  size?: 'sm' | 'lg'
  onUpdate?: (url: string) => void
}

export default function AvatarUpload({ memberId, currentUrl, nombre, apellido, size = 'sm', onUpdate }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentUrl || '')
  const inputRef = useRef<HTMLInputElement>(null)

  const dim = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('La imagen debe ser menor a 2MB'); return }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${memberId}.${ext}`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (error) { alert('Error subiendo imagen'); setUploading(false); return }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = data.publicUrl + '?t=' + Date.now()

    await supabase.from('members').update({ avatar_url: url }).eq('id', memberId)

    setPreview(url)
    onUpdate?.(url)
    setUploading(false)
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
