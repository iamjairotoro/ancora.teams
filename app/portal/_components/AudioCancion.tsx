'use client'
/* Tarjeta «Audio» de la pantalla de canción (punto 55): último bloque de LETRA → ADJUNTOS → AUDIO. Reúne el video de YouTube (YouTubeAudio) y los
   archivos de audio propios de la canción. Cada archivo tiene su botón de play: suena en el reproductor flotante (ReproductorFlotante), que
   firma la URL AL DAR PLAY. Si no hay ni video ni archivos, no se dibuja nada. */
import { extraerIdYoutube } from '@/lib/youtube'
import type { AdjuntoPublico } from '@/lib/portal/adjuntos'
import YouTubeAudio from './YouTubeAudio'
import type { EstadoAudio, PistaAudio } from './ReproductorFlotante'
import ui from './audio-cancion.module.css'

const sinExtension = (n: string) => n.replace(/\.[A-Za-z0-9]{1,5}$/, '') || n
const fmtTamano = (b: number | null) => (b === null ? null : b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

export default function AudioCancion({ songId, nombre, enlaceYoutube, audios, audioActivo, onReproducir }: {
  songId: string
  nombre: string
  enlaceYoutube: string | null | undefined
  audios: AdjuntoPublico[]
  audioActivo: EstadoAudio | null
  /** Se llama DENTRO del toque (iOS solo deja iniciar el audio ahí). */
  onReproducir: (p: PistaAudio) => void
}) {
  const hayVideo = !!extraerIdYoutube(enlaceYoutube)
  if (!hayVideo && !audios.length) return null
  return (
    <section className={ui.card} aria-label="Audio">
      <div className={ui.head}>
        <h3 className={ui.title}>Audio</h3>
        <span className={ui.tag}>{hayVideo && audios.length ? 'YOUTUBE · ARCHIVOS' : hayVideo ? 'YOUTUBE' : 'ARCHIVO PROPIO'}</span>
      </div>

      {hayVideo && <YouTubeAudio enlace={enlaceYoutube} nombre={nombre} />}

      {audios.length > 0 && (
        <div className={ui.filas}>
          {audios.map(a => {
            const activo = audioActivo?.idAdjunto === a.id
            const sonando = activo && audioActivo!.sonando
            const titulo = sinExtension(a.nombre)
            return (
              <div key={a.id} className={ui.fila}>
                <button type="button" className={ui.play} aria-pressed={sonando}
                  aria-label={`${sonando ? 'Pausar' : 'Reproducir'} ${titulo}`}
                  onClick={() => onReproducir({ idAdjunto: a.id, songId, titulo, cancion: nombre })}>
                  {sonando
                    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
                    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}
                </button>
                <span className={ui.que}>
                  <b>{titulo}</b>
                  <span>{['Archivo propio', fmtTamano(a.tamano)].filter(Boolean).join(' · ')}</span>
                </span>
                <span className={ui.etq}>{activo ? (sonando ? 'SONANDO' : 'EN PAUSA') : 'ARCHIVO'}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
