'use client'
// Lo que la ficha de administradora necesita para dibujar la hoja con acordes: UNA lectura de GET /api/admin/canciones/acordes (la misma ruta del editor, solo owner y admin). Devuelve `cancion` (para el aviso del arreglo) y `hojaFicha`
// (la hoja, que ve el músico, y sus avisos). Si no está activa, falla o la canción no tiene hoja, `hojaFicha` queda en null y la ficha muestra la letra de siempre. Solo lee.
import { useEffect, useState } from 'react'
import type { HojaFicha } from '@/lib/admin/hojaFicha'

// `listo`: ya hay respuesta (con hoja, sin hoja o fallida) o la lectura no está activa. Mientras es false, la ficha del teléfono dibuja un esqueleto en lugar de la hoja de letra (que enseguida se cambiaría por la de acordes).
export interface DatosFicha { cancion: unknown | null; hojaFicha: HojaFicha | null; listo: boolean }
const VACIO: DatosFicha = { cancion: null, hojaFicha: null, listo: true }
const ESPERANDO: DatosFicha = { cancion: null, hojaFicha: null, listo: false }

export function useFichaAcordes(songId: string | null, activa: boolean): DatosFicha {
  const [datos, setDatos] = useState<{ id: string; d: DatosFicha } | null>(null)
  useEffect(() => {
    if (!activa || !songId) return
    let vivo = true
    fetch(`/api/admin/canciones/acordes?id=${encodeURIComponent(songId)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (vivo) setDatos({ id: songId, d: { cancion: j?.cancion ?? null, hojaFicha: j?.hojaFicha ?? null, listo: true } }) })
      .catch(() => { if (vivo) setDatos({ id: songId, d: VACIO }) })
    return () => { vivo = false }
  }, [songId, activa])
  if (!activa || !songId) return VACIO
  return datos?.id === songId ? datos.d : ESPERANDO         // una respuesta de otra canción nunca se pinta en esta
}
