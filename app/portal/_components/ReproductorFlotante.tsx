'use client'
/* Reproductor flotante del archivo propio (audio mp3 / m4a / aac) del portal (punto 55, paso 5). Vive UNA vez en PortalApp: sigue sonando al
   cambiar de pestaña y se ve en cualquier pantalla, también sobre la letra y el visor de PDF (capa 29, sobre el menú).
   - Contraído: play/pausa, título, tiempo y ✕. Expandido: barra, ±10 s y velocidad 1× → 1,25× → 0,75×.
   - <audio preload="none">: no baja nada hasta dar play. La URL se firma AL DAR PLAY (lib/audioFirma.ts, 60 min) y, si el audio falla a mitad,
     se firma de nuevo UNA vez y se retoma donde iba; si vuelve a fallar enseguida, avisa con «Reintentar».
   - iOS solo deja iniciar un audio dentro del toque, pero aquí hay que esperar la firma: por eso el toque inicia YA una reproducción silenciosa
     del mismo <audio> (lo «desbloquea») y cuando llega la URL se le cambia la fuente y se le da play. Esto SOLO se puede comprobar en un iPhone.
   - Un solo reproductor a la vez (reproductor.ts): al pulsar un video de YouTube el archivo se PAUSA (queda a mano), y al revés.
   - Media Session: título, artista, ±10 s, posición y parar en el bloqueo de pantalla y los auriculares (también solo comprobable en un iPhone). */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { crearFirmadorAudio } from '@/lib/audioFirma'
import { firmarAdjunto } from './firmarAdjunto'
import { liberarReproductor, reclamarReproductor } from './reproductor'
import ui from './reproductor-flotante.module.css'

export interface PistaAudio { idAdjunto: string; songId: string; titulo: string; cancion: string }
export interface EstadoAudio { idAdjunto: string; sonando: boolean }
export interface ReproductorHandle {
  /** Da play a una pista (o alterna play/pausa si ya es la actual). Hay que llamarlo DENTRO del toque, de forma síncrona. */
  reproducir(p: PistaAudio): void
}

export const VELOCIDADES = [1, 1.25, 0.75]
export const SALTO_SEG = 10
// WAV de 0,1 s de silencio: sirve para desbloquear el <audio> dentro del toque (iOS) mientras se espera la URL firmada. Tiene muestras de
// verdad: un WAV vacío nunca termina de cargar y su play() queda pendiente.
const SILENCIO = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='

