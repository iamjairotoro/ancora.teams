'use client'
/* Audio de YouTube de la pantalla de canción (punto 55, commit 2).
   - Del enlace guardado (songs.link_spotify) SOLO se extrae el id de 11 caracteres; la URL del reproductor (youtube-nocookie), la
     miniatura y el «Abrir en YouTube» se arman aquí con ese id (lib/youtube.ts). Nunca se incrusta lo pegado.
   - El reproductor (iframe) NO existe hasta pulsar la miniatura; antes solo hay una imagen de i.ytimg.com, sin scripts de YouTube.
   - Suena UNO a la vez (reproductor.ts) y se DESTRUYE al salir de la canción (el iframe se desmonta), sin aviso.
   - Un enlace que no es de YouTube no se muestra (los datos se conservan). «Abrir en YouTube» es el respaldo si el video no se
     puede incrustar o no arranca. No hay mini-reproductor: YouTube exige que el video se vea. */
import { useEffect, useId, useState } from 'react'
import { extraerIdYoutube, urlAbrirEnYoutube, urlEmbebida, urlMiniatura } from '@/lib/youtube'
import { liberarReproductor, reclamarReproductor } from './reproductor'
import ui from './youtube-audio.module.css'

export default function YouTubeAudio({ enlace, nombre }: {
  enlace: string | null | undefined
  nombre: string
}) {
  const id = extraerIdYoutube(enlace)
  const turno = useId()
  const [sonando, setSonando] = useState(false)
  const [sinMiniatura, setSinMiniatura] = useState(false)

  // Al salir de la canción (o de la pestaña) el iframe se destruye con este componente (se detiene el video) y se suelta el turno.
  useEffect(() => () => { liberarReproductor(turno) }, [turno])

  // Cambió el video de esta pantalla: el anterior deja de existir.
  useEffect(() => { setSonando(false); setSinMiniatura(false) }, [id])

  if (!id) return null

  function reproducir() {
    reclamarReproductor(turno, () => setSonando(false))   // si sonaba otro (el archivo propio), se detiene
    setSonando(true)
  }
  function detener() { setSonando(false); liberarReproductor(turno) }

  return (
    <div className={ui.bloque}>
      <div className={ui.stage}>
        {sonando ? (
          <iframe className={ui.frame} src={urlEmbebida(id)} title={`Video de YouTube: ${nombre}`}
            allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ) : (
          <button type="button" className={ui.poster} onClick={reproducir} aria-label={`Reproducir el video de ${nombre}`}>
            {!sinMiniatura && <img src={urlMiniatura(id)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setSinMiniatura(true)} />}
            <span className={ui.play} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></span>
          </button>
        )}
      </div>

      <div className={ui.row}>
        <div className={ui.what}><b>Video de YouTube</b><span>{nombre}</span></div>
        {sonando && <button type="button" className={ui.btn} onClick={detener}>Detener</button>}
        <a className={ui.btn} href={urlAbrirEnYoutube(id)} target="_blank" rel="noopener noreferrer">Abrir en YouTube</a>
      </div>
      <p className={ui.note}>El video tiene que verse y se detiene al salir de la canción. Si no arranca aquí, ábrelo en YouTube.</p>
    </div>
  )
}
