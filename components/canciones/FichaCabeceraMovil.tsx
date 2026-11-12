'use client'
// La cabecera de la ficha de la canción del ADMINISTRADOR en teléfono (tablero «Canción · Móvil · Detalle»): «‹ Canciones» y «✎ Editar» arriba; debajo, la portada, el título, el artista y las pastillas de tono, bpm y compás.
// Solo dibuja y reenvía: «Editar» y «volver» hacen lo mismo que antes (los pasa la pantalla) y el menú «⋯» (Archivar, Eliminar) llega como hijo, sin cambios. Lo que la canción no tiene (artista, tono, bpm, compás) no se muestra.
// Sin portada se dibuja un cuadro neutro con una nota musical (solo tokens, nada inventado). El escritorio no la usa.
import { ChevronLeft, Music, Pencil } from 'lucide-react'
import type { Song } from '@/lib/types'
import { TEXTOS_CANCIONES_ADMIN as T } from '@/lib/textos/cancionesAdmin'

export default function FichaCabeceraMovil({ cancion, onVolver, onEditar, children }: { cancion: Song; onVolver: () => void; onEditar: () => void; children?: React.ReactNode }) {
  const pastillas = [cancion.tono_original ? T.fichaTono(cancion.tono_original) : '', cancion.bpm ? T.fichaBpm(cancion.bpm) : '', cancion.compas || ''].filter(Boolean)
  return (
    <>
      <div className="anc-fichaCab" data-ficha="cabecera">
        <button type="button" className="anc-fichaCab__volver" onClick={onVolver}><ChevronLeft size={18} aria-hidden="true" />{T.fichaVolver}</button>
        <div className="anc-fichaCab__der">
          <button type="button" className="anc-fichaCab__editar" onClick={onEditar}><Pencil size={16} aria-hidden="true" />{T.fichaEditar}</button>
          {children}
        </div>
      </div>
      <div className="anc-fichaTit" data-ficha="titulo">
        {cancion.caratula_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img className="anc-fichaTit__portada" src={cancion.caratula_url} alt="" />
          : <span className="anc-fichaTit__portada anc-fichaTit__portada--vacia" aria-hidden="true"><Music size={32} /></span>}
        <div className="anc-fichaTit__texto">
          <h1 className="anc-fichaTit__titulo">{cancion.nombre}</h1>
          {cancion.artista && <p className="anc-fichaTit__artista">{cancion.artista}</p>}
        </div>
      </div>
      {pastillas.length > 0 && <ul className="anc-fichaTit__pastillas">{pastillas.map(p => <li key={p}>{p}</li>)}</ul>}
    </>
  )
}