export const mmss = (s: number) => { const t = Math.max(0, Math.floor(Number.isFinite(s) ? s : 0)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }
const etiquetaVel = (v: number) => `${String(v).replace('.', ',')}×`

const ReproductorFlotante = forwardRef<ReproductorHandle, {
  token: string | null
  /** El menú está escondido (al desplazar la letra o con un chat abierto): el reproductor baja con él. */
  menuOculto: boolean
  /** Hay un chat abierto: el reproductor sube al borde superior para no tapar el campo de escribir. */
  arriba: boolean
  onEstado: (e: EstadoAudio | null) => void
}>(function ReproductorFlotante({ token, menuOculto, arriba, onEstado }, ref) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [pista, setPista] = useState<PistaAudio | null>(null)
  const [sonando, setSonando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [tiempo, setTiempo] = useState(0)
  const [duracion, setDuracion] = useState(0)
  const [velIdx, setVelIdx] = useState(0)
  const [expandido, setExpandido] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pistaRef = useRef<PistaAudio | null>(null)
  const firmador = useRef<ReturnType<typeof crearFirmadorAudio> | null>(null)
  const gen = useRef(0)                       // cada pista nueva o cierre invalida lo que quedaba en vuelo
  const sonandoRef = useRef(false); sonandoRef.current = sonando
  const velRef = useRef(0); velRef.current = velIdx
  const retomar = useRef<{ t: number; reproducir: boolean } | null>(null)
  const tokenRef = useRef(token); tokenRef.current = token
  const estadoRef = useRef(onEstado); estadoRef.current = onEstado

  const esSilencio = () => !!audioRef.current?.currentSrc?.startsWith('data:audio/wav')

  /** Empieza (o reintenta) una pista. SÍNCRONO hasta el primer await: el desbloqueo del <audio> tiene que ocurrir dentro del toque. */
  const iniciar = useCallback((p: PistaAudio) => {
    const a = audioRef.current
    if (!a) return
    const g = ++gen.current
    reclamarReproductor(p.idAdjunto, () => { audioRef.current?.pause() })   // otro reproductor (el video) toma el turno: el archivo se pausa
    firmador.current?.olvidar()
    firmador.current = crearFirmadorAudio({ firmar: () => firmarAdjunto(tokenRef.current, p.songId, p.idAdjunto) })
    pistaRef.current = p; retomar.current = null
    setPista(p); setError(null); setCargando(true); setSonando(false); setTiempo(0); setDuracion(0)
    a.src = SILENCIO
    Promise.resolve(a.play()).catch(() => {})     // desbloquea el <audio> en el toque; NO se espera: lo que importa es lo que sigue
    ;(async () => {
      try {
        const url = await firmador.current!.urlVigente()
        if (g !== gen.current) return
        a.src = url
        a.playbackRate = VELOCIDADES[velRef.current]
        await a.play()
      } catch (e) {
        if (g !== gen.current || (e as { name?: string })?.name === 'AbortError') return
        setCargando(false); setSonando(false)
        setError(e instanceof Error && e.name !== 'NotAllowedError' && !/play/i.test(e.message) ? `${e.message}.` : 'No se pudo reproducir el audio.')
      }
    })()
  }, [])

  const alternar = useCallback(() => {
    const a = audioRef.current
    if (!a || !pistaRef.current) return
    if (a.paused) a.play().catch(() => {}); else a.pause()
  }, [])

  useImperativeHandle(ref, () => ({
    reproducir(p) {
      if (pistaRef.current?.idAdjunto === p.idAdjunto && !error) { alternar(); return }
      iniciar(p)
    },
  }), [alternar, iniciar, error])

  const irA = useCallback((seg: number) => {
    const a = audioRef.current
    if (!a) return
    const max = Number.isFinite(a.duration) ? a.duration : Infinity
    a.currentTime = Math.min(Math.max(0, seg), max)
    setTiempo(a.currentTime)
  }, [])
  const saltar = useCallback((d: number) => { const a = audioRef.current; if (a) irA(a.currentTime + d) }, [irA])

  const cerrar = useCallback(() => {
    const a = audioRef.current
    gen.current++
    if (a) { a.pause(); a.removeAttribute('src'); a.load() }
    if (pistaRef.current) liberarReproductor(pistaRef.current.idAdjunto)
    firmador.current?.olvidar(); firmador.current = null
    pistaRef.current = null; retomar.current = null
    setPista(null); setSonando(false); setCargando(false); setExpandido(false); setError(null); setTiempo(0); setDuracion(0)
  }, [])

  const cambiarVelocidad = () => {
    const n = (velIdx + 1) % VELOCIDADES.length
    setVelIdx(n)
    if (audioRef.current) audioRef.current.playbackRate = VELOCIDADES[n]
  }

  // El audio falló a mitad (firma vencida o red): se firma de nuevo UNA vez y se retoma donde iba.
  const alFallar = useCallback(async () => {
    const a = audioRef.current
    if (!a || !pistaRef.current || esSilencio()) return
    const g = gen.current
    const t = a.currentTime || 0
    const estabaSonando = sonandoRef.current
    setCargando(true)
    const r = await (firmador.current?.trasFallo() ?? Promise.resolve({ accion: 'rendirse' as const }))
    if (g !== gen.current) return
    if (r.accion === 'refirmar') { retomar.current = { t, reproducir: estabaSonando }; a.src = r.url; a.load() }
    else { setCargando(false); setSonando(false); setError('Se cortó el audio y no se pudo retomar.') }
  }, [])

  const alCargarMetadatos = () => {
    const a = audioRef.current
    if (!a || esSilencio()) return
    if (Number.isFinite(a.duration)) setDuracion(a.duration)
    const r = retomar.current
    if (r) { retomar.current = null; if (r.t > 0) a.currentTime = r.t; a.playbackRate = VELOCIDADES[velRef.current]; if (r.reproducir) a.play().catch(() => {}) }
  }

  useEffect(() => { estadoRef.current(pista ? { idAdjunto: pista.idAdjunto, sonando } : null) }, [pista, sonando])
  useEffect(() => () => { const a = audioRef.current; if (a) { a.pause(); a.removeAttribute('src') } if (pistaRef.current) liberarReproductor(pistaRef.current.idAdjunto) }, [])

  // Media Session: bloqueo de pantalla y auriculares.
  useEffect(() => {
    if (!pista || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    try { ms.metadata = new MediaMetadata({ title: pista.titulo, artist: pista.cancion, album: 'Áncora' }) } catch { /* sin soporte */ }
    const accion = (k: MediaSessionAction, f: MediaSessionActionHandler | null) => { try { ms.setActionHandler(k, f) } catch { /* acción no soportada */ } }
    accion('play', () => { audioRef.current?.play().catch(() => {}) })
    accion('pause', () => { audioRef.current?.pause() })
    accion('seekbackward', d => saltar(-(d.seekOffset || SALTO_SEG)))
    accion('seekforward', d => saltar(d.seekOffset || SALTO_SEG))
    accion('seekto', d => { if (typeof d.seekTime === 'number') irA(d.seekTime) })
    accion('stop', () => cerrar())
    return () => { for (const k of ['play', 'pause', 'seekbackward', 'seekforward', 'seekto', 'stop'] as MediaSessionAction[]) accion(k, null); try { ms.metadata = null } catch { /* nada */ } }
  }, [pista, saltar, irA, cerrar])
  useEffect(() => {
    if (!pista || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    try { navigator.mediaSession.playbackState = sonando ? 'playing' : 'paused' } catch { /* nada */ }
  }, [pista, sonando])
  const posicionMediaSession = (a: HTMLAudioElement) => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !Number.isFinite(a.duration) || a.duration <= 0) return
    try { navigator.mediaSession.setPositionState({ duration: a.duration, position: Math.min(a.currentTime, a.duration), playbackRate: a.playbackRate || 1 }) } catch { /* nada */ }
  }

  const pct = duracion > 0 ? Math.min(100, (tiempo / duracion) * 100) : 0
  return (
    <>
      <audio ref={audioRef} preload="none"
        onPlay={() => {
          if (esSilencio()) return
          setSonando(true)
          // Suene como suene (botón, bloqueo de pantalla, auriculares, reanudar tras una pausa): toma el turno, y si había un video de YouTube
          // sonando, ese se detiene. Es idempotente: reclamar el turno que ya se tiene no hace nada.
          if (pistaRef.current) reclamarReproductor(pistaRef.current.idAdjunto, () => { audioRef.current?.pause() })
        }}
        onPause={() => { if (!esSilencio()) setSonando(false) }}
        onPlaying={() => { if (!esSilencio()) setCargando(false) }}
        onWaiting={() => { if (!esSilencio() && pistaRef.current) setCargando(true) }}
        onCanPlay={() => { if (!esSilencio()) setCargando(false) }}
        onEnded={() => { if (!esSilencio()) { setSonando(false); setTiempo(0) } }}
        onTimeUpdate={e => { if (!esSilencio()) { setTiempo(e.currentTarget.currentTime); posicionMediaSession(e.currentTarget) } }}
        onDurationChange={e => { if (!esSilencio() && Number.isFinite(e.currentTarget.duration)) setDuracion(e.currentTarget.duration) }}
        onLoadedMetadata={alCargarMetadatos}
        onError={alFallar} />

      {pista && (
        <section className={`${ui.pl}${menuOculto ? ` ${ui.sinMenu}` : ''}${arriba ? ` ${ui.arriba}` : ''}`}
          role="region" aria-label="Reproductor de audio">
          <div className={ui.fila}>
            <button type="button" className={`${ui.b} ${ui.play}`} onClick={alternar} aria-label={`${sonando ? 'Pausar' : 'Reproducir'} ${pista.titulo}`}>
              {sonando
                ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
                : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}
            </button>
            <button type="button" className={ui.titulo} onClick={() => setExpandido(v => !v)} aria-expanded={expandido} aria-label={`${expandido ? 'Contraer' : 'Expandir'} el reproductor`}>
              <b>{pista.titulo}</b>
              <span>{expandido ? `Archivo propio · ${pista.cancion}` : `${mmss(tiempo)} / ${duracion > 0 ? mmss(duracion) : '--:--'}`}{cargando && <i className={ui.cargando} role="status" aria-label="Cargando" />}</span>
            </button>
            <button type="button" className={ui.b} onClick={() => setExpandido(v => !v)} aria-label={expandido ? 'Contraer el reproductor' : 'Expandir el reproductor'} tabIndex={-1}>{expandido ? '⌄' : '⌃'}</button>
            <button type="button" className={ui.b} onClick={cerrar} aria-label="Cerrar reproductor">✕</button>
          </div>

          {!expandido && <div className={ui.mini} aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>}

          {expandido && (
            <>
              <input type="range" className={ui.rango} min={0} max={Math.max(1, Math.floor(duracion))} step={1} value={Math.min(Math.floor(tiempo), Math.max(1, Math.floor(duracion)))}
                onChange={e => irA(Number(e.target.value))} aria-label="Posición" aria-valuetext={`${mmss(tiempo)} de ${duracion > 0 ? mmss(duracion) : 'duración desconocida'}`} disabled={duracion <= 0} />
              <div className={ui.tiempos}><span>{mmss(tiempo)}</span><span>{duracion > 0 ? mmss(duracion) : '--:--'}</span></div>
              <div className={ui.ctl}>
                <button type="button" className={ui.cbtn} onClick={() => saltar(-SALTO_SEG)} aria-label="Retroceder 10 segundos">−10</button>
                <button type="button" className={ui.cbtn} onClick={() => saltar(SALTO_SEG)} aria-label="Adelantar 10 segundos">+10</button>
                <button type="button" className={ui.cbtn} onClick={cambiarVelocidad} aria-label={`Velocidad ${etiquetaVel(VELOCIDADES[velIdx])}; pulsa para cambiar`}>{etiquetaVel(VELOCIDADES[velIdx])}</button>
              </div>
            </>
          )}

          {error && <p className={ui.error} role="alert">{error}<button type="button" onClick={() => pista && iniciar(pista)}>Reintentar</button></p>}
        </section>
      )}
    </>
  )
})
export default ReproductorFlotante
