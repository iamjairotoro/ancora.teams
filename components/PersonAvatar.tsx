'use client'
/* Avatar de una persona: su foto (avatar_url) y, si no hay o no carga, las
   iniciales. Decorativo (el nombre va al lado), por eso sin texto alternativo. */
import { useEffect, useState } from 'react'

export default function PersonAvatar({ url, initials, className }: { url?: string | null; initials: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [url])
  return (
    <span className={className} aria-hidden>
      {url && !failed
        ? <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials}
    </span>
  )
}
