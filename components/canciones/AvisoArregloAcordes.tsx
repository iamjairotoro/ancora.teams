'use client'
// Aviso en la ficha de una canción (teléfono, administrador): tiene un arreglo y acordes en el formato antiguo, así que editarla con acordes puede mover secciones. Lee lo mismo que el editor (GET /api/admin/canciones/acordes);
// si no puede leer, no hay arreglo o todo está al día, no muestra nada (nunca un error en la ficha).
import { useEffect, useState } from 'react'
import { avisoDeFicha } from '@/lib/resumenGuardado'
import { TEXTOS_EDITOR as T } from '@/lib/textos/editorAcordes'

export function TextoAvisoArreglo({ entradas }: { entradas: number }) {
  return <p className="anc-aviso-arreglo" role="note" style={{ margin: '0 0 12px', padding: '10px 12px', borderRadius: 12, background: 'var(--anc-sunk)', color: 'var(--anc-ink-2)', fontSize: '.9375rem', lineHeight: 1.45 }}>{T.avisoFicha(entradas)}</p>
}

export default function AvisoArregloAcordes({ songId }: { songId: string }) {
  const [entradas, setEntradas] = useState<number | null>(null)
  useEffect(() => {
    let vivo = true
    setEntradas(null)
    fetch(`/api/admin/canciones/acordes?id=${encodeURIComponent(songId)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (vivo) setEntradas(avisoDeFicha(j?.cancion)) })
      .catch(() => { if (vivo) setEntradas(null) })
    return () => { vivo = false }
  }, [songId])
  return entradas ? <TextoAvisoArreglo entradas={entradas} /> : null
}
